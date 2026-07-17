package kr.backpac.meetingrecorder.api

import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.asRequestBody
import org.json.JSONObject
import java.io.File
import java.io.IOException
import java.util.concurrent.TimeUnit

/**
 * OpenAI 호환 음성 전사 API 클라이언트 (POST {baseUrl}/audio/transcriptions).
 * OpenAI Whisper 외에도 같은 스펙을 따르는 자체 호스팅 서버(faster-whisper 등)를 쓸 수 있다.
 */
class TranscriptionClient(
    private val baseUrl: String,
    private val apiKey: String,
    private val model: String,
) {

    // 공유 풀을 재사용하면서 업로드에 맞는 타임아웃만 조정한다.
    private val client: OkHttpClient = Http.shared.newBuilder()
        .readTimeout(10, TimeUnit.MINUTES)
        .writeTimeout(10, TimeUnit.MINUTES)
        .build()

    @Throws(IOException::class)
    fun transcribe(audioFile: File, language: String = "ko"): String {
        val body = MultipartBody.Builder()
            .setType(MultipartBody.FORM)
            .addFormDataPart(
                "file",
                audioFile.name,
                audioFile.asRequestBody("audio/mp4".toMediaType()),
            )
            .addFormDataPart("model", model)
            .addFormDataPart("language", language)
            .addFormDataPart("response_format", "json")
            .build()

        val request = Request.Builder()
            .url(baseUrl.trimEnd('/') + "/audio/transcriptions")
            .header("Authorization", "Bearer $apiKey")
            .post(body)
            .build()

        client.newCall(request).execute().use { response ->
            val payload = response.body?.string().orEmpty()
            if (!response.isSuccessful) {
                throw IOException("전사 API 오류 (HTTP ${response.code}): ${payload.take(300)}")
            }
            return JSONObject(payload).optString("text").trim()
        }
    }
}
