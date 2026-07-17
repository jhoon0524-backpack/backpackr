package kr.backpac.meetingrecorder.api

import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.TimeUnit

/** Claude API로 전사 텍스트에서 구조화된 회의록(마크다운)을 생성한다. */
class MinutesClient(
    private val apiKey: String,
    private val model: String,
) {

    private val client: OkHttpClient = Http.shared.newBuilder()
        .readTimeout(5, TimeUnit.MINUTES)
        .build()

    @Throws(IOException::class)
    fun generateMinutes(transcript: String, meetingDateTime: String): String {
        // trimIndent는 transcript(들여쓰기 0)를 붙이기 전에 템플릿에만 적용해야 한다.
        val instructions = """
            다음은 회의 녹음을 음성 인식으로 전사한 텍스트입니다. 이를 바탕으로 한국어 회의록을 마크다운으로 작성해 주세요.

            형식:
            # 회의록
            - **일시**: $meetingDateTime
            - **참석자**: (전사 내용에서 파악 가능한 경우만, 불명확하면 "확인 필요")

            ## 요약
            (3~5문장)

            ## 주요 논의 사항
            (항목별 정리)

            ## 결정 사항
            (명확히 결정된 것만)

            ## 액션 아이템
            | 할 일 | 담당 | 기한 |
            (없으면 "없음")

            규칙: 전사 오류로 보이는 부분은 문맥에 맞게 자연스럽게 보정하되, 내용을 지어내지 마세요. 회의록 본문만 출력하세요.
        """.trimIndent()

        val prompt = instructions + "\n\n--- 전사 텍스트 ---\n" + transcript

        val requestJson = JSONObject()
            .put("model", model)
            .put("max_tokens", 4096)
            .put(
                "messages",
                JSONArray().put(
                    JSONObject()
                        .put("role", "user")
                        .put("content", prompt),
                ),
            )

        val request = Request.Builder()
            .url("https://api.anthropic.com/v1/messages")
            .header("x-api-key", apiKey)
            .header("anthropic-version", "2023-06-01")
            .post(requestJson.toString().toRequestBody("application/json".toMediaType()))
            .build()

        client.newCall(request).execute().use { response ->
            val payload = response.body?.string().orEmpty()
            if (!response.isSuccessful) {
                throw IOException("회의록 생성 API 오류 (HTTP ${response.code}): ${payload.take(300)}")
            }
            val content = JSONObject(payload).getJSONArray("content")
            val sb = StringBuilder()
            for (i in 0 until content.length()) {
                val block = content.getJSONObject(i)
                if (block.optString("type") == "text") {
                    sb.append(block.optString("text"))
                }
            }
            return sb.toString().trim()
        }
    }
}
