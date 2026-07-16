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
 */
class RecordingService : Service() {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var recorder: MediaRecorder? = null
    private var currentFile: File? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_TOGGLE -> if (recorder == null) startRecording() else stopAndProcess()
            ACTION_START -> if (recorder == null) startRecording()
            ACTION_STOP -> if (recorder != null) stopAndProcess()
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
        startAsForeground(getString(R.string.notification_recording))
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

        updateForeground(getString(R.string.notification_processing))
        scope.launch { process(file) }
    }

    /** 전사 → 회의록 생성 → 파일 저장. API 키가 없으면 가능한 단계까지만 수행한다. */
    private fun process(audioFile: File) {
        val settings = AppSettings(this)
        val store = MeetingStore(this)
        val baseName = store.baseNameOf(audioFile)
        val dateTime = SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.KOREA)
            .format(Date(audioFile.lastModified()))

        try {
            if (settings.sttApiKey.isBlank()) {
                RecorderState.update(RecorderPhase.Done(audioFile.name))
                notifyDone(
                    getString(R.string.notification_saved_audio_only),
                    getString(R.string.notification_need_stt_key),
                )
                return
            }

            RecorderState.update(RecorderPhase.Processing(getString(R.string.step_transcribing)))
            val transcript = TranscriptionClient(
                baseUrl = settings.sttBaseUrl,
                apiKey = settings.sttApiKey,
                model = settings.sttModel,
            ).transcribe(audioFile)

            val transcriptFile = store.transcriptFileFor(baseName)
            transcriptFile.writeText(transcript)

            if (transcript.isBlank()) {
                RecorderState.update(RecorderPhase.Error("전사 결과가 비어 있습니다."))
                notifyDone(getString(R.string.notification_saved_audio_only), "전사 결과가 비어 있습니다.")
                return
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
            stopForegroundCompat()
            stopSelf()
        }
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

    private fun startAsForeground(text: String) {
        createChannel()
        val notification = buildOngoingNotification(text)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            startForeground(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE,
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    private fun updateForeground(text: String) {
        notificationManager().notify(NOTIFICATION_ID, buildOngoingNotification(text))
    }

    private fun buildOngoingNotification(text: String): android.app.Notification {
        val stopIntent = PendingIntent.getService(
            this,
            1,
            Intent(this, RecordingService::class.java).setAction(ACTION_STOP),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val openIntent = PendingIntent.getActivity(
            this,
            2,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_mic)
            .setContentTitle(getString(R.string.app_name))
            .setContentText(text)
            .setOngoing(true)
            .setContentIntent(openIntent)
            .addAction(0, getString(R.string.action_stop), stopIntent)
            .build()
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

        private const val CHANNEL_ID = "recording"
        private const val NOTIFICATION_ID = 1
        private const val DONE_NOTIFICATION_ID = 2

        fun toggle(context: Context) {
            val intent = Intent(context, RecordingService::class.java).setAction(ACTION_TOGGLE)
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
