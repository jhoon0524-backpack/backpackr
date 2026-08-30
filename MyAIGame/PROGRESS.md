# 현재 진행 상황 (Handover Log)

## 최근 완료한 작업
- 프로젝트 초기 세팅 완료
- GAME_SPEC.md 기획서 작성 완료
- 기획서를 바탕으로 TASKS.md 작업 목록 60개 생성 완료
- [기반] 프로젝트 설정 파일을 텍스트로 작성 (project.godot, .gitignore, 폴더 구조, Main.tscn)
- [몬스터/시스템] 전투 규칙 코어 작성
  - `scripts/battle_rules.gd` — 속성 상성표, 데미지 계산, 영입 성공률
  - `scripts/idi_data.gd`, `scripts/move_data.gd` — 리소스 정의
  - `data/idis/` 아이디 3종, `data/moves/` 기술 4종

## 다음에 진행할 작업
- [기반] Godot으로 프로젝트를 열어 설정이 정상 적용됐는지 확인 (사용자 PC 필요)

## 버그 및 주의사항
- **아직 어떤 항목도 체크하지 않았다.** Godot 실행 검증을 못 한 상태다.
  에디터로 한 번 열어 확인한 뒤 체크할 것.
- 에디터를 처음 열면 확인할 것
  1. Project Settings > Input Map 에 6개 액션이 보이는가
  2. Project Settings > Display > Window 해상도가 640x360 인가
  3. `data/` 의 .tres 7개가 에러 없이 열리는가
  4. F5로 실행했을 때 에러 없이 빈 화면이 뜨는가
- **아이디의 `moves` 배열은 비어 있다.** 타입 배열을 .tres 에 손으로 적으면
  깨질 위험이 있어 비워 뒀다. 에디터에서 각 아이디에 기술을 끌어다 넣을 것.
- `evolves_into` 도 비어 있다. 진화형 3종은 아직 만들지 않았다.
- 전투 계산식은 파이썬으로 옮겨 검증했다. 아이디 3종 기준 2~7턴에 전투가 끝난다.
- 스프라이트, 효과음 등 바이너리 에셋은 원격 작업 환경에서 만들 수 없다.
