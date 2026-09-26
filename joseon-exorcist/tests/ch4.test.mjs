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

test('조사 두 곳 모두 → 진실: 도문 술사 등장, 귀화 증원 2, 봉인등 단계', () => {
  const s = fresh();
  put(s, 'yeoul', 3, 0);
  assert.deepEqual(Core.arrive(s, 'yeoul').map((e) => e.type), ['investigate'], '한 곳으로는 부족');
  const before = s.units.filter((u) => u.type === 'gwihwa').length;
  put(s, 'hangyeol', 4, 3);
  const ev = Core.arrive(s, 'hangyeol');
  assert.deepEqual(ev.map((e) => e.type), ['investigate', 'truth', 'appear', 'reinforce', 'reinforce']);
  assert.equal(s.objective.phase, 'lamps');
  const d = U(s, 'dosa');
  assert.deepEqual([d.side, d.name, d.untargetable], ['neutral', '도문 술사', true]);
  assert.equal(s.units.filter((u) => u.type === 'gwihwa').length, before + 2);
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

test('귀화: 켜진 등(칸 또는 상하좌우)에 닿으면 그 차례에는 경고만, 다음 자기 차례의 행동으로 끄고 사라진다', () => {
  const s = fresh();
  clearEnemies(s);
  const g = put(s, 'gwihwa1', 4, 7); g.alive = true; // 동쪽 등(3,7) 바로 아래 — 이미 닿아 있다
  s.phase = 'enemy';
  const ev = Core.enemyAct(s, 'gwihwa1');
  assert.deepEqual(ev.map((e) => e.type), ['extinguish']);
  assert.deepEqual([lamp(s, 'east').lit, g.alive], [false, false], '끈 귀화는 사라진다');
  // 멀리서 다가오면: 옆 칸까지 와서 멈추고 경고
  const s2 = fresh();
  clearEnemies(s2);
  const g2 = put(s2, 'gwihwa2', 7, 7); g2.alive = true;
  s2.phase = 'enemy';
  const ev2 = Core.enemyAct(s2, 'gwihwa2');
  assert.deepEqual(ev2.map((e) => e.type), ['move', 'lampThreat']);
  assert.ok(Core.lampInReach(s2, g2));
  assert.equal(lamp(s2, 'east').lit, true, '닿는 순간 자동으로 꺼지지 않는다');
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

test('교란: 등 옆까지 온 귀화를 밀어내면 끄지 못한다 / 추적: 늦추면 닿지 못한다', () => {
  const s = fresh({ training: { yeoul: 'gyoran' } });
  clearEnemies(s);
  const g = put(s, 'gwihwa1', 4, 7); g.alive = true; g.hp = g.maxHp = 99;
  put(s, 'yeoul', 3, 7); // 위에서 아래로 민다
  Core.useSkill(s, 'yeoul', 'gwihwa1');
  assert.deepEqual([g.r, g.c], [5, 7]);
  assert.equal(Core.lampInReach(s, g), null);
  const s2 = fresh({ training: { hangyeol: 'chujeok' } });
  clearEnemies(s2);
  const f = put(s2, 'gwihwa2', 8, 7); f.alive = true; f.hp = f.maxHp = 99; // 동쪽 등 옆 칸(4,7)까지 4칸
  put(s2, 'hangyeol', 8, 5);
  Core.useSkill(s2, 'hangyeol', 'gwihwa2');
  assert.equal(f.slow, true);
  s2.phase = 'enemy';
  Core.enemyAct(s2, 'gwihwa2');
  assert.equal(Core.lampInReach(s2, f), null, '이동 3 으로는 닿지 못한다');
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
    if (s.turn === 3) assert.equal(count(), n0 + 1, '3턴 적 차례 시작에 1');
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
