package kr.backpac.meetingrecorder

import android.content.Context
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

data class MeetingRecord(
    val baseName: String,
    val audioFile: File?,
    val transcriptFile: File?,
    val minutesFile: File?,
    val createdAtMillis: Long,
) {
    val hasMinutes: Boolean get() = minutesFile != null
}

/**
 * 녹음/전사/회의록 파일 저장소.
 * 앱 전용 외부 저장소(files/)를 사용하므로 별도 저장소 권한이 필요 없다.
 *
 * 파일 구조:
 *   recordings/MTG_yyyyMMdd_HHmmss.m4a
 *   minutes/MTG_yyyyMMdd_HHmmss.transcript.txt
 *   minutes/MTG_yyyyMMdd_HHmmss.minutes.md
 */
class MeetingStore(private val context: Context) {

    private val root: File
        get() = context.getExternalFilesDir(null) ?: context.filesDir

    val recordingsDir: File
        get() = File(root, "recordings").apply { mkdirs() }

    val minutesDir: File
        get() = File(root, "minutes").apply { mkdirs() }

    fun newRecordingFile(): File {
        val stamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())
        return File(recordingsDir, "MTG_$stamp.m4a")
    }

    fun transcriptFileFor(baseName: String): File =
        File(minutesDir, "$baseName.transcript.txt")

    fun minutesFileFor(baseName: String): File =
        File(minutesDir, "$baseName.minutes.md")

    fun baseNameOf(audioFile: File): String = audioFile.nameWithoutExtension

    fun listMeetings(): List<MeetingRecord> {
        val audios = recordingsDir.listFiles { f -> f.extension == "m4a" }.orEmpty()
            .associateBy { it.nameWithoutExtension }
        val transcripts = minutesDir.listFiles { f -> f.name.endsWith(".transcript.txt") }.orEmpty()
            .associateBy { it.name.removeSuffix(".transcript.txt") }
        val minutes = minutesDir.listFiles { f -> f.name.endsWith(".minutes.md") }.orEmpty()
            .associateBy { it.name.removeSuffix(".minutes.md") }

        val baseNames = audios.keys + transcripts.keys + minutes.keys
        return baseNames.map { base ->
            val audio = audios[base]
            MeetingRecord(
                baseName = base,
                audioFile = audio,
                transcriptFile = transcripts[base],
                minutesFile = minutes[base],
                createdAtMillis = audio?.lastModified()
                    ?: minutes[base]?.lastModified()
                    ?: transcripts[base]?.lastModified()
                    ?: 0L,
            )
        }.sortedByDescending { it.createdAtMillis }
    }

    fun delete(record: MeetingRecord) {
        record.audioFile?.delete()
        record.transcriptFile?.delete()
        record.minutesFile?.delete()
    }
}
