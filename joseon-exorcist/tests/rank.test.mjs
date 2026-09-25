import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './load.mjs';

const Core = loadCore();
const ch2 = Core.STAGES.ch2;
const allyIds = (s) => Core.livingUnits(s, 'ally').map((u) => u.id);

test('품계: 0 종9품, 3 정9품, 6 종8품 (specs/chapter2.md 1-1)', () => {
  const name = (m) => Core.rankFor(m).name;
  assert.deepEqual([0, 2, 3, 5, 6, 8].map(name), ['종9품', '종9품', '정9품', '정9품', '종8품', '종8품']);
});

test('누계를 주지 않으면 v0.1 그대로 (품계·관군 없음)', () => {
  const s = Core.newBattle();
  assert.equal(Core.getUnit(s, 'yoon').title, '벽사청 종사관');
  assert.equal(s.rank, undefined);
});

test('윤무겸 칭호 앞에 품계 (보충 S12)', () => {
  assert.equal(Core.getUnit(Core.newBattle(Core.STAGES.ch1, { merit: 0 }), 'yoon').title, '종9품 벽사청 종사관');
  assert.equal(Core.getUnit(Core.newBattle(ch2, { merit: 4 }), 'yoon').title, '정9품 벽사청 종사관');
  assert.equal(Core.newBattle(ch2, { merit: 7 }).rank, '종8품');
});

test('관군: 종9품 0명, 정9품 1명, 종8품 2명', () => {
  assert.deepEqual(allyIds(Core.newBattle(ch2, { merit: 0 })), ['yoon', 'hangyeol', 'yeoul', 'soun']);
  assert.deepEqual(allyIds(Core.newBattle(ch2, { merit: 3 })), ['yoon', 'hangyeol', 'yeoul', 'soun', 'gwangun1']);
  assert.deepEqual(allyIds(Core.newBattle(ch2, { merit: 8 })), ['yoon', 'hangyeol', 'yeoul', 'soun', 'gwangun1', 'gwangun2']);
});

test('관군 위치: 윤무겸 (9,3) 에서 가까운 빈 칸, 위 → 아래 → 왼 → 오 (보충 S1)', () => {
  const s = Core.newBattle(ch2, { merit: 6 });
  // (9,3) 이웃: 위 (8,3) 빈칸 → 1번. 왼 (9,2) 한결, 오 (9,4) 여울 → 거리 2 로: (8,3) 에서 위 (7,3) → 2번
  assert.deepEqual([Core.getUnit(s, 'gwangun1').r, Core.getUnit(s, 'gwangun1').c], [8, 3]);
  assert.deepEqual([Core.getUnit(s, 'gwangun2').r, Core.getUnit(s, 'gwangun2').c], [7, 3]);
  const g = Core.getUnit(s, 'gwangun1');
  assert.deepEqual([g.name, g.faction, g.hp, g.skill], ['관군', '벽사청', 20, null]);
});

test('관군은 벽사청이라 마지막 일격이 공적이 된다', () => {
  const s = Core.newBattle(ch2, { merit: 3 });
  const g = Core.getUnit(s, 'gwangun1');
  const t = Core.getUnit(s, 'jangsan_p');
  g.r = 5; g.c = 4; t.hp = 1; // 장산범 (4,4) 바로 아래
  Core.attack(s, 'gwangun1', 'jangsan_p');
  assert.equal(s.merit, 1);
});

test('관군 합류가 요괴 행동 순서를 바꾸지 않는다', () => {
  assert.deepEqual(Core.enemyOrder(Core.newBattle(ch2, { merit: 8 })), Core.enemyOrder(Core.newBattle(ch2)));
});
