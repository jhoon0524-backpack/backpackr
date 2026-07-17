package kr.backpac.meetingrecorder.api

import okhttp3.OkHttpClient
import java.util.concurrent.TimeUnit

/**
 * 앱 전체가 공유하는 HTTP 클라이언트.
 * 커넥션 풀/스레드 풀을 재사용하도록 각 API 클라이언트는
 * shared.newBuilder()로 타임아웃만 바꿔 파생 클라이언트를 만든다.
 */
internal object Http {
    val shared: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .build()
    }
}
