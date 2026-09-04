package kr.backpac.meetingrecorder

import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.media.MediaMuxer
import java.io.File
import java.nio.ByteBuffer

/**
 * Whisper API의 업로드 용량 제한(25MB)을 넘는 긴 녹음을 시간 단위로 분할한다.
 * 재인코딩 없이 MediaExtractor → MediaMuxer로 샘플을 그대로 복사하므로
 * 음질 손실이 없고 속도가 빠르다.
 */
object AudioChunker {

    /** 이 크기 이하면 분할하지 않는다 (API 한도 25MB에 여유를 둔 값). */
    private const val MAX_UPLOAD_BYTES = 20L * 1024 * 1024

    /** 분할 시 청크 길이. 128kbps 기준 약 9.6MB. */
    private const val CHUNK_DURATION_US = 10L * 60 * 1_000_000

    /**
     * 파일이 업로드 한도를 넘으면 workDir에 청크 파일들을 만들어 반환하고,
     * 넘지 않으면 원본 파일 하나만 담아 반환한다.
     * 분할에 실패하면 원본을 그대로 반환한다 (업로드 단계에서 오류로 드러나도록).
     */
    fun splitIfNeeded(input: File, workDir: File): List<File> {
        if (input.length() <= MAX_UPLOAD_BYTES) return listOf(input)

        workDir.mkdirs()
        val extractor = MediaExtractor()
        val chunks = mutableListOf<File>()
        try {
            extractor.setDataSource(input.absolutePath)

            var trackIndex = -1
            var format: MediaFormat? = null
            for (i in 0 until extractor.trackCount) {
                val f = extractor.getTrackFormat(i)
                if (f.getString(MediaFormat.KEY_MIME)?.startsWith("audio/") == true) {
                    trackIndex = i
                    format = f
                    break
                }
            }
            if (trackIndex < 0 || format == null) return listOf(input)

            extractor.selectTrack(trackIndex)
            val maxInputSize = if (format.containsKey(MediaFormat.KEY_MAX_INPUT_SIZE)) {
                format.getInteger(MediaFormat.KEY_MAX_INPUT_SIZE)
            } else {
                1 shl 20
            }
            val buffer = ByteBuffer.allocate(maxInputSize.coerceAtLeast(64 * 1024))
            val info = MediaCodec.BufferInfo()

            var chunkIndex = 0
            var sampleTimeUs = extractor.sampleTime
            while (sampleTimeUs >= 0) {
                val chunkFile =
                    File(workDir, "${input.nameWithoutExtension}.part$chunkIndex.m4a")
                val muxer = MediaMuxer(
                    chunkFile.absolutePath,
                    MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4,
                )
                val outTrack = muxer.addTrack(format)
                muxer.start()
                val chunkStartUs = sampleTimeUs
                var samplesWritten = 0
                try {
                    while (sampleTimeUs >= 0 && sampleTimeUs - chunkStartUs < CHUNK_DURATION_US) {
                        val size = extractor.readSampleData(buffer, 0)
                        if (size < 0) break
                        val flags =
                            if (extractor.sampleFlags and MediaExtractor.SAMPLE_FLAG_SYNC != 0) {
                                MediaCodec.BUFFER_FLAG_KEY_FRAME
                            } else {
                                0
                            }
                        info.set(0, size, sampleTimeUs - chunkStartUs, flags)
                        muxer.writeSampleData(outTrack, buffer, info)
                        samplesWritten++
                        extractor.advance()
                        sampleTimeUs = extractor.sampleTime
                    }
                } finally {
                    runCatching { muxer.stop() }
                    muxer.release()
                }
                if (samplesWritten > 0) {
                    chunks += chunkFile
                    chunkIndex++
                } else {
                    chunkFile.delete()
                    break
                }
            }
            return chunks.ifEmpty {
                listOf(input)
            }
        } catch (e: Exception) {
            chunks.forEach { it.delete() }
            return listOf(input)
        } finally {
            extractor.release()
        }
    }

    /** 분할로 생긴 임시 청크만 삭제한다 (원본이 그대로 반환된 경우는 건드리지 않음). */
    fun cleanup(original: File, chunks: List<File>) {
        chunks.filter { it != original }.forEach { it.delete() }
    }
}
