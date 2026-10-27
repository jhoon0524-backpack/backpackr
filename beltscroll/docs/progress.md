# 진행 상황

## 현재 단계
2단계 — 룩 시안 3종 완료, **오너 선택 대기 중** (다음 단계로 가지 않음)

시안 PNG: `docs/look-candidates/look-a.png`, `look-b.png`, `look-c.png`
다시 찍기: `npm run snap -- look-a --frames=6,hit+1,hit+16 --labels="1 IDLE|2 HIT (3rd)|3 KNOCKBACK" --out=look-a`

## 막힌 것
없음 (오너 결정 대기)

## 다음 할 일
1. 오너가 A/B/C 중 하나를 고른다
2. 고른 PNG를 `data/_reference/look.png`로 저장, `docs/decisions.md`에 기록
3. 고르지 않은 시안 데이터(characters/effects/stages/scenes의 look-*, a-*, b-*, c-*) 정리
4. 3a단계 — 손맛 먼저 검증

## 메모
- 1단계 지시서의 `git init`은 하지 않았다. 이 폴더는 이미 backpackr 저장소 안에 있어서 중첩 저장소를 만들면 커밋이 꼬인다.
- `npx playwright install chromium`도 이 클라우드 환경에서는 실행하지 않았다. 브라우저가 이미 설치돼 있다. 오너 PC에서 snap을 돌리려면 한 번 실행해야 한다.
- 장면 스크립트(정해진 입력 순서)는 `data/scenes/`에 둔다. CLAUDE.md 폴더 구조에 없던 폴더를 하나 추가한 것이다.
- 팔레트 검사: 두세 색이 만나는 가장자리의 섞인 색은 안티에일리어싱으로 보고 허용한다.
