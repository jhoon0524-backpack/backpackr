package kr.backpac.meetingrecorder

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.MediaRecorder
import android.os.Build
import android.os.IBinder
import android.widget.Toast
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kr.backpac.meetingrecorder.api.MinutesClient
import kr.backpac.meetingrecorder.api.TranscriptionClient
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * 녹음 → 전사 → 회의록 생성까지 한 번에 처리하는 포그라운드 서비스.
 *
 * ACTION_TOGGLE: 녹음 중이면 정지 후 회의록 생성 파이프라인 실행, 아니면 녹음 시작.
 * ACTION_STOP: 녹음 정지 (알림의 정지 버튼).
 * ACTION_PROCESS: 기존 기록에 대해 파이프라인 재실행 (재시도/재생성).
 *   이미 전사문이 있으면 전사를 건너뛰고 회의록 생성부터 이어서 한다.
 */
class RecordingService : Service() {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var recorder: MediaRecorder? = null
    private var currentFile: File? = null

    @Volatile
    private var isProcessing = false

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_TOGGLE -> when {
                recorder != null -> stopAndProcess()
                isProcessing -> Toast.makeText(
                    this, R.string.toast_busy_processing, Toast.LENGTH_SHORT,
                ).show()
                else -> startRecording()
            }
            ACTION_START -> if (recorder == null && !isProcessing) startRecording()
            ACTION_STOP -> if (recorder != null) stopAndProcess()
            ACTION_PROCESS -> {
                val baseName = intent.getStringExtra(EXTRA_BASE_NAME)
                if (baseName != null && recorder == null && !isProcessing) {
                    isProcessing = true
                    startAsForeground(
                        getString(R.string.notification_processing),
                        foregroundServiceType(recording = false),
                        showStopAction = false,
                    )
                    scope.launch { process(baseName) }
                }
            }
        }
        return START_NOT_STICKY
    }

    private fun startRecording() {
        val store = MeetingStore(this)
        val file = store.newRecordingFile()

        val mediaRecorder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            MediaRecorder(this)
        } else {
            @Suppress("DEPRECATION")
            MediaRecorder()
        }

        try {
            mediaRecorder.apply {
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
            mediaRecorder.release()
            file.delete()
            RecorderState.update(RecorderPhase.Error("녹음을 시작할 수 없습니다: ${e.message}"))
            stopSelf()
            return
        }

        recorder = mediaRecorder
        currentFile = file
        RecorderState.update(RecorderPhase.Recording(System.currentTimeMillis()))
        startAsForeground(
            getString(R.string.notification_recording),
            foregroundServiceType(recording = true),
            showStopAction = true,
        )
    }

    private fun stopAndProcess() {
        val mediaRecorder = recorder ?: return
        val file = currentFile
        recorder = null
        currentFile = null

        try {
            mediaRecorder.stop()
        } catch (e: Exception) {
            // 너무 짧은 녹음 등으로 stop이 실패하면 파일을 버린다.
            file?.delete()
            mediaRecorder.release()
            RecorderState.update(RecorderPhase.Error("녹음이 너무 짧아 저장하지 못했습니다."))
            stopForegroundCompat()
            stopSelf()
            return
        }
        mediaRecorder.release()

        if (file == null || !file.exists()) {
            RecorderState.update(RecorderPhase.Error("녹음 파일을 찾을 수 없습니다."))
            stopForegroundCompat()
            stopSelf()
            return
        }

        isProcessing = true
        updateForeground(getString(R.string.notification_processing), showStopAction = false)
        val baseName = MeetingStore(this).baseNameOf(file)
        scope.launch { process(baseName) }
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
        val audioFile = File(store.recordingsDir, "$baseName.m4a").takeIf { it.exists() }
        val dateTime = meetingDateTime(baseName, audioFile)

        try {
            val transcriptFile = store.transcriptFileFor(baseName)
            var transcript =
                transcriptFile.takeIf { it.exists() }?.readText()?.trim().orEmpty()

            if (transcript.isBlank()) {
                if (audioFile == null) {
                    RecorderState.update(RecorderPhase.Error("녹음 파일이 없어 처리할 수 없습니다."))
                    notifyDone(getString(R.string.notification_failed), "녹음 파일이 없어 처리할 수 없습니다.")
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
                transcriptFile.writeText(transcript)

                if (transcript.isBlank()) {
                    RecorderState.update(RecorderPhase.Error("전사 결과가 비어 있습니다."))
                    notifyDone(getString(R.string.notification_saved_audio_only), "전사 결과가 비어 있습니다.")
                    return
                }
            }

            val minutesFile = store.minutesFileFor(baseName)
            if (settings.anthropicApiKey.isBlank()) {
                // 회의록 요약 키가 없으면 전사문만으로 간단 회의록을 만든다.
                minutesFile.writeText(fallbackMinutes(dateTime, transcript))
                RecorderState.update(RecorderPhase.Done(minutesFile.name))
                notifyDone(
                    getString(R.string.notification_transcript_done),
                    getString(R.string.notification_need_anthropic_key),
                )
                return
            }

            RecorderState.update(RecorderPhase.Processing(getString(R.string.step_generating_minutes)))
            updateForeground(getString(R.string.step_generating_minutes), showStopAction = false)
            val minutes = MinutesClient(
                apiKey = settings.anthropicApiKey,
                model = settings.anthropicModel,
            ).generateMinutes(transcript, dateTime)

            minutesFile.writeText(
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
            RecorderState.update(RecorderPhase.Error(e.message ?: "알 수 없는 오류"))
            notifyDone(getString(R.string.notification_failed), e.message ?: "")
        } finally {
            isProcessing = false
            // 처리 중에 새 녹음이 시작되지 않았을 때만 서비스를 내린다.
            if (recorder == null) {
                stopForegroundCompat()
                stopSelf()
            }
        }
    }

    /**
     * 업로드 한도를 넘는 긴 녹음은 10분 단위 청크로 분할해 순서대로 전사하고
     * 결과를 이어붙인다.
     */
    private fun transcribe(audioFile: File, settings: AppSettings): String {
        RecorderState.update(RecorderPhase.Processing(getString(R.string.step_transcribing)))
        updateForeground(getString(R.string.step_transcribing), showStopAction = false)

        val client = TranscriptionClient(
            baseUrl = settings.sttBaseUrl,
            apiKey = settings.sttApiKey,
            model = settings.sttModel,
        )

        RecorderState.update(RecorderPhase.Processing(getString(R.string.step_splitting)))
        val chunks = AudioChunker.splitIfNeeded(audioFile, File(cacheDir, "chunks"))
        try {
            if (chunks.size == 1) {
                RecorderState.update(RecorderPhase.Processing(getString(R.string.step_transcribing)))
                return client.transcribe(chunks[0]).trim()
            }
            val parts = mutableListOf<String>()
            chunks.forEachIndexed { index, chunk ->
                val step = getString(
                    R.string.step_transcribing_progress, index + 1, chunks.size,
                )
                RecorderState.update(RecorderPhase.Processing(step))
                updateForeground(step, showStopAction = false)
                parts += client.transcribe(chunk).trim()
            }
            return parts.filter { it.isNotBlank() }.joinToString("\n\n").trim()
        } finally {
            AudioChunker.cleanup(audioFile, chunks)
        }
    }

    private fun meetingDateTime(baseName: String, audioFile: File?): String {
        val output = SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.KOREA)
        runCatching {
            SimpleDateFormat("'MTG_'yyyyMMdd_HHmmss", Locale.US).parse(baseName)
        }.getOrNull()?.let { return output.format(it) }
        return output.format(Date(audioFile?.lastModified() ?: System.currentTimeMillis()))
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

    private fun foregroundServiceType(recording: Boolean): Int =
        if (recording) {
            ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
        } else {
            ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
        }

    private fun startAsForeground(text: String, serviceType: Int, showStopAction: Boolean) {
        createChannel()
        val notification = buildOngoingNotification(text, showStopAction)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            startForeground(NOTIFICATION_ID, notification, serviceType)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    private fun updateForeground(text: String, showStopAction: Boolean) {
        notificationManager().notify(
            NOTIFICATION_ID,
            buildOngoingNotification(text, showStopAction),
        )
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

    private fun stopForegroundCompat() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE)
        } else {
            @Suppress("DEPRECATION")
            stopForeground(true)
        }
    }

    override fun onDestroy() {
        // 처리 도중 서비스가 죽으면 최소한 녹음 파일은 남긴다.
        recorder?.let {
            runCatching { it.stop() }
            it.release()
        }
        recorder = null
        scope.cancel()
        super.onDestroy()
    }

    companion object {
        const val ACTION_TOGGLE = "kr.backpac.meetingrecorder.action.TOGGLE"
        const val ACTION_START = "kr.backpac.meetingrecorder.action.START"
        const val ACTION_STOP = "kr.backpac.meetingrecorder.action.STOP"
        const val ACTION_PROCESS = "kr.backpac.meetingrecorder.action.PROCESS"
        const val EXTRA_BASE_NAME = "base_name"

        private const val CHANNEL_ID = "recording"
        private const val NOTIFICATION_ID = 1
        private const val DONE_NOTIFICATION_ID = 2

        fun toggle(context: Context) {
            start(context, Intent(context, RecordingService::class.java).setAction(ACTION_TOGGLE))
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
                RecorderState.update(
                    RecorderPhase.Error("녹음 서비스를 시작하지 못했습니다: ${e.message}"),
                )
            }
        }
    }
}
