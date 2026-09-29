import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './load.mjs';

const Core = loadCore();
const keys = (list) => list.map((p) => `${p.r},${p.c}`).sort();

// 한 유닛만 남긴 상태를 만들어 다른 유닛의 방해 없이 지형만 검사한다
function alone(id, r, c) {
  const s = Core.newBattle();
  for (const u of s.units) if (u.id !== id) u.alive = false;
  const u = Core.getUnit(s, id);
  u.r = r; u.c = c;
  return { s, u };
}

test('제자리가 포함된다', () => {
  const { s, u } = alone('yoon', 7, 0);
  const t = Core.moveTargets(s, u);
  assert.ok(t.some((p) => p.r === 7 && p.c === 0 && p.cost === 0));
});

test('빈 땅에서 이동 3 이면 마름모 모양 칸 수만큼 간다', () => {
  // (6,7) 근처는 막힌 칸이 없다: 맵 안쪽만 센다
  const { s, u } = alone('yoon', 7, 7);
  const t = Core.moveTargets(s, u);
  // 맨해튼 거리 3 이내이면서 맵 안: (7,7) 기준 1+2+3+4 = 10칸
  assert.equal(t.length, 10);
  for (const p of t) assert.ok(Math.abs(p.r - 7) + Math.abs(p.c - 7) <= 3);
});

test('초가집·바위는 통과도 정지도 못 한다', () => {
  // (6,1) 에서 위로: (5,1) 이 막혀 있어 (4,1) 로는 돌아서만 간다
  const { s, u } = alone('yoon', 6, 1);
  const t = Core.moveTargets(s, u);
  assert.ok(!t.some((p) => p.r === 5 && p.c === 1), '막힌 칸에 설 수 없다');
  assert.ok(!t.some((p) => p.r === 5 && p.c === 2), '막힌 칸에 설 수 없다');
  // (4,1) 은 (6,1)→(6,0)→(5,0)→(4,0)→(4,1) 로 4칸이라 이동 3 으로는 못 간다
  assert.ok(!t.some((p) => p.r === 4 && p.c === 1));
  assert.ok(t.some((p) => p.r === 4 && p.c === 0 && p.cost === 3));
});

test('다른 유닛 칸은 통과도 정지도 못 한다 (아군 포함)', () => {
  const s = Core.newBattle();
  const yoon = Core.getUnit(s, 'yoon'); // (7,2), 오른쪽 (7,3) 한결, 위 (6,2) 빈칸
  const t = Core.moveTargets(s, yoon);
  assert.ok(!t.some((p) => p.r === 7 && p.c === 3), '한결 칸');
  // (7,4) 는 한결·달래·여울에 막혀 돌아가야 한다: (6,2)→(5,?) ... 이동 3 으로는 못 간다
  assert.ok(!t.some((p) => p.r === 7 && p.c === 4));
});

test('시작 배치에서 윤무겸이 갈 수 있는 칸', () => {
  const s = Core.newBattle();
  const t = Core.moveTargets(s, Core.getUnit(s, 'yoon'));
  // (7,2) 이웃: (6,2)(7,1). (6,3) 은 달래, (7,3) 은 한결, (5,2)(5,1) 은 막힘
  assert.deepEqual(keys(t), ['6,0', '6,1', '6,2', '7,0', '7,1', '7,2'].sort());
});

test('여울(이동 5)은 시작 배치에서 약수터까지 간다', () => {
  const s = Core.newBattle();
  const t = Core.moveTargets(s, Core.getUnit(s, 'yeoul'));
  const cost = Object.fromEntries(t.map((p) => [`${p.r},${p.c}`, p.cost]));
  assert.equal(cost['6,4'], 1);
  assert.equal(cost['4,4'], 3);
  assert.equal(cost['3,3'], 5, '약수터');
  assert.equal(cost['2,3'], undefined, '6칸이라 못 간다');
  assert.equal(cost['1,4'], undefined, '장산범 칸');
});
