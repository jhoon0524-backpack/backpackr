# v0.5 플레이테스트·전술 검증

기획자의 「조선 퇴마전 v0.5 — 플레이테스트·전술 검증」(2026-09-26)을 옮긴 것이다. **(보충)** 은 원문에 없던 것을 정한 곳.
목적: 1·2장을 처음 하는 사람이 이해하고, 고민하고, 재미를 느끼는지 **측정**한다. 해결책부터 넣지 않는다.

## 금지
3장, 새 캐릭터·아이템·요괴·성장·상태이상, 대규모 UI 리뉴얼, 적 능력치 상향, 스토리 추가, 사운드.
밸런스 수정은 처음 하는 사람 3명의 기록을 받은 뒤 (치명적 버그만 즉시 수정).

## 1. 플레이 로그 (core: `Core.newPlayLog` / `logMove` / `logEvents` / `finishPlayLog`)
- 모든 전투에서 **항상** 기록한다 (화면에는 안 보임). 보는 곳은 `?dev=1` 의 [🧪 플레이 기록]뿐
- **(보충)** 그래서 테스트하는 사람은 일반 주소로 플레이하고, 끝난 뒤 같은 폰·같은 브라우저에서 `?dev=1` 을 열어 기록을 복사한다
- 저장: localStorage `joseon-exorcist.playlog` = `{ v: 1, battles: [...최근 100판], restarts: { 장: 횟수 } }`. 서버·계정 없음
- 전투가 끝났을 때(승리·패배)만 한 판으로 저장한다. **(보충)** 도중에 새로고침하거나 첫 화면으로 나간 판은 남지 않는다
- 한 판의 필드

| 필드 | 뜻 |
|---|---|
| chapter / result / totalTurns | 'ch1'·'ch2' / 'win'·'lose' / 끝난 턴 |
| rank / soldierCount | 전투 시작 때 품계 / 관군 수 |
| unitMoves | 유닛 id → 실제로 칸을 옮긴 횟수 (아군은 행동을 마친 이동만, 취소는 안 셈. 적 포함) |
| attacks / skillsByUnit | 유닛 id → 기본공격 수 / 스킬 수 (적의 무령은 기본공격) |
| skills | 스킬 이름 → 사용 수 (정화수 포함, 아군·적 모두) |
| damageDealt / damageTaken | 유닛 id → 준 피해 / 받은 피해 합 |
| healing | 유닛 id → 정화수로 채운 HP 합. **(보충)** 약수터 회복은 `springHealing`(유닛 id → 합)에 따로 |
| defeatedUnits | [{ turn, id, name, side, how: 제압·퇴치·퇴각, by, merit }] |
| meritEarned | 이번 판에 얻은 공적 |
| dalraeHealCount | 2장 달래(보스)의 정화수 횟수 |
| dalraeEscapeDistance | 끝났을 때 달래 → 탈출로 실제 칸 수 (길이 막혔으면 null, 달래가 없으면 null) |
| dalraeTrail | **(보충)** [{ turn, r, c, dist }] 달래 위치·탈출로 거리가 바뀔 때마다 (H1) |
| moves / hits / heals | **(보충)** 순서대로의 원자료: 이동 [{turn,id,from,to}], 피해 [{turn,by,target,amount,name,skill}], 회복 [{turn,by,target,amount}] |
| healFollowUps | **(보충)** 회복마다 { target, turn, attackedAgain(그 뒤 아군이 그 대상을 쳤나), survivedTurns(회복 뒤 쓰러질 때까지 턴, 끝까지 살았으면 끝난 턴까지), defeated } (H3) |
| restartCount | 이 장을 [다시하기]한 횟수 (그 장을 이기면 0 으로) |
| names | 유닛 id → 이름 (분석용) |

## 2. 개발자 화면 `?dev=1`
- 첫 화면·전투 화면에 [🧪 플레이 기록]. 판마다 요약(장·결과·턴·품계, 유닛별 이동·공격·스킬·준/받은 피해, 달래 정화수·탈출로 거리, 제압·퇴치·퇴각 수, 공적, 다시하기)
- [JSON 복사] (복사가 막히면 글상자를 선택해 둔다), [기록 지우기] (다음 테스트 사람 전에)

## 3. 2장 가설 (index.html 2장 스테이지 주석·QA.md 에 고정)
- **H1 달래를 쫓는 느낌:** 모든 적을 치기보다 달래의 이동 방향과 탈출로를 의식하는가 — dalraeTrail, 아군 moves, 달래를 친 시점(hits), 승리 턴
- **H2 무녀 때문에 판단:** "달래를 쫓을까, 무녀부터 제압할까" — 무녀가 의미 없이 먼저 쓰러지거나 늘 무시되면 실패. defeatedUnits 순서, 무녀가 준 피해
- **H3 정화수가 전술을 바꾸나:** "지금 마무리하지 않으면 달래가 회복시킨다" — dalraeHealCount, heals 대상, healFollowUps
- **H4 품계가 전술을 바꾸나:** 관군 0/1/2 가 난이도만이 아니라 선택을 바꾸는가 — rank·soldierCount 별 moves·hits 비교

## 4. 2장 고정 시뮬레이션 (밸런스 이상 탐지용 — AI 승률로 재미를 판정하지 않는다)
- `node tests/sim-report.mjs` — 종9품(관군 0)·정9품(1)·종8품(2) × 자동 플레이 2종(달래 추격 / 가까운 적) × 100판
- 표: 승률, 평균 턴, 중앙 턴, 평균 아군 퇴각, 평균 달래 정화수, 달래 탈출 패배 수 / 그 밖 패배 수
- 자동 플레이도 같은 플레이 로그를 쓴다 (로그 계산 검증을 겸함)
