import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './load.mjs';

const Core = loadCore();

test('흑린 HP 0 → 즉시 승리, 이후 명령 불가', () => {
  const s = Core.newBattle();
  const yeoul = Core.getUnit(s, 'yeoul');
  yeoul.r = 0; yeoul.c = 2; // 흑린 (0,3) 왼쪽
  Core.getUnit(s, 'heuklin').hp = 1;
  const ev = Core.attack(s, 'yeoul', 'heuklin');
  assert.deepEqual(ev.map((e) => e.type), ['damage', 'defeat', 'result']);
  assert.equal(ev[2].result, 'win');
  assert.equal(s.result, 'win');
  assert.equal(s.phase, 'over');
  assert.equal(Core.moveUnit(s, 'yoon', 6, 2), false, '남은 아군 행동은 버린다');
});

test('일반 요괴를 다 잡아도 흑린이 살아 있으면 승리 아님', () => {
  const s = Core.newBattle();
  for (const u of Core.livingUnits(s, 'enemy')) if (!u.boss) u.alive = false;
  const yoon = Core.getUnit(s, 'yoon');
  yoon.r = 3; yoon.c = 4;
  Core.wait(s, 'yoon');
  assert.equal(s.result, null);
});

// 아군 전원 퇴각 → 즉시 패배 는 요괴가 실제로 공격해야 생기므로 tests/enemy-phase.test.mjs 에서 검사한다

test('10턴 요괴 페이즈가 끝났을 때 흑린 생존 → 패배', () => {
  const s = Core.newBattle();
  s.turn = 10;
  s.phase = 'enemy';
  const ev = Core.endEnemyPhase(s);
  assert.deepEqual(ev, [{ type: 'result', result: 'lose' }]);
  assert.equal(s.result, 'lose');
  assert.equal(s.phase, 'over');
  assert.equal(s.turn, 10);
});

test('9턴 요괴 페이즈 끝 → 10턴 아군 페이즈', () => {
  const s = Core.newBattle();
  s.turn = 9;
  s.phase = 'enemy';
  assert.deepEqual(Core.endEnemyPhase(s), []);
  assert.equal(s.turn, 10);
  assert.equal(s.phase, 'ally');
  assert.equal(s.result, null);
});

test('이미 끝난 전투는 턴이 넘어가지 않는다', () => {
  const s = Core.newBattle();
  s.result = 'win';
  s.phase = 'over';
  assert.deepEqual(Core.endEnemyPhase(s), []);
  assert.equal(s.turn, 1);
});
