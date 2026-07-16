package kr.backpac.meetingrecorder

import android.Manifest
import android.accessibilityservice.AccessibilityService
import android.content.pm.PackageManager
import android.view.KeyEvent
import android.view.accessibility.AccessibilityEvent
import android.widget.Toast
import androidx.core.content.ContextCompat

/**
 * 볼륨 상(上) 키를 빠르게 두 번 누르면 녹음을 토글하는 접근성 서비스.
 *
 * 전원(사이드) 키 이벤트는 접근성 서비스로 전달되지 않으므로, 전원 키 연동은
 * 제조사 설정(갤럭시 사이드 키 / 픽셀 빠른 탭)으로 QuickRecordActivity를 열게 하고,
 * 이 서비스는 화면이 켜진 상태에서 쓸 수 있는 보조 트리거를 제공한다.
 *
 * 볼륨 이벤트는 소비하지 않는다(return false). 볼륨이 살짝 바뀌는 대신
 * 단일 누름의 원래 동작을 깨뜨리지 않는다.
 */
class SideKeyAccessibilityService : AccessibilityService() {

    private var lastVolumeUpAtMillis = 0L

    override fun onAccessibilityEvent(event: AccessibilityEvent?) = Unit

    override fun onInterrupt() = Unit

    override fun onKeyEvent(event: KeyEvent): Boolean {
        if (event.keyCode != KeyEvent.KEYCODE_VOLUME_UP || event.action != KeyEvent.ACTION_DOWN) {
            return false
        }
        if (!AppSettings(this).volumeDoublePressEnabled) {
            return false
        }

        val now = event.eventTime
        val isDoublePress = now - lastVolumeUpAtMillis in 1..DOUBLE_PRESS_WINDOW_MILLIS
        lastVolumeUpAtMillis = now

        if (isDoublePress) {
            lastVolumeUpAtMillis = 0L
            val hasMicPermission = ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.RECORD_AUDIO,
            ) == PackageManager.PERMISSION_GRANTED
            if (hasMicPermission) {
                val wasRecording = RecorderState.isRecording
                RecordingService.toggle(this)
                Toast.makeText(
                    this,
                    if (wasRecording) R.string.toast_recording_stopped
                    else R.string.toast_recording_started,
                    Toast.LENGTH_SHORT,
                ).show()
            } else {
                Toast.makeText(this, R.string.toast_need_mic_permission, Toast.LENGTH_LONG).show()
            }
        }
        return false
    }

    companion object {
        private const val DOUBLE_PRESS_WINDOW_MILLIS = 400L
    }
}
