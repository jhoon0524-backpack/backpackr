# /sync

원격(origin)의 최신 변경사항을 로컬에 가져와 동기화한다.

## 자연어 트리거

다음 표현이 들어오면 이 커맨드를 실행한다:

- "git 최신화 해줘"
- "git 최신화"
- "최신화 해줘"
- "sync 해줘"

## 동작

1. `git status` 로 현재 상태 확인
   - 작업 중인 변경사항(unstaged/staged)이 있으면 사용자에게 경고하고 어떻게 처리할지 묻는다 (stash / 그대로 진행 / 중단)
2. `git fetch origin` 로 원격 최신 상태 가져오기
3. 로컬 vs 원격 비교:
   - **로컬만 앞섬** → "로컬이 N커밋 앞섭니다. `/save`로 푸시하시겠어요?" 안내
   - **원격만 앞섬** → `git pull --ff-only origin <현재 브랜치>` 실행 (원격만 앞선 상황에서는 fast-forward로 결과가 rebase와 동일하며, post-merge 훅이 실제로 발동한다)
     - pull 시 `.githooks/post-merge` 가 **자동으로 설정된 webhook 채널에 Slack 알림** 발송 (커맨드에서 별도 호출 불필요)
   - **양쪽 다 앞섬** → 사용자에게 알리고 rebase/merge 선택 요청
   - **동일** → "이미 최신 상태입니다." 보고
4. rebase 충돌 발생 시: 충돌 파일 목록을 보여주고 사용자가 직접 해결할 수 있도록 중단 (자동 해결 금지)
5. 결과 보고: 가져온 커밋 수 · 현재 HEAD · 원격과의 차이

## 금지

- `git pull --force`, `git reset --hard origin/...` 자동 사용 금지
- 충돌을 임의로 한쪽 방향(ours/theirs)으로 자동 해결 금지
- working tree에 변경사항이 있는데 사용자 확인 없이 stash/discard 금지

## 참조

- 사용자 전역 지침: 위험 행동 사전 확인, 추측 금지
