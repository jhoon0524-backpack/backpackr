package kr.backpac.meetingrecorder

import android.content.Context
import java.io.File
import java.io.IOException
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
 * 파일명 규칙(MTG_ + 타임스탬프)은 이 클래스가 단독으로 소유한다.
 *
 * 파일 구조:
 *   recordings/MTG_yyyyMMdd_HHmmss.m4a
 *   minutes/MTG_yyyyMMdd_HHmmss.transcript.txt
 *   minutes/MTG_yyyyMMdd_HHmmss.minutes.md
 */
class MeetingStore(context: Context) {

    private val root: File = context.getExternalFilesDir(null) ?: context.filesDir

    val recordingsDir: File by lazy { File(root, "recordings").apply { mkdirs() } }

    val minutesDir: File by lazy { File(root, "minutes").apply { mkdirs() } }

    fun newRecordingFile(): File =
        audioFileFor(FILE_PREFIX + stampFormat().format(Date()))

    fun audioFileFor(baseName: String): File = File(recordingsDir, "$baseName.$AUDIO_EXT")

    fun transcriptFileFor(baseName: String): File =
        File(minutesDir, "$baseName$TRANSCRIPT_SUFFIX")

    fun minutesFileFor(baseName: String): File =
        File(minutesDir, "$baseName$MINUTES_SUFFIX")

    fun baseNameOf(audioFile: File): String = audioFile.nameWithoutExtension

    /** 파일명 타임스탬프에서 회의 시각을 복원한다. 규칙에 안 맞으면 null. */
    fun createdAtFromName(baseName: String): Long? {
        if (!baseName.startsWith(FILE_PREFIX)) return null
        return runCatching {
            stampFormat().parse(baseName.removePrefix(FILE_PREFIX))?.time
        }.getOrNull()
    }

    fun listMeetings(): List<MeetingRecord> {
        val audios = recordingsDir.listFiles { f -> f.extension == AUDIO_EXT }.orEmpty()
            .associateBy { it.nameWithoutExtension }
        val transcripts = minutesDir.listFiles { f -> f.name.endsWith(TRANSCRIPT_SUFFIX) }.orEmpty()
            .associateBy { it.name.removeSuffix(TRANSCRIPT_SUFFIX) }
        val minutes = minutesDir.listFiles { f -> f.name.endsWith(MINUTES_SUFFIX) }.orEmpty()
            .associateBy { it.name.removeSuffix(MINUTES_SUFFIX) }

        val baseNames = audios.keys + transcripts.keys + minutes.keys
        return baseNames.map { base ->
            val audio = audios[base]
            MeetingRecord(
                baseName = base,
                audioFile = audio,
                transcriptFile = transcripts[base],
                minutesFile = minutes[base],
                createdAtMillis = createdAtFromName(base)
                    ?: audio?.lastModified()
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

    companion object {
        private const val FILE_PREFIX = "MTG_"
        private const val AUDIO_EXT = "m4a"
        private const val TRANSCRIPT_SUFFIX = ".transcript.txt"
        private const val MINUTES_SUFFIX = ".minutes.md"
        private const val STAMP_PATTERN = "yyyyMMdd_HHmmss"

        // SimpleDateFormat은 스레드 안전하지 않아 호출마다 생성한다.
        private fun stampFormat() = SimpleDateFormat(STAMP_PATTERN, Locale.US)

        /** 목록/회의록 본문 공용 표시 형식. */
        fun formatDateTime(millis: Long): String =
            SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.KOREA).format(Date(millis))
    }
}

/**
 * 임시 파일에 쓴 뒤 교체하여, 도중에 프로세스가 죽어도 반쪽 파일이
 * 완성본처럼 남지 않게 한다.
 */
@Throws(IOException::class)
fun File.writeTextAtomic(text: String) {
    val tmp = File(parentFile, "$name.tmp")
    tmp.writeText(text)
    if (!tmp.renameTo(this)) {
        delete()
        if (!tmp.renameTo(this)) {
            tmp.delete()
            throw IOException("파일을 저장하지 못했습니다: $name")
        }
    }
}
