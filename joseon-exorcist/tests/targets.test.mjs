import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './load.mjs';

const Core = loadCore();
const names = (list) => list.map((u) => u.id);

function place(s, id, r, c) {
  const u = Core.getUnit(s, id);
  u.r = r; u.c = c;
  return u;
}

test('거리는 가로 칸 수 + 세로 칸 수', () => {
  assert.equal(Core.distance({ r: 0, c: 0 }, { r: 2, c: 3 }), 5);
  assert.equal(Core.distance({ r: 4, c: 4 }, { r: 4, c: 4 }), 0);
});

test('사거리 1: 상하좌우 이웃 적만', () => {
  const s = Core.newBattle();
  const yoon = place(s, 'yoon', 3, 4); // 이웃 (2,4) 불가사리
  assert.deepEqual(names(Core.attackTargets(s, yoon)), ['bulgasari']);
  place(s, 'yoon', 3, 5); // (2,4) 는 대각선 = 거리 2
  assert.deepEqual(names(Core.attackTargets(s, yoon)), []);
});

test('사거리 2: 거리 1~2 모두, 아군은 대상 아님', () => {
  const s = Core.newBattle();
  const hg = place(s, 'hangyeol', 3, 4); // 불가사리 (2,4)=1, 장산범B (1,4)=2, 장산범A (1,3)=3
  place(s, 'soun', 3, 5); // 아군이 옆에 있어도 대상에 안 들어간다
  assert.deepEqual(names(Core.attackTargets(s, hg)), ['jangsan2', 'bulgasari']);
});

test('pos 를 주면 그 칸 기준으로 잰다', () => {
  const s = Core.newBattle();
  const yoon = Core.getUnit(s, 'yoon');
  assert.deepEqual(names(Core.attackTargets(s, yoon)), []);
  assert.deepEqual(names(Core.attackTargets(s, yoon, { r: 3, c: 4 })), ['bulgasari']);
});

test('퇴각한 적은 대상이 아니다', () => {
  const s = Core.newBattle();
  const yoon = place(s, 'yoon', 3, 4);
  Core.getUnit(s, 'bulgasari').alive = false;
  assert.deepEqual(names(Core.attackTargets(s, yoon)), []);
});

test('요괴의 대상은 아군', () => {
  const s = Core.newBattle();
  place(s, 'yoon', 3, 4);
  assert.deepEqual(names(Core.attackTargets(s, Core.getUnit(s, 'bulgasari'))), ['yoon']);
});

test('공격 스킬 대상 = 기본공격 대상', () => {
  const s = Core.newBattle();
  const hg = place(s, 'hangyeol', 3, 4);
  assert.deepEqual(names(Core.skillTargets(s, hg)), names(Core.attackTargets(s, hg)));
});

test('정화수: 거리 2 안 아군, 자기 포함, 적 제외', () => {
  const s = Core.newBattle();
  // 달래 (6,3): 윤무겸(7,2)=2, 한결(7,3)=1, 여울(7,4)=2, 소운(7,5)=3
  const dal = Core.getUnit(s, 'dallae');
  assert.deepEqual(names(Core.skillTargets(s, dal)), ['yoon', 'hangyeol', 'yeoul', 'dallae']);
  place(s, 'dallae', 3, 4); // 불가사리 (2,4) 이웃이지만 적은 대상 아님
  assert.deepEqual(names(Core.skillTargets(s, dal)), ['dallae']);
});
