package kr.backpac.meetingrecorder

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.widget.Toast
import androidx.core.content.ContextCompat

/**
 * UI 없는 원터치 토글 액티비티.
 *
 * 갤럭시 "사이드 키 두 번 누르기 → 앱 열기"나 픽셀 "빠른 탭"에 이 항목("빠른 녹음")을
 * 지정하면, 우측 버튼 두 번으로 녹음 시작/정지가 된다. 정지 시 전사와 회의록 생성이
 * 자동으로 이어진다.
 */
class QuickRecordActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val hasMicPermission = ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.RECORD_AUDIO,
        ) == PackageManager.PERMISSION_GRANTED

        if (!hasMicPermission) {
            // 권한이 없으면 메인 화면에서 권한을 받도록 유도한다.
            Toast.makeText(this, R.string.toast_need_mic_permission, Toast.LENGTH_LONG).show()
            startActivity(
                Intent(this, MainActivity::class.java)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
            )
            finish()
            return
        }

        val wasRecording = RecorderState.isRecording
        RecordingService.toggle(this)
        Toast.makeText(
            this,
            if (wasRecording) R.string.toast_recording_stopped else R.string.toast_recording_started,
            Toast.LENGTH_SHORT,
        ).show()
        finish()
    }
}
