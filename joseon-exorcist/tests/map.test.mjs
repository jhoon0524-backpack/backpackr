import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './load.mjs';

const Core = loadCore();
const s = Core.newBattle(); // 1장 스테이지

function cells(ch) {
  const out = [];
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (Core.terrainAt(s, r, c) === ch) out.push([r, c]);
  return out;
}

test('맵은 8×8 이다', () => {
  const ch1 = Core.STAGES.ch1;
  assert.equal(ch1.rows, 8);
  assert.equal(ch1.cols, 8);
  assert.equal(ch1.map.length, 8);
  for (const row of ch1.map) assert.equal(row.length, 8);
  assert.equal(s.rows, 8);
  assert.equal(s.cols, 8);
});

test('초가집·바위 위치가 기획서와 같다', () => {
  assert.deepEqual(cells('D'), [[1, 1], [1, 6], [2, 1], [2, 6], [4, 5], [5, 1], [5, 2], [5, 5]]);
});

test('서낭당은 (0,3)(0,4), 약수터는 (3,3)', () => {
  assert.deepEqual(cells('M'), [[0, 3], [0, 4]]);
  assert.deepEqual(cells('K'), [[3, 3]]);
  assert.equal(Core.isShrine(s, 0, 3), true);
  assert.equal(Core.isShrine(s, 3, 3), false);
  assert.equal(Core.isSpring(s, 3, 3), true);
});

test('통과 가능 여부', () => {
  assert.equal(Core.isPassable(s, 0, 0), true);
  assert.equal(Core.isPassable(s, 1, 1), false);
  assert.equal(Core.isPassable(s, 0, 3), true, '서낭당은 지나갈 수 있다');
  assert.equal(Core.isPassable(s, 3, 3), true, '약수터는 지나갈 수 있다');
  assert.equal(Core.isPassable(s, -1, 0), false, '맵 밖');
  assert.equal(Core.isPassable(s, 8, 0), false, '맵 밖');
  assert.equal(Core.terrainAt(s, 0, 8), null);
});
