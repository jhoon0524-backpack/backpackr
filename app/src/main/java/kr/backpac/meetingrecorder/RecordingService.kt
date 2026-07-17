package kr.backpac.meetingrecorder

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.media.MediaRecorder
import android.os.Build
import android.os.IBinder
import android.widget.Toast
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kr.backpac.meetingrecorder.api.MinutesClient
import kr.backpac.meetingrecorder.api.TranscriptionClient
import java.io.File
import java.util.concurrent.atomic.AtomicReference

/**
 * 녹음 → 전사 → 회의록 생성까지 한 번에 처리하는 포그라운드 서비스.
 *
 * ACTION_TOGGLE: 녹음 중이면 정지 후 회의록 생성 파이프라인 실행, 아니면 녹음 시작.
 * ACTION_STOP: 녹음 정지 (알림의 정지 버튼).
 * ACTION_PROCESS: 기존 기록에 대해 파이프라인 재실행 (재시도/재생성).
 *
 * 스레드 규칙: `active`와 `isProcessing`은 메인 스레드에서만 읽고 쓴다.
 * 파이프라인 본문은 IO에서 돌고, 종료 정리는 다시 메인으로 돌아와 수행한다.
 *
 * startForegroundService()로 시작되는 모든 경로는 반드시 startForeground를
 * 한 번 호출해야 한다 (아니면 시스템이 앱을 강제 종료함). 각 분기가 이를 지킨다.
 */
class RecordingService : Service() {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private data class ActiveRecording(val recorder: MediaRecorder, val file: File)

    // 메인 스레드 전용
    private var active: ActiveRecording? = null
    private var isProcessing = false

    // 정지 대기 중인 레코더. 파이프라인과 onDestroy 중 한 쪽만 finalize하도록
    // 원자적으로 소유권을 가져간다 (서비스 강제 종료 시 파일 유실 방지).
    private val pendingStop = AtomicReference<ActiveRecording?>(null)

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_TOGGLE -> when {
                active != null -> stopAndProcess()
                isProcessing -> rejectBusy()
                else -> startRecording()
            }
            // 알림 버튼은 PendingIntent.getService(일반 startService) 경유라 startForeground 의무가 없다.
            ACTION_STOP -> if (active != null) stopAndProcess()
            ACTION_PROCESS -> handleProcessRequest(intent.getStringExtra(EXTRA_BASE_NAME))
        }
        return START_NOT_STICKY
    }

    /** startForegroundService 계약을 이행하면서 토글/재처리 요청을 거절한다. */
    private fun rejectBusy() {
        if (active != null) {
            startAsForeground(
                getString(R.string.notification_recording),
                ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE,
                showStopAction = true,
            )
            Toast.makeText(this, R.string.toast_busy_recording, Toast.LENGTH_SHORT).show()
        } else {
            startAsForeground(
                getString(R.string.notification_processing),
                ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC,
                showStopAction = false,
            )
            Toast.makeText(this, R.string.toast_busy_processing, Toast.LENGTH_SHORT).show()
        }
    }

    private fun handleProcessRequest(baseName: String?) {
        when {
            active != null || isProcessing -> rejectBusy()
            baseName == null -> {
                // 잘못된 호출이라도 계약은 이행한 뒤 서비스를 내린다.
                startAsForeground(
                    getString(R.string.notification_processing),
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC,
                    showStopAction = false,
                )
                stopForegroundAndSelf()
            }
            else -> {
                startAsForeground(
                    getString(R.string.notification_processing),
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC,
                    showStopAction = false,
                )
                RecorderState.update(
                    RecorderPhase.Processing(getString(R.string.notification_processing)),
                )
                launchPipeline { process(baseName) }
            }
        }
    }

    private fun startRecording() {
        // 실패 경로에서도 startForegroundService 계약이 이행되도록 가장 먼저 포그라운드로 올린다.
        startAsForeground(
            getString(R.string.notification_recording),
            ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE,
            showStopAction = true,
        )

        val file = MeetingStore(this).newRecordingFile()
        val recorder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            MediaRecorder(this)
        } else {
            @Suppress("DEPRECATION")
            MediaRecorder()
        }

        try {
            recorder.apply {
                setAudioSource(MediaRecorder.AudioSource.MIC)
                setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                setAudioSamplingRate(44100)
                setAudioEncodingBitRate(128_000)
                setOutputFile(file.absolutePath)
                prepare()
                start()
            }
        } catch (e: Exception) {
            recorder.release()
            file.delete()
            val reason = e.message ?: getString(R.string.error_unknown)
            RecorderState.update(
                RecorderPhase.Error(getString(R.string.error_start_recording, reason)),
            )
            Toast.makeText(this, R.string.notification_start_failed, Toast.LENGTH_LONG).show()
            // 화면을 보지 않고 쓰는 앱이므로 실패도 알림으로 남긴다.
            notifyDone(getString(R.string.notification_start_failed), reason)
            stopForegroundAndSelf()
            return
        }

        active = ActiveRecording(recorder, file)
        RecorderState.update(RecorderPhase.Recording(System.currentTimeMillis()))
        Toast.makeText(this, R.string.toast_recording_started, Toast.LENGTH_SHORT).show()
    }

    private fun stopAndProcess() {
        val current = active ?: return
        active = null
        pendingStop.set(current)

        // startForegroundService 계약 이행. 마이크 사용이 실제로 끝나는
        // stop() 완료 전까지는 MICROPHONE 타입을 유지한다 (녹음 꼬리 유실 방지).
        startAsForeground(
            getString(R.string.step_finalizing),
            ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE,
            showStopAction = false,
        )
        RecorderState.update(RecorderPhase.Processing(getString(R.string.step_finalizing)))
        Toast.makeText(this, R.string.toast_recording_stopped, Toast.LENGTH_SHORT).show()

        launchPipeline {
            // 긴 녹음의 stop()은 파일 마무리에 시간이 걸리므로 메인 스레드 밖에서,
            // 그리고 도중에 취소돼도 반드시 완료되도록(NonCancellable) 실행한다.
            val rec = pendingStop.getAndSet(null) ?: return@launchPipeline
            val stopped = withContext(NonCancellable) {
                try {
                    rec.recorder.stop()
                    true
                } catch (e: Exception) {
                    // 너무 짧은 녹음 등으로 stop이 실패하면 파일을 버린다.
                    rec.file.delete()
                    false
                } finally {
                    rec.recorder.release()
                }
            }

            // 마이크 사용이 끝났으니 네트워크 단계는 DATA_SYNC 타입으로 전환한다.
            startAsForeground(
                getString(R.string.notification_processing),
                ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC,
                showStopAction = false,
            )

            when {
                !stopped -> {
                    val message = getString(R.string.error_too_short)
                    RecorderState.update(RecorderPhase.Error(message))
                    notifyDone(getString(R.string.notification_failed), message)
                }
                !rec.file.exists() -> {
                    val message = getString(R.string.error_file_missing)
                    RecorderState.update(RecorderPhase.Error(message))
                    notifyDone(getString(R.string.notification_failed), message)
                }
                else -> process(MeetingStore(this@RecordingService).baseNameOf(rec.file))
            }
        }
    }

    /**
     * 파이프라인을 IO에서 실행하고, 종료 정리는 메인 스레드로 돌아와 수행한다.
     * (`active`/`isProcessing`을 onStartCommand와 같은 스레드에서만 만져 경쟁을 없앤다.)
     */
    private fun launchPipeline(block: suspend () -> Unit) {
        isProcessing = true
        scope.launch {
            try {
                block()
            } finally {
                withContext(NonCancellable + Dispatchers.Main) {
                    isProcessing = false
                    // 처리 중에 새 녹음이 시작되지 않았을 때만 서비스를 내린다.
                    if (active == null) stopForegroundAndSelf()
                }
            }
        }
    }

    /**
     * 전사 → 회의록 생성 → 파일 저장.
     * 이미 저장된 전사문이 있으면 그 단계는 건너뛰므로, 실패한 기록의 재시도와
     * (전사문만 있는 기록의) 회의록 재생성에도 그대로 쓰인다.
     * API 키가 없으면 가능한 단계까지만 수행한다.
     */
    private fun process(baseName: String) {
        val settings = AppSettings(this)
        val store = MeetingStore(this)
        val audioFile = store.audioFileFor(baseName).takeIf { it.exists() }
        val createdAt = store.createdAtFromName(baseName)
            ?: audioFile?.lastModified()
            ?: System.currentTimeMillis()
        val dateTime = MeetingStore.formatDateTime(createdAt)

        try {
            val transcriptFile = store.transcriptFileFor(baseName)
            var transcript =
                transcriptFile.takeIf { it.exists() }?.readText()?.trim().orEmpty()

            if (transcript.isBlank()) {
                if (audioFile == null) {
                    val message = getString(R.string.error_no_audio_for_retry)
                    RecorderState.update(RecorderPhase.Error(message))
                    notifyDone(getString(R.string.notification_failed), message)
                    return
                }
                if (settings.sttApiKey.isBlank()) {
                    RecorderState.update(RecorderPhase.Done(audioFile.name))
                    notifyDone(
                        getString(R.string.notification_saved_audio_only),
                        getString(R.string.notification_need_stt_key),
                    )
                    return
                }

                transcript = transcribe(audioFile, settings)
                if (transcript.isBlank()) {
                    // 빈 결과는 파일로 남기지 않는다 (목록에 '전사만 완료'로 오표시되는 것 방지).
                    val message = getString(R.string.error_empty_transcript)
                    RecorderState.update(RecorderPhase.Error(message))
                    notifyDone(getString(R.string.notification_saved_audio_only), message)
                    return
                }
                transcriptFile.writeTextAtomic(transcript)
            }

            val minutesFile = store.minutesFileFor(baseName)
            if (settings.anthropicApiKey.isBlank()) {
                // 키가 없으면 간이 회의록. 단, 기존 완성본을 다운그레이드하지 않는다.
                if (!minutesFile.exists()) {
                    minutesFile.writeTextAtomic(fallbackMinutes(dateTime, transcript))
                }
                RecorderState.update(RecorderPhase.Done(minutesFile.name))
                notifyDone(
                    getString(R.string.notification_transcript_done),
                    getString(R.string.notification_need_anthropic_key),
                )
                return
            }

            setStep(getString(R.string.step_generating_minutes))
            val minutes = MinutesClient(
                apiKey = settings.anthropicApiKey,
                model = settings.anthropicModel,
            ).generateMinutes(transcript, dateTime)

            minutesFile.writeTextAtomic(
                buildString {
                    appendLine(minutes)
                    appendLine()
                    appendLine("---")
                    appendLine()
                    appendLine("## 전체 전사")
                    appendLine()
                    appendLine(transcript)
                },
            )

            RecorderState.update(RecorderPhase.Done(minutesFile.name))
            notifyDone(getString(R.string.notification_minutes_done), minutesFile.name)
        } catch (e: Exception) {
            val message = e.message ?: getString(R.string.error_unknown)
            RecorderState.update(RecorderPhase.Error(message))
            notifyDone(getString(R.string.notification_failed), message)
        }
    }

    /**
     * 업로드 한도를 넘는 긴 녹음은 10분 단위 청크로 분할해 순서대로 전사하고
     * 결과를 이어붙인다. 청크별 전사 결과는 사이드카(.txt)로 보존해,
     * 중간 실패 후 재시도 시 성공한 조각을 다시 업로드하지 않는다.
     */
    private fun transcribe(audioFile: File, settings: AppSettings): String {
        setStep(getString(R.string.step_splitting))
        val workDir = File(cacheDir, "chunks")
        val chunks = AudioChunker.splitIfNeeded(audioFile, workDir)
        val multi = chunks.size > 1
        val client = TranscriptionClient(
            baseUrl = settings.sttBaseUrl,
            apiKey = settings.sttApiKey,
            model = settings.sttModel,
        )

        try {
            val parts = mutableListOf<String>()
            chunks.forEachIndexed { index, chunk ->
                setStep(
                    if (multi) {
                        getString(R.string.step_transcribing_progress, index + 1, chunks.size)
                    } else {
                        getString(R.string.step_transcribing)
                    },
                )
                val sidecar = File(workDir, "${audioFile.nameWithoutExtension}.part$index.txt")
                val cached = if (multi) sidecar.takeIf { it.exists() }?.readText() else null
                val text = cached ?: client.transcribe(chunk).trim()
                if (multi && cached == null) sidecar.writeTextAtomic(text)
                // 전사가 끝난 청크는 즉시 지워 디스크 사용을 줄인다.
                if (chunk != audioFile) chunk.delete()
                parts += text
            }
            if (multi) deleteSidecars(workDir, audioFile)
            return parts.filter { it.isNotBlank() }.joinToString("\n\n").trim()
        } finally {
            AudioChunker.cleanup(audioFile, chunks)
        }
    }

    private fun deleteSidecars(workDir: File, audioFile: File) {
        workDir.listFiles { f ->
            f.name.startsWith(audioFile.nameWithoutExtension + ".part") && f.extension == "txt"
        }?.forEach { it.delete() }
    }

    private fun fallbackMinutes(dateTime: String, transcript: String): String = buildString {
        appendLine("# 회의록")
        appendLine()
        appendLine("- **일시**: $dateTime")
        appendLine()
        appendLine("## 전체 전사")
        appendLine()
        appendLine(transcript)
    }

    // ---------- 알림 ----------

    private fun setStep(step: String) {
        RecorderState.update(RecorderPhase.Processing(step))
        updateForeground(step, showStopAction = false)
    }

    private fun startAsForeground(text: String, serviceType: Int, showStopAction: Boolean) {
        createChannel()
        ServiceCompat.startForeground(
            this,
            NOTIFICATION_ID,
            buildOngoingNotification(text, showStopAction),
            serviceType,
        )
    }

    private fun updateForeground(text: String, showStopAction: Boolean) {
        notificationManager().notify(
            NOTIFICATION_ID,
            buildOngoingNotification(text, showStopAction),
        )
    }

    private fun stopForegroundAndSelf() {
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    private fun buildOngoingNotification(
        text: String,
        showStopAction: Boolean,
    ): android.app.Notification {
        val openIntent = PendingIntent.getActivity(
            this,
            2,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_mic)
            .setContentTitle(getString(R.string.app_name))
            .setContentText(text)
            .setOngoing(true)
            .setContentIntent(openIntent)
        if (showStopAction) {
            val stopIntent = PendingIntent.getService(
                this,
                1,
                Intent(this, RecordingService::class.java).setAction(ACTION_STOP),
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
            builder.addAction(0, getString(R.string.action_stop), stopIntent)
        }
        return builder.build()
    }

    private fun notifyDone(title: String, text: String) {
        val openIntent = PendingIntent.getActivity(
            this,
            3,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_mic)
            .setContentTitle(title)
            .setContentText(text)
            .setStyle(NotificationCompat.BigTextStyle().bigText(text))
            .setAutoCancel(true)
            .setContentIntent(openIntent)
            .build()
        notificationManager().notify(DONE_NOTIFICATION_ID, notification)
    }

    private fun createChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID,
            getString(R.string.notification_channel_name),
            NotificationManager.IMPORTANCE_LOW,
        )
        notificationManager().createNotificationChannel(channel)
    }

    private fun notificationManager(): NotificationManager =
        getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

    override fun onDestroy() {
        // 서비스가 강제 종료돼도 최소한 녹음 파일은 남기고,
        // UI가 '녹음 중'으로 고착되지 않게 상태를 복구한다.
        // (파이프라인이 아직 finalize하지 못한 정지 대기 레코더도 여기서 마무리)
        pendingStop.getAndSet(null)?.let {
            runCatching { it.recorder.stop() }
            it.recorder.release()
        }
        active?.let {
            runCatching { it.recorder.stop() }
            it.recorder.release()
        }
        active = null
        if (RecorderState.isRecording) RecorderState.update(RecorderPhase.Idle)
        scope.cancel()
        super.onDestroy()
    }

    companion object {
        const val ACTION_TOGGLE = "kr.backpac.meetingrecorder.action.TOGGLE"
        const val ACTION_STOP = "kr.backpac.meetingrecorder.action.STOP"
        const val ACTION_PROCESS = "kr.backpac.meetingrecorder.action.PROCESS"
        const val EXTRA_BASE_NAME = "base_name"

        private const val CHANNEL_ID = "recording"
        private const val NOTIFICATION_ID = 1
        private const val DONE_NOTIFICATION_ID = 2

        fun toggle(context: Context) {
            start(context, Intent(context, RecordingService::class.java).setAction(ACTION_TOGGLE))
        }

        /**
         * 마이크 권한이 있으면 토글하고 true, 없으면 아무것도 하지 않고 false.
         * 트리거(사이드 키/볼륨 키)들이 권한 처리 방식만 각자 정하면 되게 한다.
         */
        fun requestToggle(context: Context): Boolean {
            val granted = ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.RECORD_AUDIO,
            ) == PackageManager.PERMISSION_GRANTED
            if (granted) toggle(context)
            return granted
        }

        /** 기존 기록에 대해 전사/회의록 파이프라인을 다시 실행한다. */
        fun processExisting(context: Context, baseName: String) {
            start(
                context,
                Intent(context, RecordingService::class.java)
                    .setAction(ACTION_PROCESS)
                    .putExtra(EXTRA_BASE_NAME, baseName),
            )
        }

        private fun start(context: Context, intent: Intent) {
            try {
                context.startForegroundService(intent)
            } catch (e: Exception) {
                // 백그라운드 시작 제한 등으로 실패할 수 있다.
                // 진행 중인 녹음 상태를 덮어쓰지 않도록 유휴 상태에서만 표시한다.
                if (!RecorderState.isRecording) {
                    RecorderState.update(
                        RecorderPhase.Error(
                            context.getString(
                                R.string.error_service_start,
                                e.message ?: context.getString(R.string.error_unknown),
                            ),
                        ),
                    )
                }
            }
        }
    }
}
