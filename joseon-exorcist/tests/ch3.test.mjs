// 3장 서낭고개 (specs/chapter3.md)
import test from 'node:test';
import assert from 'node:assert/strict';
import { Core, playBattle } from './sim.mjs';

const ch3 = Core.STAGES.ch3;
const fresh = () => Core.newBattle(ch3, { merit: 0 });
const put = (s, id, r, c) => { const u = Core.getUnit(s, id); u.r = r; u.c = c; return u; };
const clearWraiths = (s) => s.units.filter((u) => u.type === 'wongwi').forEach((u) => { u.alive = false; });

test('3장 스테이지: 10×8·15턴, 달래 없음, 서낭신 1(중립)·원귀 4, 에디터 검사 오류 없음', () => {
  assert.deepEqual([ch3.rows, ch3.cols, ch3.maxTurn], [10, 8, 15]);
  assert.equal(Core.validateStage(ch3).filter((p) => p.level === 'error').length, 0);
  const s = fresh();
  assert.deepEqual(Core.livingUnits(s, 'ally').map((u) => u.id), ['yoon', 'hangyeol', 'yeoul', 'soun']);
  assert.deepEqual(Core.livingUnits(s, 'neutral').map((u) => [u.id, u.entityType]), [['seonang', 'SINRYEONG']]);
  assert.equal(Core.livingUnits(s, 'enemy').filter((u) => u.type === 'wongwi' && u.entityType === 'WONGWI').length, 4);
  const w = Core.getUnit(s, 'wongwi1');
  assert.deepEqual([w.maxHp, w.atk, w.def, w.mov, w.rng], [16, 8, 3, 3, 1]);
  assert.equal(Core.getUnit(s, 'seonang').maxHp, 35);
  assert.equal(Core.maxMerit(ch3), 6, '봉인 3 + 임무 완료 3');
  assert.deepEqual(s.objective.phase, 'investigate');
});

test('아군은 서낭신을 공격할 수 있다 (막지 않는다), 서낭신은 적 차례 맨 앞', () => {
  const s = fresh();
  const g = Core.getUnit(s, 'seonang');
  put(s, 'yoon', g.r + 1, g.c);
  assert.ok(Core.attackTargets(s, Core.getUnit(s, 'yoon')).includes(g));
  s.phase = 'enemy';
  assert.equal(Core.enemyOrder(s)[0], 'seonang');
});

test('조사: 도착하면 자동, 같은 곳은 한 번, 2곳째에 진실 → 봉인 단계', () => {
  const s = fresh();
  clearWraiths(s);
  put(s, 'yoon', 4, 4); // 돌무덤
  let ev = Core.arrive(s, 'yoon');
  assert.deepEqual(ev, [{ type: 'investigate', pointId: 'dolmudeom', unitId: 'yoon' }]);
  assert.deepEqual(Core.arrive(s, 'yoon'), [], '같은 곳은 다시 조사하지 않는다');
  assert.equal(Core.getUnit(s, 'yoon').acted, false, '조사는 행동을 쓰지 않는다');
  put(s, 'hangyeol', 5, 3); // 지점 아님
  assert.deepEqual(Core.arrive(s, 'hangyeol'), []);
  put(s, 'hangyeol', 2, 1); // 금줄
  ev = Core.arrive(s, 'hangyeol');
  assert.deepEqual(ev.map((e) => e.type), ['investigate', 'truth']);
  assert.deepEqual([s.objective.phase, s.objective.changedTurn], ['seal', 1]);
  put(s, 'yeoul', 2, 6);
  assert.deepEqual(Core.arrive(s, 'yeoul'), [], '진실 뒤에는 조사하지 않는다');
});

test('봉인 복구: 진실 전에는 못 하고, 뒤에는 +1 씩, 세 곳이면 +3 과 즉시 승리 (적을 다 쓰러뜨리지 않아도)', () => {
  const s = fresh();
  const yoon = put(s, 'yoon', 2, 1);
  assert.equal(Core.repairablePoint(s, yoon), null, '조사 단계');
  s.objective.phase = 'seal';
  assert.equal(Core.repairablePoint(s, yoon).id, 'geumjul');
  let ev = Core.repairSeal(s, 'yoon');
  assert.deepEqual(ev, [{ type: 'seal', pointId: 'geumjul', unitId: 'yoon', merit: 1 }]);
  assert.equal(yoon.acted, true, '복구하면 그 유닛 행동 끝');
  assert.equal(Core.repairSeal(s, 'yoon'), null);
  put(s, 'soun', 2, 6); // 객장이 복구해도 공적
  Core.repairSeal(s, 'soun');
  put(s, 'hangyeol', 7, 4);
  ev = Core.repairSeal(s, 'hangyeol');
  assert.deepEqual(ev.map((e) => e.type), ['seal', 'objective', 'result']);
  assert.deepEqual([s.result, s.merit], ['win', 6]);
  assert.ok(Core.livingUnits(s, 'enemy').length > 0, '원귀가 남아 있어도 이긴다');
});

test('원귀: 벽사청이 쓰러뜨려도 공적 0 "원귀를 물리쳤다", 2턴 뒤 적 차례 시작에 돌무덤에서 HP 가득 재등장', () => {
  const s = fresh();
  const w = Core.getUnit(s, 'wongwi1');
  put(s, 'yoon', w.r + 1, w.c);
  w.hp = 1;
  const ev = Core.attack(s, 'yoon', 'wongwi1').find((e) => e.type === 'defeat');
  assert.deepEqual([s.merit, ev.merit], [0, 0]);
  assert.deepEqual(Core.defeatMessage(s, ev), { line: '원귀를 물리쳤다.', merit: '공적 없음' });
  assert.equal(w.respawnTurn, 3);
  // 1턴 적 차례: 아직
  Core.endAllyPhase(s);
  assert.equal(w.alive, false);
  Core.endEnemyPhase(s); // 2턴
  s.phase = 'ally';
  assert.deepEqual(Core.endAllyPhase(s).filter((e) => e.type === 'respawn'), []);
  Core.endEnemyPhase(s); // 3턴
  const back = Core.endAllyPhase(s).filter((e) => e.type === 'respawn');
  assert.equal(back.length, 1);
  assert.deepEqual([w.alive, w.hp, w.r, w.c], [true, 16, 4, 4], '돌무덤 (4,4)');
});

test('원한 지점이 차 있으면 가까운 빈 칸에서 재등장', () => {
  const s = fresh();
  const w = Core.getUnit(s, 'wongwi1');
  w.alive = false; w.respawnTurn = 1;
  put(s, 'yoon', 4, 4);
  const ev = Core.endAllyPhase(s).find((e) => e.type === 'respawn');
  assert.deepEqual([ev.r, ev.c], [5, 4], '위(3,4)는 바위라 아래 칸');
});

test('아군이 서낭신을 쓰러뜨리면 패배가 아니다 — 봉인이 약해져 원귀가 1턴 만에 돌아온다', () => {
  const s = fresh();
  const g = Core.getUnit(s, 'seonang');
  put(s, 'yoon', g.r + 1, g.c);
  g.hp = 1;
  const ev = Core.attack(s, 'yoon', 'seonang');
  assert.deepEqual(ev.filter((e) => e.type !== 'damage').map((e) => e.type), ['defeat', 'weakened']);
  assert.deepEqual([s.result, s.objective.weakened, s.merit], [null, true, 0]);
  const w = Core.getUnit(s, 'wongwi2');
  put(s, 'hangyeol', w.r + 1, w.c); w.hp = 1;
  Core.attack(s, 'hangyeol', 'wongwi2');
  assert.equal(w.respawnTurn, 2);
});

test('원귀가 서낭신을 쓰러뜨리면 패배 "guardian"', () => {
  const s = fresh();
  const g = Core.getUnit(s, 'seonang');
  clearWraiths(s);
  const w = Core.getUnit(s, 'wongwi1');
  w.alive = true; w.r = g.r; w.c = g.c - 1;
  g.hp = 1;
  s.phase = 'enemy';
  const ev = Core.enemyAct(s, 'wongwi1');
  assert.deepEqual([s.result, s.loseReason], ['lose', 'guardian']);
  assert.ok(ev.some((e) => e.type === 'result' && e.reason === 'guardian'));
});

test('15턴이 끝나면 패배 "time", 전원 퇴각은 "wipe"', () => {
  const s = fresh();
  s.turn = 15; s.phase = 'enemy';
  Core.endEnemyPhase(s);
  assert.deepEqual([s.result, s.loseReason], ['lose', 'time']);
  const s2 = fresh();
  Core.getUnit(s2, 'seonang').alive = false; // 원귀가 서낭신보다 아군을 치게
  Core.livingUnits(s2, 'ally').forEach((u) => { if (u.id !== 'yoon') u.alive = false; });
  const w = Core.getUnit(s2, 'wongwi1');
  put(s2, 'yoon', w.r + 1, w.c).hp = 1;
  s2.phase = 'enemy';
  Core.enemyAct(s2, 'wongwi1');
  assert.deepEqual([s2.result, s2.loseReason], ['lose', 'wipe']);
});

test('금역: 거리 2 안의 원귀 하나만, 서낭신에게서 먼 쪽으로 한 칸 (피해 없음)', () => {
  const s = fresh();
  clearWraiths(s);
  const g = Core.getUnit(s, 'seonang'); // (1,4)
  const a = Core.getUnit(s, 'wongwi1'); a.alive = true; a.r = 2; a.c = 3; // 대각선 아래 (아래 (3,3)은 바위라 옆으로)
  const b = Core.getUnit(s, 'wongwi2'); b.alive = true; b.r = 1; b.c = 6; // 거리 2
  s.phase = 'enemy';
  const ev = Core.enemyAct(s, 'seonang');
  assert.deepEqual(ev, [{ type: 'push', attackerId: 'seonang', targetId: 'wongwi1', from: { r: 2, c: 3 }, to: { r: 2, c: 2 }, name: '금역' }]);
  assert.deepEqual([b.r, b.c, a.hp], [1, 6, 16], '하나만, 피해 없음');
  assert.deepEqual([g.r, g.c], [1, 4], '서낭신은 움직이지 않는다');
});

test('원귀 AI: 조사 단계엔 서낭신을 노리고, 봉인 단계엔 복구 안 된 봉인 칸으로 가서 머문다', () => {
  const s = fresh();
  clearWraiths(s);
  const w = Core.getUnit(s, 'wongwi1'); w.alive = true; w.r = 1; w.c = 2;
  s.phase = 'enemy';
  const ev = Core.enemyAct(s, 'wongwi1');
  assert.ok(ev.some((e) => e.type === 'damage' && e.targetId === 'seonang'), '서낭신을 친다 (아군보다 먼저)');
  const s2 = fresh();
  clearWraiths(s2);
  s2.objective.phase = 'seal';
  const w2 = Core.getUnit(s2, 'wongwi1'); w2.alive = true; w2.r = 4; w2.c = 0; // (4,0)→(3,0)→(2,0)→(2,1)
  s2.phase = 'enemy';
  Core.enemyAct(s2, 'wongwi1');
  assert.deepEqual([w2.r, w2.c], [2, 1], '3칸 안의 금줄 봉인 칸으로');
  Core.enemyAct(s2, 'wongwi1');
  assert.deepEqual([w2.r, w2.c], [2, 1], '봉인 칸에 머문다');
  put(s2, 'yoon', 2, 0);
  assert.equal(Core.repairablePoint(s2, Core.getUnit(s2, 'yoon')), null, '원귀가 선 봉인 칸은 복구할 수 없다');
});

test('월드맵: 2장 뒤 서낭고개 [조사한다], 3장 뒤 안정됨·폐사찰 이상 징후·급보 둘', () => {
  const after2 = { v: 1, cleared: ['ch1', 'ch2'], merit: 7 };
  const after3 = { v: 1, cleared: ['ch1', 'ch2', 'ch3'], merit: 13 };
  assert.equal(Core.sortieChapter({ v: 1, cleared: ['ch1'], merit: 3 }, 'seonang'), null, '2장 전에는 조사 준비 중');
  assert.equal(Core.sortieChapter(after2, 'seonang'), 'ch3');
  assert.equal(Core.regionById('seonang').action, '조사한다');
  assert.match(Core.worldNews(after2, [])[0].text, /금줄도 사흘째 끊어진 채/);
  const w = Core.worldState(after3);
  assert.deepEqual([w.seonang, w.pyesachal], ['STABILIZED', 'OMEN']);
  assert.deepEqual(Core.worldNews(after3, []).map((n) => n.region), ['seonang', 'pyesachal']);
  assert.equal(Core.regionNote(Core.regionById('pyesachal'), 'OMEN'), '조사 준비 중');
  assert.equal(Core.sortieChapter(after3, 'pyesachal'), null, '4장 전투는 없다');
});

test('벽사록: 3장 시작에 서낭당·서낭신·원귀, 금줄은 금줄 지점에서', () => {
  const on = (seen) => Core.LORE.filter((e) => Core.loreUnlocked(e, seen)).map((e) => e.id);
  const start = Core.loreTokensForBattle(fresh(), 'ch3');
  for (const id of ['seonangdang', 'seonangsin', 'wongwi']) assert.ok(on(start).includes(id), id);
  assert.equal(on(start).includes('geumjul'), false);
  assert.ok(on(['point:geumjul']).includes('geumjul'));
});

test('플레이 기록: 조사·복구·원귀 물리침·재등장·서낭신 피해·목표 바뀐 턴', () => {
  const s = playBattle({ seed: 1, mode: 'objective', stage: ch3, merit: 0, chapter: 'ch3' });
  const l = s.log;
  assert.equal(l.investigations.length, 2);
  assert.equal(l.sealRepairs.length, 3);
  assert.equal(typeof l.objectiveChangedTurn, 'number');
  assert.equal(l.wongwiDefeated, l.defeatedUnits.filter((d) => d.how === '물리침').length);
  assert.ok(l.wongwiRespawns <= l.wongwiDefeated);
  assert.equal(l.seonangDamageTaken, l.damageTaken.seonang || 0);
  assert.equal(l.meritEarned, 6);
});

// 기획서 40장: 섬멸형은 이기기 어렵고 목표형은 이긴다 — 이 차이가 3장 기믹이다
test('시뮬레이션: 섬멸형은 15턴 안에 못 이기고, 목표형은 이긴다 (품계 3가지 × 5판)', () => {
  for (const merit of [0, 3, 6]) {
    for (let seed = 1; seed <= 5; seed++) {
      const a = playBattle({ seed, mode: 'nearest', stage: ch3, merit, chapter: 'ch3' });
      const b = playBattle({ seed, mode: 'objective', stage: ch3, merit, chapter: 'ch3' });
      assert.equal(a.result, 'lose', `섬멸형 merit ${merit} seed ${seed}`);
      assert.equal(b.result, 'win', `목표형 merit ${merit} seed ${seed}`);
    }
  }
});
