import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './load.mjs';

const Core = loadCore();

// 지정한 유닛만 살려 원하는 칸에 세운 상태. spec: { id: [r, c, hp?] }
// 흑린이 없으면 즉시 승리가 되므로 흑린은 따로 적지 않으면 (0,3) 에 남긴다
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
const at = (u) => [u.r, u.c];

test('칠 수 있는 아군 중 HP 가 가장 낮은 아군을 친다', () => {
  const { s, u } = scene({ bulgasari: [2, 4], yoon: [4, 4], soun: [3, 6, 5] });
  const ev = Core.normalEnemyAct(s, u('bulgasari'));
  assert.deepEqual(at(u('bulgasari')), [3, 5]);
  assert.deepEqual(ev.map((e) => e.type), ['move', 'damage', 'retreat']);
  assert.equal(ev[1].targetId, 'soun');
  assert.equal(ev[1].amount, 7);
  assert.equal(u('soun').alive, false);
  assert.equal(u('yoon').hp, 30);
});

test('HP 동률이면 이동 칸 수가 적은 쪽 (표 순서보다 우선)', () => {
  // 윤무겸(표 앞)은 3칸, 한결은 1칸 이동하면 칠 수 있다
  const { s, u } = scene({ bulgasari: [2, 4], yoon: [4, 2, 20], hangyeol: [4, 4, 20] });
  const ev = Core.normalEnemyAct(s, u('bulgasari'));
  assert.equal(ev.find((e) => e.type === 'damage').targetId, 'hangyeol');
  assert.deepEqual(at(u('bulgasari')), [3, 4]);
});

test('HP·거리 모두 같으면 아군 표 순서', () => {
  const { s, u } = scene({ bulgasari: [6, 6], hangyeol: [6, 4, 20], yoon: [4, 6, 20] });
  const ev = Core.normalEnemyAct(s, u('bulgasari'));
  assert.equal(ev.find((e) => e.type === 'damage').targetId, 'yoon');
  assert.deepEqual(at(u('bulgasari')), [5, 6]);
});

test('공격 칸이 여럿이면 이동 칸 수 → 행 → 열', () => {
  // (6,6) 한결을 치는 칸: (6,7)·(7,6) 둘 다 1칸 → 행이 작은 (6,7)
  const { s, u } = scene({ bulgasari: [7, 7], hangyeol: [6, 6] });
  Core.normalEnemyAct(s, u('bulgasari'));
  assert.deepEqual(at(u('bulgasari')), [6, 7]);
});

test('이미 옆에 있으면 움직이지 않고 친다', () => {
  const { s, u } = scene({ bulgasari: [3, 4], yoon: [4, 4] });
  const ev = Core.normalEnemyAct(s, u('bulgasari'));
  assert.deepEqual(ev.map((e) => e.type), ['damage']);
  assert.deepEqual(at(u('bulgasari')), [3, 4]);
  assert.equal(u('yoon').hp, 30 - 4);
});

test('칠 수 없으면 가장 가까운 아군 쪽으로 최대한 다가간다', () => {
  // 도깨비 (0,1) → 윤무겸 (7,2). 3칸 간 뒤 남은 칸 수가 가장 작은(6칸) 칸은 (1,3)·(2,0)·(2,2) → 행이 작은 (1,3)
  const { s, u } = scene({ dokkaebi1: [0, 1], yoon: [7, 2] });
  const ev = Core.normalEnemyAct(s, u('dokkaebi1'));
  assert.deepEqual(ev, [{ type: 'move', unitId: 'dokkaebi1', from: { r: 0, c: 1 }, to: { r: 1, c: 3 } }]);
});

test('다가갈 대상은 실제 이동 칸 수로 고른다 (직선거리 아님)', () => {
  // 도깨비 (4,0) 기준: 윤무겸 (6,1) 은 바위 (5,1)(5,2) 너머 — 직선거리 3 이지만 (5,0)→(6,0) 으로 2칸이면 옆에 선다
  // 칠 수 있으니 공격한다. 반대로 한결 (4,4) 는 직선거리 4, 실제로도 (4,3) 까지 3칸
  const { s, u } = scene({ dokkaebi1: [4, 0], yoon: [6, 1], hangyeol: [4, 4] });
  const ev = Core.normalEnemyAct(s, u('dokkaebi1'));
  assert.equal(ev.find((e) => e.type === 'damage').targetId, 'hangyeol', 'HP 최저(24)가 한결');
});

test('다가갈 때 동률이면 아군 표 순서의 아군 쪽으로', () => {
  // 도깨비 (0,0), 윤무겸 (7,0)·한결 (0,7): 둘 다 실제 이동 칸 수가 같다 → 윤무겸 쪽(아래)으로
  // (흑린이 (0,3) 에 있으면 윗줄 길을 막으므로 구석으로 옮긴다)
  const { s, u } = scene({ dokkaebi1: [0, 0], yoon: [7, 0], hangyeol: [0, 7], heuklin: [7, 7] });
  const toYoon = Core.approachMap(s, u('dokkaebi1'), u('yoon'))['0,0'];
  const toHangyeol = Core.approachMap(s, u('dokkaebi1'), u('hangyeol'))['0,0'];
  assert.equal(toYoon, 6);
  assert.equal(toHangyeol, 6, '정말 동률인지 확인');
  Core.normalEnemyAct(s, u('dokkaebi1'));
  assert.deepEqual(at(u('dokkaebi1')), [3, 0]);
});

test('어느 아군에게도 길이 없으면 제자리', () => {
  const { s, u } = scene({ dokkaebi1: [0, 0], jangsan1: [0, 1], jangsan2: [1, 0], yoon: [7, 7] });
  assert.deepEqual(Core.normalEnemyAct(s, u('dokkaebi1')), []);
  assert.deepEqual(at(u('dokkaebi1')), [0, 0]);
});

test('요괴는 기본공격만 한다 (상성 없음, 기력 없음)', () => {
  // 도깨비(목) → 여울(토): 스킬이었다면 유리지만 기본공격 10−7 = 3
  const { s, u } = scene({ dokkaebi1: [3, 4], yeoul: [4, 4] });
  const ev = Core.normalEnemyAct(s, u('dokkaebi1'));
  assert.equal(ev[0].amount, 3);
});

test('마지막 아군이 퇴각하면 즉시 패배', () => {
  const { s, u } = scene({ bulgasari: [3, 4], soun: [4, 4, 1] });
  const ev = Core.normalEnemyAct(s, u('bulgasari'));
  assert.deepEqual(ev.map((e) => e.type), ['damage', 'retreat', 'result']);
  assert.equal(s.result, 'lose');
  assert.equal(s.merit, 0, '요괴가 쓰러뜨린 건 공적과 무관');
});
