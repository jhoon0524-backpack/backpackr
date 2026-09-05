# /save

현재 브랜치의 모든 변경사항을 커밋하고 원격(origin)에 푸시한다.

## 자연어 트리거

다음 표현이 들어오면 이 커맨드를 실행한다:

- "올려줘"
- "올려"
- "save 해줘"
- "저장해서 올려줘"

## 동작

1. `git status` / `git diff` / `git log -5` 를 병렬로 실행해 현재 상태 파악
2. 변경 분석:
   - 변경 없음 → "올릴 내용이 없습니다." 안내 후 종료
   - `.env`, `credentials.*`, 키 파일 등 민감 파일 포함 → 사용자에게 경고하고 확인
3. 변경 성격(추가/수정/삭제)을 요약해 커밋 메시지 초안 작성
   - 형식: `<type>: <한 줄 요약>` (한국어, 본문은 "왜"를 짧게)
   - type: `docs`, `chore`, `feat`, `fix`, `refactor` 등
4. `git add <지정 파일>` (절대 `git add -A` / `git add .` 금지 — 민감파일 유입 방지)
5. HEREDOC으로 메시지 전달해 `git commit` (커밋 메시지 말미에 현행 하네스 규칙의 Co-Authored-By 라인 포함)
6. `git push origin <현재 브랜치>` 실행
   - push 시 `.githooks/pre-push` 가 **자동으로 설정된 webhook 채널에 Slack 알림** 발송 (커맨드에서 별도 호출 불필요)
   - hook 미설치 환경이면 `bash .githooks/install.sh` 안내
7. 결과 보고: 커밋 해시 · 푸시된 ref

## 금지

- `--no-verify`, `--amend`, `push --force` 자동 사용 금지 (사용자가 명시 요청 시에만)
- `main`/`master`에 force push 금지
- 사전 hook 실패 시 수정 후 **새 커밋** 생성 (amend 금지)

## 참조

- 사용자 전역 지침: 위험 행동 사전 확인, YAGNI, 요청 범위만
