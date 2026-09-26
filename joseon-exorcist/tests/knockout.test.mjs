import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './load.mjs';

const Core = loadCore();

// attacker 를 target 옆에 세우고 target HP 를 1 로 만들어 기본공격으로 쓰러뜨린다
function finish(attackerId, targetId) {
  const s = Core.newBattle();
  const a = Core.getUnit(s, attackerId);
  const t = Core.getUnit(s, targetId);
  const spot = [[t.r + 1, t.c], [t.r, t.c - 1], [t.r, t.c + 1], [t.r - 1, t.c]]
    .find(([r, c]) => Core.isPassable(s, r, c) && !Core.unitAt(s, r, c));
  a.r = spot[0]; a.c = spot[1];
  t.hp = 1;
  const ev = Core.attack(s, attackerId, targetId);
  return { s, a, t, ev };
}

test('요괴 HP 0 → 맵에서 사라진다', () => {
  const { s, t, ev } = finish('yeoul', 'bulgasari');
  assert.equal(t.alive, false);
  assert.equal(Core.unitAt(s, t.r, t.c), null);
  assert.equal(ev[1].type, 'defeat');
});

test('벽사청(윤무겸·한결)의 마지막 일격: 일반 요괴 +1', () => {
  assert.equal(finish('yoon', 'bulgasari').s.merit, 1);
  assert.equal(finish('hangyeol', 'dokkaebi2').s.merit, 1);
  assert.equal(finish('yoon', 'bulgasari').ev[1].merit, 1);
});

test('벽사청이 흑린을 쓰러뜨리면 +3', () => {
  assert.equal(finish('yoon', 'heuklin').s.merit, 3);
});

test('객장이 쓰러뜨리면 공적 없음', () => {
  for (const id of ['yeoul', 'soun', 'dallae']) {
    assert.equal(finish(id, 'bulgasari').s.merit, 0, id);
    assert.equal(finish(id, 'heuklin').s.merit, 0, id);
  }
});

test('쓰러뜨리지 못하면 공적 없음', () => {
  const s = Core.newBattle();
  const yoon = Core.getUnit(s, 'yoon');
  yoon.r = 3; yoon.c = 4;
  Core.attack(s, 'yoon', 'bulgasari');
  assert.equal(s.merit, 0);
  assert.equal(Core.getUnit(s, 'bulgasari').alive, true);
});

test('스킬로 쓰러뜨려도 같은 규칙', () => {
  const s = Core.newBattle();
  const yoon = Core.getUnit(s, 'yoon');
  yoon.r = 0; yoon.c = 0;
  Core.getUnit(s, 'dokkaebi1').hp = 20; // 벽사검 20 피해
  const ev = Core.useSkill(s, 'yoon', 'dokkaebi1');
  assert.equal(ev[1].type, 'defeat');
  assert.equal(s.merit, 1);
});

test('최대 공적 = 8 (일반 5 + 흑린 3)', () => {
  const s = Core.newBattle();
  const yoon = Core.getUnit(s, 'yoon');
  for (const t of Core.livingUnits(s, 'enemy')) {
    t.hp = 1;
    yoon.acted = false;
    // 적 바로 옆 빈칸으로 순간이동시켜 공격
    const spot = [[t.r + 1, t.c], [t.r, t.c - 1], [t.r, t.c + 1], [t.r - 1, t.c]]
      .find(([r, c]) => Core.isPassable(s, r, c) && (!Core.unitAt(s, r, c) || Core.unitAt(s, r, c) === yoon));
    yoon.r = spot[0]; yoon.c = spot[1];
    Core.attack(s, 'yoon', t.id);
  }
  assert.equal(s.merit, 8);
});

// ── 사람은 제압, 공적 없음 (specs/immersion.md 4·5장) ──
test('벽사청이 신당회 무녀를 제압하면 공적 0, 제압으로 표시', () => {
  const s = Core.newBattle(Core.STAGES.ch2);
  const yoon = Core.getUnit(s, 'yoon');
  const m = Core.getUnit(s, 'munyeo1');
  yoon.r = m.r; yoon.c = m.c + 1; m.hp = 1; // 무녀 (1,1) 오른쪽 (1,2)
  const ev = Core.attack(s, 'yoon', 'munyeo1').find((e) => e.type === 'defeat');
  assert.equal(s.merit, 0);
  assert.deepEqual([ev.merit, ev.human, ev.defeatType], [0, true, 'SUBDUE']);
  assert.equal(Core.DEFEAT_TYPES[ev.defeatType], '제압');
});

test('정화된 요괴는 퇴치, 공적 +1', () => {
  const s = Core.newBattle(Core.STAGES.ch2);
  const yoon = Core.getUnit(s, 'yoon');
  const d = Core.getUnit(s, 'jangsan_p');
  yoon.r = d.r; yoon.c = d.c + 1; d.hp = 1;
  const ev = Core.attack(s, 'yoon', 'jangsan_p').find((e) => e.type === 'defeat');
  assert.equal(s.merit, 1);
  assert.deepEqual([ev.merit, ev.defeatType], [1, 'EXORCISE']);
});

test('달래(보스)는 사람이어도 공적 +3 유지', () => {
  const s = Core.newBattle(Core.STAGES.ch2);
  const yoon = Core.getUnit(s, 'yoon');
  const d = Core.getUnit(s, 'dallae_boss');
  yoon.r = d.r + 1; yoon.c = d.c; d.hp = 1; // 달래 (2,0) 아래 (3,0)
  const ev = Core.attack(s, 'yoon', 'dallae_boss').find((e) => e.type === 'defeat');
  assert.deepEqual([s.merit, ev.defeatType, s.result], [3, 'SUBDUE', 'win']);
});

test('관군의 마지막 일격도 벽사청 공적', () => {
  const s = Core.newBattle(Core.STAGES.ch2, { merit: 3 });
  const g = Core.getUnit(s, 'gwangun1');
  const d = Core.getUnit(s, 'dokkaebi_p1');
  g.r = d.r; g.c = d.c + 1; d.hp = 1;
  Core.attack(s, 'gwangun1', 'dokkaebi_p1');
  assert.equal(s.merit, 1);
});

test('객장이 쓰러뜨리면 공적 없음 (퇴장 표현은 붙는다)', () => {
  const s = Core.newBattle(Core.STAGES.ch2);
  const y = Core.getUnit(s, 'yeoul');
  const m = Core.getUnit(s, 'munyeo1');
  y.r = m.r; y.c = m.c + 1; m.hp = 1;
  const ev = Core.attack(s, 'yeoul', 'munyeo1').find((e) => e.type === 'defeat');
  assert.deepEqual([s.merit, ev.defeatType], [0, 'SUBDUE']);
});

test('존재 분류 → 퇴장 표현', () => {
  const t = (x) => Core.DEFEAT_TYPES[Core.defeatTypeFor(x)];
  assert.deepEqual(['HUMAN', 'YOGOE', 'JAPGWI', 'YEOKGWI', 'WONGWI'].map(t), ['제압', '퇴치', '축귀', '축역', '퇴송']);
});

test('아군 퇴각에는 퇴장 표현이 없다', () => {
  const s = Core.newBattle();
  const d = Core.getUnit(s, 'dokkaebi1');
  const so = Core.getUnit(s, 'soun');
  d.r = so.r - 1; d.c = so.c; so.hp = 1;
  s.phase = 'enemy';
  const ev = Core.enemyAct(s, 'dokkaebi1').find((e) => e.type === 'retreat');
  assert.equal(ev.defeatType, undefined);
});

test('1장 요괴는 사람이 아니다', () => {
  assert.equal(Core.newBattle().units.some((u) => u.human), false);
});
