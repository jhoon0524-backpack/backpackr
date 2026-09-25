# 현재 진행 상황

## 최근 완료한 작업
- 2026-09-25 루프 설치. 기획서 v0.1 을 `SPEC.md` + `specs/battle.md` + `specs/screens.md` 로 옮기고
  `TASKS.md` 에 작업 24개를 만들었다. 코드는 아직 없다.
- 2026-09-25 **(보충)** 항목 8개를 기획자가 그대로 확정했다.
- index.html 뼈대와 tests/html.test.mjs (문법·외부 주소·core 로딩·core 에 document/window/Math.random 금지). 검사 명령을 `node --test` 로 바꿨다 (Node 22 는 폴더 경로 인자를 못 받음)
- 맵 데이터 — Core.MAP 과 terrainAt/isPassable/isShrine/isSpring, tests/map.test.mjs
- 유닛 데이터 — ALLIES/ENEMIES, Core.newBattle/getUnit/unitAt/livingUnits, tests/units.test.mjs
- 이동 가능 칸 계산 — Core.stepCosts(칸 수 지도, AI 에서도 씀)/moveTargets, tests/move.test.mjs
- 거리와 대상 찾기 — Core.distance/attackTargets/skillTargets(pos 로 미리 보기 가능), tests/targets.test.mjs
- 오행 상성 배율 — Core.elementMultiplier, tests/element.test.mjs
- 피해 계산 — Core.damage/weatherMultiplier/WEATHERS, 검산 예시 5개 + 날씨·반올림 테스트 (tests/damage.test.mjs)
- 행동 실행 — Core.moveUnit/cancelMove/attack/useSkill/wait/canAttack/canSkill. 행동 함수는 이벤트 배열을 돌려준다(화면 연출용), tests/actions.test.mjs
- HP 0 처리와 공적 — hit 안에서 knockOut: 요괴 defeat / 아군 retreat 이벤트, 벽사청 일격 +1·흑린 +3, tests/knockout.test.mjs
- 승패 판정 — updateResult(흑린 격파 즉시 승리·전원 퇴각 즉시 패배, phase 'over'), Core.endEnemyPhase(10턴 끝 패배/턴 +1), tests/result.test.mjs. 전원 퇴각 패배 테스트는 요괴 페이즈 작업으로 미룸
- 턴 진행 — Core.startAllyPhase(rng, 1턴 포함 매 턴 호출)/endAllyPhase/allActed, 약수터는 각자 페이즈 시작, tests/turn.test.mjs
- 일반 요괴 AI — Core.normalEnemyAct/approachMap. '가까움'은 공격 칸까지 실제 이동 칸 수, tests/enemy-ai.test.mjs (전원 퇴각 즉시 패배 포함)
- 흑린 AI — bossAct(이동 없음, 인접 HP 최저), Core.enemyAct(요괴 한 마리 행동, 화면이 0.5초 간격으로 부름), tests/boss-ai.test.mjs
- 요괴 페이즈 한 번 실행 — Core.enemyOrder/runEnemyPhase(도중 전원 퇴각 시 중단), tests/enemy-phase.test.mjs
- 전투 끝까지 돌려보기 — tests/sim.mjs(재현 가능한 랜덤 + 단순 자동 플레이어), tests/battle.test.mjs. 대기만 하면 10턴 패배, 자동 플레이어는 승리
- 맵 그리기 — 색칸 지형(🛖 초가집·바위, 🏮 서낭당, 💧 약수터), 유닛 이모지·세력 테두리·'객' 표시·HP 막대, 범례. 360×740 헤드리스 크롬에서 가로 넘침 없음·오류 0 확인

## 다음에 진행할 작업
- [화면] 위쪽 줄

## 확인하지 못한 것
여기가 이 문서에서 가장 중요하다.
확인 안 한 것을 완료로 적으면 다음 세션이 그 위에 쌓는다.
- 밸런스 — 사람이 해 본 적은 없다. 참고로 단순 자동 플레이어(tests/sim.mjs, 가장 센 공격만 고름)로
  날씨 200가지를 돌리면 **200판 모두 8턴에 승리, 공적 6/8, 여울·소운·달래 3명 퇴각**으로 똑같이 끝난다.
  날씨가 결과를 한 번도 바꾸지 못했다. 퇴각 시점은 소운 4턴·달래 5턴·여울 7턴 요괴 페이즈라,
  날씨가 처음 바뀌는 4턴에 화 스킬을 쓸 기회가 한 번뿐이다 (seed 1 기준으로 확인).
  "이길 수는 있다"는 뜻이지, 재미·난이도가 적절한지는 아니다

## 사람이 확인할 것 (화면)
화면 작업이 끝날 때마다 여기에 눌러 볼 것을 적는다. 사람이 확인하면 줄을 지운다.
- [맵] 폰 세로 화면에서 8×8 맵이 스크롤 없이 다 보이는가. 이모지가 폰 기종에 따라 깨지지 않는가
- [맵] 초가집·바위 칸이 흙길과 구분되는가 (둘 다 어두운 색)

## 알고 있는 문제
-

## 다음 사람이 헷갈릴 만한 것
- 규칙은 `<script id="core">` 에만 둔다. 화면 스크립트에서 피해·이동을 따로 계산하지 않는다 (`ADR.md` 1번)
- 이 폴더는 `backpackr` 저장소 안의 하위 폴더다. 커밋은 저장소 전체에 쌓이지만 이 폴더 밖은 건드리지 않는다
