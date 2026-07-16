# 회의록 레코더 (Meeting Recorder)

핸드폰 **우측 버튼(사이드 키)을 두 번 누르면 녹음이 시작**되고, 정지하면 **음성 전사 → 회의록 생성**까지 한 번에 자동으로 처리되는 Android 앱입니다.

## 동작 흐름

```
우측 버튼 2번 → 녹음 시작 (포그라운드 서비스)
우측 버튼 2번 → 녹음 정지
              → ① 음성 → 텍스트 전사 (Whisper 호환 API)
              → ② 전사문 → 회의록 생성 (Claude API)
              → ③ 회의록(.md) 저장 + 완료 알림
```

생성되는 회의록은 **일시 / 참석자 / 요약 / 주요 논의 사항 / 결정 사항 / 액션 아이템(담당·기한)** 구조의 마크다운이며, 전체 전사문이 함께 첨부됩니다. 앱에서 바로 열람·공유(Slack, 메일 등)할 수 있습니다.

## 우측 버튼 연동 설정

Android는 보안상 서드파티 앱이 전원(사이드) 키 입력을 직접 가로챌 수 없기 때문에, 제조사에서 제공하는 버튼 커스터마이즈 기능으로 연결합니다.

| 기기 | 설정 경로 |
|---|---|
| 갤럭시 | 설정 → 유용한 기능 → 사이드 키 → **두 번 누르기** → 앱 열기 → **빠른 녹음 (회의록)** |
| 픽셀 | 설정 → 시스템 → 동작 및 제스처 → **빠른 탭** → 앱 열기 → **빠른 녹음 (회의록)** |

"빠른 녹음 (회의록)"은 UI 없이 녹음을 토글만 하고 즉시 사라지는 전용 런처 항목(`QuickRecordActivity`)입니다.

**보조 트리거 — 볼륨 키:** 접근성 서비스(`SideKeyAccessibilityService`)를 활성화하면 화면이 켜진 상태에서 **볼륨 상(上) 키를 빠르게 두 번** 눌러도 녹음이 토글됩니다. (앱 내 "설정 방법" → 접근성 설정 열기)

> iOS는 사이드 버튼 이중 클릭이 Apple Pay에 예약되어 있어 서드파티 앱이 사용할 수 없습니다. 이 프로젝트는 Android 전용입니다.

## 최초 설정

1. 앱 설치 후 실행 → 마이크/알림 권한 허용
2. 우측 상단 **설정**에서 API 키 입력
   - **음성 전사**: OpenAI 호환 Whisper API (기본 `https://api.openai.com/v1`, 모델 `whisper-1`). faster-whisper 등 자체 호스팅 서버도 같은 스펙이면 사용 가능
   - **회의록 요약**: Anthropic API 키 (기본 모델 `claude-sonnet-5`)
3. 위 표에 따라 사이드 키 두 번 누르기를 "빠른 녹음 (회의록)"에 연결

API 키가 없어도 동작은 하되 단계가 축소됩니다: 전사 키만 있으면 전사문 회의록, 키가 전혀 없으면 녹음 파일만 저장.

## 프로젝트 구조

```
app/src/main/java/kr/backpac/meetingrecorder/
├── MainActivity.kt                  # 메인 화면 (Compose): 녹음 제어, 기록 목록, 설정
├── QuickRecordActivity.kt           # 사이드 키 연동용 무 UI 토글 액티비티
├── RecordingService.kt              # 녹음 + 전사 + 회의록 생성 파이프라인 (FGS)
├── SideKeyAccessibilityService.kt   # 볼륨 상 키 2번 → 녹음 토글
├── RecorderState.kt                 # 서비스 ↔ UI 상태 공유
├── AppSettings.kt                   # API 키 등 설정 저장
├── MeetingStore.kt                  # 녹음/전사/회의록 파일 관리
└── api/
    ├── TranscriptionClient.kt       # Whisper 호환 전사 API
    └── MinutesClient.kt             # Claude 회의록 생성 API
```

파일은 앱 전용 저장소에 보관됩니다: `recordings/MTG_*.m4a`, `minutes/MTG_*.transcript.txt`, `minutes/MTG_*.minutes.md`

## 빌드

Android Studio(Ladybug 이상)로 프로젝트를 열면 자동으로 동기화됩니다. CLI 빌드:

```bash
gradle :app:assembleDebug   # 또는 gradle wrapper 생성 후 ./gradlew :app:assembleDebug
```

- compileSdk 35 / minSdk 26 / Kotlin 2.0 / Jetpack Compose

## 개인정보

- 녹음 파일과 회의록은 기기 내 앱 전용 저장소에만 저장됩니다.
- 음성 데이터는 사용자가 설정한 전사 API로, 전사 텍스트는 Anthropic API로만 전송됩니다.
- API 키는 기기 내부(SharedPreferences)에만 저장됩니다.
- 회의 녹음은 참석자 동의를 얻고 사용하세요.
