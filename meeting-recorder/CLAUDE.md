# 회의록 레코더 (Meeting Recorder)

Android 앱: 사이드 키(우측 버튼) 두 번 누르기로 회의 녹음을 시작/정지하고, 정지 시 음성 전사(Whisper 호환 API)와 회의록 생성(Claude API)을 자동으로 수행한다.

## 개발 메모

- Kotlin 2.0 + Jetpack Compose, compileSdk 35, minSdk 26
- 패키지: `kr.backpac.meetingrecorder`
- 핵심 파이프라인: `RecordingService.kt` (녹음 → 전사 → 회의록 저장, 포그라운드 서비스)
- 사이드 키 연동: 제조사 버튼 리매핑으로 `QuickRecordActivity`(무 UI 토글) 실행. 전원 키는 서드파티가 직접 가로챌 수 없음
- 보조 트리거: `SideKeyAccessibilityService` (볼륨 상 키 2번)
- UI 문자열은 한국어 기준 (`res/values/strings.xml`)
- 빌드: Android Studio 열기 또는 `gradle :app:assembleDebug` (wrapper 미포함)

자세한 내용은 README.md 참고.
