package kr.backpac.meetingrecorder

import android.content.Context
import android.content.SharedPreferences

/**
 * API 키 등 앱 설정. 키는 기기 내 SharedPreferences에만 저장되며 외부로 전송되지 않는다
 * (각 API 호출 시 해당 서비스로만 전달).
 */
class AppSettings(context: Context) {

    private val prefs: SharedPreferences =
        context.getSharedPreferences("settings", Context.MODE_PRIVATE)

    /** OpenAI 호환 음성 전사 API (Whisper) 베이스 URL */
    var sttBaseUrl: String
        get() = prefs.getString(KEY_STT_BASE_URL, DEFAULT_STT_BASE_URL) ?: DEFAULT_STT_BASE_URL
        set(value) = prefs.edit().putString(KEY_STT_BASE_URL, value.trim()).apply()

    var sttApiKey: String
        get() = prefs.getString(KEY_STT_API_KEY, "") ?: ""
        set(value) = prefs.edit().putString(KEY_STT_API_KEY, value.trim()).apply()

    var sttModel: String
        get() = prefs.getString(KEY_STT_MODEL, DEFAULT_STT_MODEL) ?: DEFAULT_STT_MODEL
        set(value) = prefs.edit().putString(KEY_STT_MODEL, value.trim()).apply()

    /** 회의록 요약에 사용할 Claude API 키 */
    var anthropicApiKey: String
        get() = prefs.getString(KEY_ANTHROPIC_API_KEY, "") ?: ""
        set(value) = prefs.edit().putString(KEY_ANTHROPIC_API_KEY, value.trim()).apply()

    var anthropicModel: String
        get() = prefs.getString(KEY_ANTHROPIC_MODEL, DEFAULT_ANTHROPIC_MODEL)
            ?: DEFAULT_ANTHROPIC_MODEL
        set(value) = prefs.edit().putString(KEY_ANTHROPIC_MODEL, value.trim()).apply()

    /** 볼륨 상 키 두 번 누르기로 녹음 토글 (접근성 서비스 활성화 필요) */
    var volumeDoublePressEnabled: Boolean
        get() = prefs.getBoolean(KEY_VOLUME_DOUBLE_PRESS, true)
        set(value) = prefs.edit().putBoolean(KEY_VOLUME_DOUBLE_PRESS, value).apply()

    companion object {
        private const val KEY_STT_BASE_URL = "stt_base_url"
        private const val KEY_STT_API_KEY = "stt_api_key"
        private const val KEY_STT_MODEL = "stt_model"
        private const val KEY_ANTHROPIC_API_KEY = "anthropic_api_key"
        private const val KEY_ANTHROPIC_MODEL = "anthropic_model"
        private const val KEY_VOLUME_DOUBLE_PRESS = "volume_double_press"

        const val DEFAULT_STT_BASE_URL = "https://api.openai.com/v1"
        const val DEFAULT_STT_MODEL = "whisper-1"
        const val DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-5"
    }
}
