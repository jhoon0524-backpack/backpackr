import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './load.mjs';

const Core = loadCore();

function scene(spec) {
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

test('인접한 아군이 없으면 아무것도 안 한다 (이동 없음)', () => {
  const { s, u } = scene({ heuklin: [0, 3], yoon: [2, 3] });
  assert.deepEqual(Core.enemyAct(s, 'heuklin'), []);
  assert.deepEqual([u('heuklin').r, u('heuklin').c], [0, 3]);
});

test('인접한 아군 중 HP 가 가장 낮은 아군을 친다', () => {
  const { s, u } = scene({ heuklin: [0, 3], yoon: [0, 2, 10], yeoul: [1, 3, 30] });
  const ev = Core.enemyAct(s, 'heuklin');
  assert.equal(ev[0].targetId, 'yoon');
  assert.equal(ev[0].amount, 13 - 6);
  assert.deepEqual([u('heuklin').r, u('heuklin').c], [0, 3]);
});

test('HP 동률이면 아군 표 순서', () => {
  const { s } = scene({ heuklin: [0, 3], yeoul: [1, 3, 20], hangyeol: [0, 2, 20], soun: [0, 4, 20] });
  assert.equal(Core.enemyAct(s, 'heuklin')[0].targetId, 'hangyeol');
});

test('사거리 1: 대각선·2칸 떨어진 아군은 못 친다', () => {
  const { s } = scene({ heuklin: [0, 3], yoon: [1, 4], hangyeol: [0, 5] });
  assert.deepEqual(Core.enemyAct(s, 'heuklin'), []);
});

test('enemyAct 는 일반 요괴에게 일반 AI 를 쓴다', () => {
  const { s, u } = scene({ heuklin: [0, 3], bulgasari: [3, 4], yoon: [4, 4] });
  assert.equal(Core.enemyAct(s, 'bulgasari')[0].targetId, 'yoon');
  assert.equal(u('yoon').hp, 26);
});

test('아군 페이즈나 전투 종료 뒤에는 요괴가 행동하지 않는다', () => {
  const a = scene({ heuklin: [0, 3], yoon: [0, 2] });
  a.s.phase = 'ally';
  assert.deepEqual(Core.enemyAct(a.s, 'heuklin'), []);
  const b = scene({ heuklin: [0, 3], yoon: [0, 2] });
  b.s.result = 'lose';
  assert.deepEqual(Core.enemyAct(b.s, 'heuklin'), []);
  assert.equal(b.u('yoon').hp, 30);
});
