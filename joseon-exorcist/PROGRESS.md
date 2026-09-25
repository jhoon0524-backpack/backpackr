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
- 위쪽 줄 — 턴 N/10 · 날씨 아이콘+이름 · 공적 N, render() 마다 갱신
- 유닛 선택과 이동 — ui.step(none/move/menu), 파란 칸 표시, 다른 아군 탭 시 선택 전환, 파란 칸 밖 탭 시 해제. click 하나로 터치·클릭 처리(touch-action: manipulation). 헤드리스 크롬 탭으로 여울 → 약수터 이동 확인
- 행동 메뉴 — 공격/스킬(스킬명·기력 표시)/대기/취소, canAttack·canSkill 로 비활성, 행동 끝난 아군 회색. 공격·스킬 버튼은 ui.step='target' 으로만 넘김(대상 표시는 다음 작업)
- 대상 고르기 — 빨간(공격)/초록(생명수) 칸, 공격 스킬 대상 위 유리!/불리 태그, 대상 밖 탭 시 메뉴로 복귀, 피해(빨강)·회복(초록) 숫자 0.9초 떠올랐다 사라짐. [hidden] 이 .btns 의 display:flex 에 덮이던 버그 수정. 헤드리스 크롬으로 공격 −6·생명수 +0 확인
- 정보창 — 이모지·이름(+객장)·소속·칭호·HP·기력(요괴 —)·속성. 유닛 탭 시 표시(요괴는 정보만, 이동 중엔 선택 유지), 빈 칸 탭 시 닫힘, 이동 후엔 움직인 유닛 정보
- 턴 종료와 요괴 페이즈 연출 — [턴 종료] 버튼, 전원 행동 시 0.5초 뒤 자동 종료, 요괴 0.5초 간격(행동 없는 요괴는 건너뜀)·행동 중 보라 빛, 그동안 입력 잠금, 날씨 바뀌면 위쪽 줄 반짝임. 헤드리스 크롬으로 2·3턴 진행과 유리!/불리 태그 확인
- 대사 장면 — 초상화(이모지)+말풍선 카드, 화면 어디든 탭하면 다음 줄, 대사 중 맵 입력 잠금, 시작 대사 5줄 뒤 전투 시작. playScene 은 { pause, run } 으로 연출 대기도 받는다(승리 후 달래 연출용)
- 승리 후 대사와 승패 화면 — 승리 시 달래 대사 → (달래 생존 시) 1.6초 사라짐 연출 → 윤무겸·한결 대사 → 승리 화면(공적 N/8), 패배 시 바로 패배 문구, [다시하기]로 새 전투·시작 대사부터. 헤드리스 크롬으로 승리(공적 3·0)·패배(10턴)·다시하기 확인, 360/320/1280 폭에서 가로 넘침 없음
- [v0.2] 스테이지 데이터 분리 — Core.STAGES.ch1·ALLY_DEFS·ENEMY_TYPES, newBattle(stage), 지형 함수는 (state, r, c), 화면은 state.rows/cols 로 격자. 기존 테스트는 호출 모양만 바꿔 통과, tests/stage.test.mjs 추가(6×7 맵으로 한 판). 브라우저 승리·패배·다시하기 흐름 동일 확인
- [v0.2] 이동 경로 — Core.pathTo(state, unit, r, c), 요괴 move 이벤트에 path. tests/path.test.mjs, enemy-ai 이동 이벤트 검사에 길 추가
- [v0.2] 이동 미끄러짐과 요괴 발자국 — slide(유령 타일이 칸당 0.08초), 요괴 지나간 칸 보라 점 0.6초, 미끄러지는 동안 입력 잠금, 동작 줄이기 설정이면 생략. 브라우저로 여울 이동 중간 위치·요괴 차례 발자국·유령 잔여 0 확인
- [v0.2] 피격 연출 — damage 이벤트에 mult(스킬 상성 배율, 기본공격 1), 맞은 유닛 번쩍·흔들림 0.35초, 유리 숫자 크게+'유리!'·불리 숫자 작게. 브라우저로 한결 파사궁→장산범 -15 유리 확인
- [v0.2] 쓰러짐 연출 — 격파·퇴각 유닛을 render 전에 복제해 0.4초 흐려지며 사라짐, 동작 줄이기 설정이면 즉시(흔들림·번쩍 포함). 브라우저로 불가사리 격파 시 흐려짐·잔여 0 확인
- [v0.2] 스테이지 검사와 맵 코드 — Core.validateStage(error/warn, 칸 위치), encodeStage(한 줄 JSON), decodeStage(잘못된 코드 거부+이유), 경고 문구 조사 자동(이/가, 과/와). tests/stage-code.test.mjs
- [v0.2] 편집 규칙 — Core.paintStage(지형·아군 1명씩 옮기기·흑린 1마리·초가집 위 금지·지우개, 원본 불변, 순서 정렬)·resizeStage(6~12×6~10, 밖 유닛 삭제). tests/stage-edit.test.mjs
- [v0.2] 에디터 화면 — <script id="editor">, #editor·[🛠 맵 에디터] 진입, [게임으로] 복귀, 맵 이름, 행·열 −/+ (6~12×6~10), 칸 정사각형 유지. 대사·결과 화면을 #app 안으로 옮겨 에디터에서 함께 숨김. 브라우저로 진입·10×7 변경·복귀·#editor 직접 열기 확인
- [v0.2] 도구 줄과 칠하기 — 지형 4(색 견본)·아군 5·요괴 4·지우개, 선택 도구 이름 표시, pointer 이벤트로 지형 끌어 칠하기(터치 포인터 붙잡힘 해제), 유닛은 누른 칸만, validateStage 경고 목록+문제 칸 노란 테두리. 브라우저 마우스로 끌어 칠하기·흑린 이동·초가집 위 배치 거부·지우개·경고 확인
- [v0.2] 코드 복사·붙여넣기 — 코드 칸(항상 현재 맵 코드), [코드 복사](clipboard, 막히면 전체 선택+안내), [코드 붙여넣기]→[불러오기]/[그만두기], 잘못된 코드는 지금 맵 유지+이유. 브라우저로 복사 내용·막힘 대비·잘못된 코드·정상 코드 확인
- [v0.2] 브라우저 저장 — localStorage 'joseon-exorcist.maps'(이름→맵 코드), 맵 이름으로 저장·덮어쓰기, 목록 불러오기, 삭제는 두 번 눌러 확인(3초), 저장소 막히면 안내. 브라우저로 저장·새로고침 유지·불러오기·삭제·저장 막힘 확인
- [v0.3] 보스 일반화 — 승패는 boss 플래그 기준(원래도 그랬음, 주석·문구 정리), 에디터 경고 '보스(흑린·달래)', Core.maxMerit(stage) = 보스 아닌 적 수 + 3
- [v0.3] 2장 유닛 정의 — ALLY_DEFS.gwangun(에디터 목록 제외), ENEMY_TYPES munyeo·dokkaebi_p·jangsan_p·dallae_boss(보스, 생명수, 기력), 적 소속·칭호를 정의표에서. 스킬 없는 유닛은 canSkill/useSkill 불가. 화면 스킬 버튼이 관군에서 'null' 로 보일 것 — 2장 유닛 표시 작업에서 처리
- [v0.3] 2장 임시 스테이지 — Core.STAGES.ch2(10×8, maxTurn 12, 무녀2·정화 도깨비2·정화 장산범1·달래), 맵 코드에 maxTurn 유지·검사(1~30). tests/ch2-stage.test.mjs
- [v0.3] 품계와 관군 — Core.RANKS·rankFor, newBattle(stage, { merit }) → state.rank, 윤무겸 칭호 앞 품계, 관군 0~2명(reserveCells: 윤무겸에서 가까운 빈 칸 BFS, 아군 목록 끝). tests/rank.test.mjs
- [v0.3] 적 기력 — endAllyPhase(요괴 페이즈 시작)에서 기력 있는 적 +1 (2턴부터, 최대 10). tests/turn.test.mjs
- [v0.3] 무녀 AI — 유닛 ai 필드(hold/archer/flee), archer 는 공격 칸을 가장 가까운 아군과 먼 칸부터(= 거리 2), 칠 수 없으면 1장 접근
- [v0.3] 달래 AI — fleeAct: 기력 4↑·HP 절반 이하 동료(자기 포함, HP 비율 순) → 거리 2 안 먼 칸에서 생명수, 아니면 가장 먼 칸으로 도망, 공격 안 함. 무녀·달래 함께 tests/ch2-ai.test.mjs (한 커밋)
- [v0.3] 진행 계산 — Core.CAMPAIGN·newProgress·applyResult(이긴 장만, 한 번만 누계)·nextStage(모두 깨면 null)·checkProgress(저장 값 검사). tests/progress.test.mjs

## 다음에 진행할 작업
- [v0.3 규칙] 2장 끝까지 돌려보기

## 확인하지 못한 것
여기가 이 문서에서 가장 중요하다.
확인 안 한 것을 완료로 적으면 다음 세션이 그 위에 쌓는다.
- 밸런스 — 사람이 해 본 적은 없다. 참고로 단순 자동 플레이어(tests/sim.mjs, 가장 센 공격만 고름)로
  날씨 200가지를 돌리면 **200판 모두 8턴에 승리, 공적 6/8, 여울·소운·달래 3명 퇴각**으로 똑같이 끝난다.
  날씨가 결과를 한 번도 바꾸지 못했다. 퇴각 시점은 소운 4턴·달래 5턴·여울 7턴 요괴 페이즈라,
  날씨가 처음 바뀌는 4턴에 화 스킬을 쓸 기회가 한 번뿐이다 (seed 1 기준으로 확인).
  "이길 수는 있다"는 뜻이지, 재미·난이도가 적절한지는 아니다
- 2026-09-25 기획자가 게시 링크로 직접 플레이 → "일단 OK". 위 세부 화면 항목별 의견과 난이도 판단은 아직 받지 않았다

## 사람이 확인할 것 (화면)
화면 작업이 끝날 때마다 여기에 눌러 볼 것을 적는다. 사람이 확인하면 줄을 지운다.
- [맵] 폰 세로 화면에서 8×8 맵이 스크롤 없이 다 보이는가. 이모지가 폰 기종에 따라 깨지지 않는가
- [맵] 초가집·바위 칸이 흙길과 구분되는가 (둘 다 어두운 색)
- [요괴 차례] 0.5초 간격이 너무 느리거나 빠르지 않은가. 누가 행동 중인지 보이는가
- [대사] 말풍선 글씨가 폰에서 읽기 편한가. 어디를 눌러도 넘어가는 게 불편하지 않은가
- [승리] 달래가 사라지는 연출(1.6초)이 의도대로 보이는가
- [대상] 피해 숫자가 폰에서 읽을 만한 크기·속도인가
- [이동] 폰에서 탭 한 번에 선택되는가 (두 번 탭 확대가 끼어들지 않는가). PC 마우스 클릭도 되는가

- [연출] 이동 미끄러짐(칸당 0.08초)이 답답하거나 빠르지 않은가. 요괴 발자국 점이 보이는가
- [에디터] 폰에서 손가락으로 끌어 지형을 칠할 수 있는가 (브라우저 자동 조작은 마우스로만 확인했다)

## 알고 있는 문제
- 행동 메뉴가 뜨면 [턴 종료] 버튼이 아래로 밀린다 (정보창·메뉴가 생겼다 사라짐). 동작에는 문제 없음

## 다음 사람이 헷갈릴 만한 것
- 규칙은 `<script id="core">` 에만 둔다. 화면 스크립트에서 피해·이동을 따로 계산하지 않는다 (`ADR.md` 1번)
- 이 폴더는 `backpackr` 저장소 안의 하위 폴더다. 커밋은 저장소 전체에 쌓이지만 이 폴더 밖은 건드리지 않는다
