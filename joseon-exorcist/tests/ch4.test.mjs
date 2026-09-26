// 4장 폐사찰의 등불 (specs/chapter4.md)
import test from 'node:test';
import assert from 'node:assert/strict';
import { Core, playBattle } from './sim.mjs';

const ch4 = Core.STAGES.ch4;
const fresh = (opts) => Core.newBattle(ch4, { merit: 0, ...opts });
const U = (s, id) => Core.getUnit(s, id);
const put = (s, id, r, c) => { const u = U(s, id); u.r = r; u.c = c; return u; };
const lamp = (s, id) => s.lamps.find((l) => l.id === id);
const clearEnemies = (s) => s.units.filter((u) => u.side === 'enemy').forEach((u) => { u.alive = false; });
// 조사 두 곳을 마쳐 봉인등 단계로
function toLamps(s) {
  put(s, 'yeoul', 3, 0); Core.arrive(s, 'yeoul');
  put(s, 'hangyeol', 4, 3); return Core.arrive(s, 'hangyeol');
}

test('4장 스테이지: 10×8·14턴, 봉인등 3 (북 켜짐·동 약해짐·서 꺼짐), 귀화 2·원귀 2, 에디터 검사 오류 없음', () => {
  assert.deepEqual([ch4.rows, ch4.cols, ch4.maxTurn], [10, 8, 14]);
  assert.equal(Core.validateStage(ch4).filter((p) => p.level === 'error').length, 0);
  const s = fresh();
  assert.deepEqual(s.lamps.map((l) => [l.id, l.lit, l.dim]), [['north', true, false], ['east', true, true], ['west', false, false]]);
  assert.equal(Core.livingUnits(s, 'enemy').filter((u) => u.type === 'gwihwa').length, 2);
  assert.equal(Core.livingUnits(s, 'enemy').filter((u) => u.type === 'wongwi_b').length, 2);
  const g = U(s, 'gwihwa1');
  assert.deepEqual([g.maxHp, g.atk, g.def, g.mov, g.rng], [12, 5, 2, 4, 1]);
  assert.equal(Core.maxMerit(ch4), 6, '등 3 + 임무 완료 3');
  assert.equal(s.objective.phase, 'investigate');
});

test('조사 두 곳 모두 → 진실: 도문 술사 등장, 귀화 증원 2 예고(징조), 봉인등 단계', () => {
  const s = fresh();
  put(s, 'yeoul', 3, 0);
  assert.deepEqual(Core.arrive(s, 'yeoul').map((e) => e.type), ['investigate'], '한 곳으로는 부족');
  const before = s.units.filter((u) => u.type === 'gwihwa').length;
  put(s, 'hangyeol', 4, 3);
  const ev = Core.arrive(s, 'hangyeol');
  assert.deepEqual(ev.map((e) => e.type), ['investigate', 'truth', 'appear', 'omen', 'omen']);
  assert.equal(s.objective.phase, 'lamps');
  const d = U(s, 'dosa');
  assert.deepEqual([d.side, d.name, d.untargetable], ['neutral', '도문 술사', true]);
  assert.equal(s.units.filter((u) => u.type === 'gwihwa').length, before, '진실 순간에는 아직 나오지 않는다');
  assert.deepEqual(s.omens, ['west', 'east']);
  const rv = Core.endAllyPhase(s).filter((e) => e.type === 'reinforce');
  assert.deepEqual(rv.map((e) => [e.spawnId, e.r, e.c]), [['west', 9, 0], ['east', 9, 7]], '이번 턴 적 차례 시작에 예고한 자리에서');
  assert.equal(s.units.filter((u) => u.type === 'gwihwa').length, before + 2);
  assert.deepEqual(s.omens, []);
});

test('v0.9.2 증원 자리: 서 → 동 → 북을 차례로, 같은 자리가 연달아 나오지 않고, 나오기 전 아군 차례에 징조', () => {
  const s = fresh();
  toLamps(s); // 1턴에 진실 → 서·동 예고
  const order = [];
  for (let t = 1; t <= 9 && !s.result; t++) {
    const pre = s.omens.slice();
    const rv = Core.endAllyPhase(s).filter((e) => e.type === 'reinforce');
    assert.deepEqual(rv.map((e) => e.spawnId), pre, t + '턴: 예고한 자리에서만 나온다');
    order.push(...pre);
    s.units.filter((u) => u.type === 'gwihwa').forEach((u) => { u.alive = false; }); // 등을 끄지 않게
    Core.runEnemyPhase(s);
    if (s.result) break;
    const sv = Core.startAllyPhase(s, () => 0).filter((e) => e.type === 'omen');
    assert.equal(sv.length, (s.turn - 1) % 2 === 0 ? 1 : 0, s.turn + '턴 시작: 2턴마다 예고 1');
  }
  assert.deepEqual(order.slice(0, 6), ['west', 'east', 'north', 'west', 'east', 'north']);
  for (let i = 1; i < order.length; i++) assert.notEqual(order[i], order[i - 1]);
});

test('v0.9.2 북쪽 뒷산: 막지 않으면 나오자마자 북쪽 등을 끄고, 출구 (0,6) 을 막으면 끄지 못한다', () => {
  for (const block of [false, true]) {
    const s = fresh();
    toLamps(s);
    s.units.filter((u) => u.side === 'enemy' && u.type !== 'dosa').forEach((u) => { u.alive = false; });
    U(s, 'dosa').r = 9; U(s, 'dosa').c = 3; // 도문 술사가 끼어들지 않게
    s.lamps.forEach((l) => { l.lit = true; });
    if (block) put(s, 'yoon', 0, 6);
    s.omens = ['north'];
    const g = Core.endAllyPhase(s).find((e) => e.type === 'reinforce');
    assert.deepEqual([g.r, g.c], [0, 7]);
    const ev = Core.enemyAct(s, g.unitId);
    assert.equal(lamp(s, 'north').lit, block, block ? '막으면 켜진 채' : '막지 않으면 꺼진다');
    if (block) assert.ok(ev.some((e) => e.targetId === 'yoon'), '막은 인물을 친다');
  }
});

test('v0.9.2 증원 자리가 막혀 있으면 가까운 빈 칸, 북쪽 뒷산은 (0,7)', () => {
  const s = fresh();
  toLamps(s);
  s.omens = ['north'];
  put(s, 'yoon', 0, 7);
  const rv = Core.endAllyPhase(s).filter((e) => e.type === 'reinforce');
  assert.deepEqual(rv.map((e) => [e.r, e.c]), [[0, 6]]);
  assert.deepEqual(s.spawns.map((p) => [p.id, p.name, p.r, p.c]),
    [['west', '서쪽 산길', 9, 0], ['east', '동쪽 회랑', 9, 7], ['north', '북쪽 뒷산', 0, 7]]);
});

test('도문 술사: 아무도 칠 수 없고, 옆의 적(귀화 먼저)을 친다', () => {
  const s = fresh();
  toLamps(s);
  const d = U(s, 'dosa');
  put(s, 'yoon', d.r + 1, d.c);
  assert.ok(!Core.attackTargets(s, U(s, 'yoon')).includes(d), '아군도 못 친다');
  const w = put(s, 'wongwi_b1', d.r, d.c - 1);
  const f = put(s, 'gwihwa1', d.r, d.c + 1);
  assert.ok(!Core.attackTargets(s, w).includes(d), '적도 못 친다');
  s.phase = 'enemy';
  const ev = Core.enemyAct(s, 'dosa');
  assert.equal(ev[0].targetId, f.id, '귀화 먼저');
  assert.equal(ev[0].merit, undefined);
  assert.equal(s.merit, 0, '공적 없음');
});

test('봉인등 밝히기: 봉인등 단계·꺼진 등 위에서만, 행동 끝, 등마다 처음 한 번 공적 +1', () => {
  const s = fresh();
  const y = put(s, 'yoon', 3, 0);
  assert.equal(Core.lightableLamp(s, y), null, '조사 단계에는 못 한다');
  toLamps(s);
  put(s, 'yoon', 3, 0);
  put(s, 'yeoul', 8, 0);
  const ev = Core.lightLamp(s, 'yoon');
  assert.deepEqual(ev.map((e) => e.type), ['lamp', 'lampsAll']);
  assert.deepEqual([lamp(s, 'west').lit, y.acted, s.merit], [true, true, 1]);
  assert.equal(Core.lightLamp(s, 'yoon'), null, '켜진 등은 다시 못 켠다');
  lamp(s, 'west').lit = false;
  y.acted = false;
  Core.lightLamp(s, 'yoon');
  assert.equal(s.merit, 1, '다시 켜도 공적은 처음 한 번');
});

test('벽사: 봉인등을 밝힌 뒤 1칸 재이동', () => {
  const s = fresh({ training: { yoon: 'byeoksa' } });
  toLamps(s);
  put(s, 'yeoul', 8, 0);
  const y = put(s, 'yoon', 3, 0);
  const ev = Core.lightLamp(s, 'yoon');
  assert.ok(ev.some((e) => e.type === 'training' && e.kind === 'byeoksa'));
  assert.equal(y.reMove, true);
});

test('귀화: 봉인등 칸 또는 상하좌우 옆 칸까지 이동한 뒤 같은 차례의 행동으로 끄고 사라진다 (이동 → 행동 → 소등)', () => {
  const s = fresh();
  clearEnemies(s);
  const g = put(s, 'gwihwa2', 7, 7); g.alive = true; // 동쪽 등(3,7) 옆 칸(4,7)까지 3칸
  s.phase = 'enemy';
  const ev = Core.enemyAct(s, 'gwihwa2');
  assert.deepEqual(ev.map((e) => e.type), ['move', 'extinguish'], '이동 뒤 같은 차례에 끈다');
  assert.deepEqual([ev[0].to.r, ev[0].to.c], [4, 7]);
  assert.deepEqual([lamp(s, 'east').lit, g.alive], [false, false], '끈 귀화는 사라진다');
  // 이미 닿아 있으면 움직이지 않고 끈다
  const s2 = fresh();
  clearEnemies(s2);
  const g2 = put(s2, 'gwihwa1', 4, 7); g2.alive = true;
  s2.phase = 'enemy';
  assert.deepEqual(Core.enemyAct(s2, 'gwihwa1').map((e) => e.type), ['extinguish']);
});

test('귀화: 밀려서 옆 칸에 와도(강제 이동) 그 자체로는 꺼지지 않는다', () => {
  const s = fresh({ training: { yeoul: 'gyoran' } });
  clearEnemies(s);
  const g = put(s, 'gwihwa1', 6, 7); g.alive = true; g.hp = g.maxHp = 99;
  put(s, 'yeoul', 7, 7); // 아래에서 위로 밀면 (5,7) — 등(3,7) 옆 칸은 아님
  Core.useSkill(s, 'yeoul', 'gwihwa1');
  assert.deepEqual([g.r, g.c], [5, 7]);
  g.r = 4; g.c = 7; // 옆 칸에 놓여도
  assert.equal(lamp(s, 'east').lit, true, '행동하기 전에는 켜져 있다');
});

test('귀화: 대각선은 닿은 것이 아니다. 등 위에 선 아군은 소등을 막지 못한다', () => {
  const s = fresh();
  clearEnemies(s);
  const g = put(s, 'gwihwa1', 4, 6); g.alive = true; // 동쪽 등(3,7)의 대각선
  assert.equal(Core.lampInReach(s, g), null, '대각선은 아니다');
  put(s, 'yoon', 3, 7); // 등 위에 선다
  g.r = 4; g.c = 7; // 등 바로 아래 칸
  s.phase = 'enemy';
  Core.enemyAct(s, 'gwihwa1');
  assert.equal(lamp(s, 'east').lit, false, '등 위의 윤무겸은 막지 못한다');
});

test('교란(기본공격): 등으로 가던 귀화를 밀어내면 이번 차례에 닿지 못한다 / 추적(기본공격): 늦추면 닿지 못한다', () => {
  const s = fresh({ training: { yeoul: 'gyoran' } });
  clearEnemies(s);
  const g = put(s, 'gwihwa1', 8, 7); g.alive = true; // 동쪽 등 옆 칸(4,7)까지 4칸 — 이동 4 로 닿는다
  put(s, 'yeoul', 7, 7); // 위에서 아래로 민다 — 기본공격(9)으로는 죽지 않는다
  Core.attack(s, 'yeoul', 'gwihwa1');
  assert.deepEqual([g.r, g.c], [9, 7], '기본공격으로도 밀린다');
  s.phase = 'enemy';
  Core.enemyAct(s, 'gwihwa1');
  assert.equal(lamp(s, 'east').lit, true, '5칸이 되어 이번 차례에는 못 끈다');
  const s2 = fresh({ training: { hangyeol: 'chujeok' } });
  clearEnemies(s2);
  const f = put(s2, 'gwihwa2', 8, 7); f.alive = true; // 동쪽 등 옆 칸(4,7)까지 4칸
  put(s2, 'hangyeol', 8, 5);
  Core.attack(s2, 'hangyeol', 'gwihwa2'); // 기본공격 8 — 살아남는다
  assert.equal(f.slow, true, '기본공격으로도 추적');
  s2.phase = 'enemy';
  Core.enemyAct(s2, 'gwihwa2');
  assert.equal(lamp(s2, 'east').lit, true, '이동 3 으로는 닿지 못한다');
});

test('봉인 유지: 세 등이 모두 켜진 채 적 차례를 2번 버티면 승리, 하나라도 꺼지면 0 으로', () => {
  const s = fresh();
  clearEnemies(s);
  toLamps(s);
  s.units.filter((u) => u.type === 'gwihwa').forEach((u) => { u.alive = false; });
  s.lamps.forEach((l) => { l.lit = true; });
  Core.endAllyPhase(s);
  s.units.filter((u) => u.type === 'gwihwa').forEach((u) => { u.alive = false; }); // 증원도 치운다
  let ev = Core.runEnemyPhase(s);
  assert.deepEqual(ev.filter((e) => e.type === 'hold').map((e) => e.n), [1]);
  assert.equal(s.result, null);
  lamp(s, 'north').lit = false;
  Core.startAllyPhase(s, () => 0); Core.endAllyPhase(s);
  s.units.filter((u) => u.type === 'gwihwa').forEach((u) => { u.alive = false; });
  Core.runEnemyPhase(s);
  assert.equal(s.objective.hold, 0, '꺼진 등이 있으면 0');
  lamp(s, 'north').lit = true;
  for (let i = 1; i <= 2; i++) {
    Core.startAllyPhase(s, () => 0); Core.endAllyPhase(s);
    s.units.filter((u) => u.type === 'gwihwa').forEach((u) => { u.alive = false; });
    ev = Core.runEnemyPhase(s);
  }
  assert.equal(s.result, 'win');
  assert.ok(ev.some((e) => e.type === 'objective' && e.merit === 3));
});

test('증원: 임무 갱신 뒤 2턴마다 1 (적 차례 시작), 증원 자리는 결계를 칠 수 없다', () => {
  const s = fresh({ training: { soun: 'jinbeop' } });
  toLamps(s); // 1턴에 진실
  const count = () => s.units.filter((u) => u.type === 'gwihwa').length;
  const n0 = count();
  for (let t = 1; t <= 4; t++) {
    Core.endAllyPhase(s);
    if (s.turn === 1) assert.equal(count(), n0 + 2, '진실 증원 2 는 1턴 적 차례 시작에');
    if (s.turn === 3) assert.equal(count(), n0 + 3, '3턴 적 차례 시작에 1');
    Core.runEnemyPhase(s);
    if (s.result) break;
    Core.startAllyPhase(s, () => 0);
  }
  const so = put(s, 'soun', 8, 1);
  assert.ok(!Core.barrierCells(s, so).some((c) => Core.isSpawn(s, c.r, c.c)));
  assert.ok(!Core.barrierCells(s, so).some((c) => Core.lampAt(s, c.r, c.c)), '봉인등 칸도 안 된다');
});

test('공적: 귀화·원귀는 공적이 없다 (증원 파밍 방지)', () => {
  const s = fresh();
  const g = U(s, 'gwihwa1'); g.hp = 1;
  put(s, 'yoon', g.r + 1, g.c);
  Core.attack(s, 'yoon', 'gwihwa1');
  assert.equal(s.merit, 0);
});

test('플레이 기록: 봉인등 켬·꺼짐·유지·귀화 처치·수련 선택과 발동', () => {
  const s = playBattle({ seed: 1, mode: 'objective', stage: ch4, merit: 13, chapter: 'ch4', training: { yoon: 'jiphaeng', soun: 'jinbeop' } });
  const l = s.log;
  for (const k of ['sealLampsLit', 'sealLampsExtinguished', 'sealDefenseRounds', 'gwihwaDefeated', 'trainingChoices', 'trainingActivations']) assert.ok(k in l, k);
  assert.deepEqual(l.trainingChoices, { yoon: 'jiphaeng', soun: 'jinbeop' });
  assert.equal(l.sealLampsLit.length >= 1, true);
  assert.deepEqual(l.gwihwaSpawns.slice(0, 3).map((x) => x.spawn), ['west', 'east', 'north'], 'v0.9.2 증원 자리 기록');
});

test('v0.9.2 자동 검증: 징조를 무시하면 봉인등 단계에 등이 꺼지고, 징조를 보고 막으면 꺼지지 않는다', () => {
  const lampPhaseOut = (s) => s.log.sealLampsExtinguished.filter((e) => e.turn >= s.log.objectiveChangedTurn).length;
  const b = playBattle({ seed: 1, mode: 'objective', stage: ch4, merit: 13, chapter: 'ch4' });
  const c = playBattle({ seed: 1, mode: 'training', stage: ch4, merit: 13, chapter: 'ch4' });
  assert.equal(b.result, 'win');
  assert.equal(c.result, 'win');
  assert.ok(lampPhaseOut(b) >= 1, '북쪽 뒷산 귀화가 나오자마자 북쪽 등을 끈다');
  assert.equal(lampPhaseOut(c), 0, '길목(0,6)을 막으면 끄지 못한다');
});

test('자동 검증: 섬멸형은 이기지 못하고, 목표형은 수련 없이도 이긴다', () => {
  for (const merit of [0, 13]) {
    assert.notEqual(playBattle({ seed: 1, mode: 'nearest', stage: ch4, merit, chapter: 'ch4' }).result, 'win');
    assert.equal(playBattle({ seed: 1, mode: 'objective', stage: ch4, merit, chapter: 'ch4' }).result, 'win');
  }
});

test('월드맵: 3장 뒤 폐사찰 [조사한다], 4장 뒤 안정됨·큰고을 괴변 발생·급보, 수련점 +1', () => {
  const after3 = { v: 1, cleared: ['ch1', 'ch2', 'ch3'], merit: 13, training: {} };
  const after4 = { v: 1, cleared: ['ch1', 'ch2', 'ch3', 'ch4'], merit: 19, training: {} };
  assert.equal(Core.sortieChapter(after3, 'pyesachal'), 'ch4');
  assert.equal(Core.regionById('pyesachal').action, '조사한다');
  assert.match(Core.regionDesc(Core.regionById('pyesachal'), 'OMEN'), /세 개의 불빛/);
  const w = Core.worldState(after4);
  assert.deepEqual([w.pyesachal, w.keungoeul], ['STABILIZED', 'EXORCISM_REQUIRED']);
  assert.match(Core.regionDesc(Core.regionById('pyesachal'), 'STABILIZED'), /본당의 문은 여전히 굳게 닫혀/);
  assert.deepEqual(Core.worldNews(after4, []).map((n) => n.region), ['keungoeul']);
  assert.match(Core.worldNews(after4, [])[0].text, /관리 한 명이 흔적도 없이/);
  assert.equal(Core.regionNote(Core.regionById('keungoeul'), 'EXORCISM_REQUIRED'), '조사 준비 중');
  assert.equal(Core.trainingPoints(after4), 3, '3장 2 + 4장 1');
});

test('벽사록: 4장 시작에 폐사찰·귀화, 봉인등은 꺼진 봉인등 조사에서', () => {
  const on = (seen) => Core.LORE.filter((e) => Core.loreUnlocked(e, seen)).map((e) => e.id);
  const start = Core.loreTokensForBattle(fresh(), 'ch4');
  for (const id of ['pyesachal', 'gwihwa']) assert.ok(on(start).includes(id), id);
  assert.equal(on(start).includes('bonginding'), false);
  assert.ok(on(['point:lampWest']).includes('bonginding'));
});
