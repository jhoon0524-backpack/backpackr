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

// ── 사람을 베어도 공적 (specs/chapter2.md 7-3) ──
test('신당회 사람(무녀·달래)을 벽사청이 쓰러뜨려도 공적, 그 몫을 따로 센다', () => {
  const s = Core.newBattle(Core.STAGES.ch2);
  const yoon = Core.getUnit(s, 'yoon');
  const m = Core.getUnit(s, 'munyeo1');
  yoon.r = m.r; yoon.c = m.c + 1; m.hp = 1; // 무녀 (1,1) 오른쪽 (1,2)
  const ev = Core.attack(s, 'yoon', 'munyeo1');
  assert.equal(s.merit, 1);
  assert.equal(s.humanMerit, 1);
  assert.equal(ev.find((e) => e.type === 'defeat').human, true);
});

test('정화된 요괴는 사람이 아니다', () => {
  const s = Core.newBattle(Core.STAGES.ch2);
  const yoon = Core.getUnit(s, 'yoon');
  const d = Core.getUnit(s, 'jangsan_p');
  yoon.r = d.r; yoon.c = d.c + 1; d.hp = 1;
  Core.attack(s, 'yoon', 'jangsan_p');
  assert.deepEqual([s.merit, s.humanMerit], [1, 0]);
});

test('객장이 사람을 쓰러뜨리면 공적도 사람 몫도 없다', () => {
  const s = Core.newBattle(Core.STAGES.ch2);
  const y = Core.getUnit(s, 'yeoul');
  const m = Core.getUnit(s, 'munyeo1');
  y.r = m.r; y.c = m.c + 1; m.hp = 1;
  Core.attack(s, 'yeoul', 'munyeo1');
  assert.deepEqual([s.merit, s.humanMerit], [0, 0]);
});

test('1장 요괴는 사람이 아니다', () => {
  assert.equal(Core.newBattle().units.some((u) => u.human), false);
});
