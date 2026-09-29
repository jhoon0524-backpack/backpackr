import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './load.mjs';

const Core = loadCore();

function scene(spec) {
  spec = { heuklin: [0, 3], ...spec };
  const s = Core.newBattle();
  for (const u of s.units) {
    const p = spec[u.id];
    if (!p) { u.alive = false; continue; }
    u.r = p[0]; u.c = p[1];
    if (p[2] !== undefined) u.hp = p[2];
  }
  s.phase = 'enemy';
  return { s, u: (id) => Core.getUnit(s, id) };
}

test('요괴는 표 순서대로 행동한다', () => {
  const s = Core.newBattle();
  assert.deepEqual(Core.enemyOrder(s), ['dokkaebi1', 'dokkaebi2', 'jangsan1', 'jangsan2', 'bulgasari', 'heuklin']);
  Core.getUnit(s, 'jangsan1').alive = false;
  assert.deepEqual(Core.enemyOrder(s), ['dokkaebi1', 'dokkaebi2', 'jangsan2', 'bulgasari', 'heuklin']);
});

test('앞 요괴의 행동 결과를 뒤 요괴가 본다 (먼저 친 대상의 HP 가 낮아짐)', () => {
  // 도깨비A (6,4) 는 제자리에서, 도깨비B (7,4) 는 한 칸 옮겨 윤무겸(30, (6,3))·한결(24, (6,5)) 둘 다 칠 수 있다.
  // A 가 HP 가 낮은 한결을 쳐 18 → B 도 한결(18 < 30)
  const { s, u } = scene({ dokkaebi1: [6, 4], dokkaebi2: [7, 4], yoon: [6, 3], hangyeol: [6, 5] });
  for (const id of ['yoon', 'hangyeol']) {
    assert.ok(Core.attackPlans(s, u('dokkaebi1')).some((p) => p.target.id === id), `A → ${id}`);
    assert.ok(Core.attackPlans(s, u('dokkaebi2')).some((p) => p.target.id === id), `B → ${id}`);
  }
  const ev = Core.runEnemyPhase(s).filter((e) => e.type === 'damage');
  assert.deepEqual(ev.map((e) => [e.attackerId, e.targetId]), [['dokkaebi1', 'hangyeol'], ['dokkaebi2', 'hangyeol']]);
  assert.equal(u('hangyeol').hp, 24 - 6 - 6);
});

test('페이즈가 끝나면 턴 +1, 아군 페이즈', () => {
  const { s } = scene({ yoon: [7, 7] });
  s.turn = 3;
  Core.runEnemyPhase(s);
  assert.equal(s.turn, 4);
  assert.equal(s.phase, 'ally');
});

test('도중 아군 전원 퇴각 → 즉시 패배, 남은 요괴는 행동하지 않는다', () => {
  const { s, u } = scene({ dokkaebi1: [3, 4], bulgasari: [5, 3], soun: [4, 4, 1] });
  const ev = Core.runEnemyPhase(s);
  assert.equal(s.result, 'lose');
  assert.equal(s.phase, 'over');
  assert.deepEqual(ev.map((e) => e.type), ['damage', 'retreat', 'result']);
  assert.deepEqual([u('bulgasari').r, u('bulgasari').c], [5, 3], '불가사리는 움직이지 않았다');
  assert.equal(s.turn, 1, '턴이 넘어가지 않는다');
});

test('10턴 요괴 페이즈가 끝나면 패배 (흑린 생존)', () => {
  const { s } = scene({ yoon: [7, 7] });
  s.turn = 10;
  const ev = Core.runEnemyPhase(s);
  assert.equal(ev.at(-1).type, 'result');
  assert.equal(s.result, 'lose');
});
