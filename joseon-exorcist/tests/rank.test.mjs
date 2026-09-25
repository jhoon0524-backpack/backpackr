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

test('관군 자리가 없는 맵: 윤무겸 (9,3) 에서 가까운 빈 칸, 위 → 아래 → 왼 → 오 (보충 S1, 예비 규칙)', () => {
  const s = Core.newBattle({ ...ch2, reserves: undefined }, { merit: 6 });
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
  g.r = t.r; g.c = t.c + 1; t.hp = 1; // 장산범 바로 오른쪽
  Core.attack(s, 'gwangun1', 'jangsan_p');
  assert.equal(s.merit, 1);
});

test('관군 합류가 요괴 행동 순서를 바꾸지 않는다', () => {
  assert.deepEqual(Core.enemyOrder(Core.newBattle(ch2, { merit: 8 })), Core.enemyOrder(Core.newBattle(ch2)));
});

test('관군 자리가 있는 스테이지: 품계만큼 그 자리 순서대로 (specs/chapter2.md 7-2)', () => {
  const st = { ...Core.STAGES.ch1, allies: [{ id: 'yoon', r: 7, c: 2 }], reserves: [{ r: 3, c: 0 }, { r: 3, c: 7 }] };
  const pos = (s, id) => { const u = Core.getUnit(s, id); return u && [u.r, u.c]; };
  assert.equal(pos(Core.newBattle(st, { merit: 0 }), 'gwangun1'), null);
  assert.deepEqual(pos(Core.newBattle(st, { merit: 3 }), 'gwangun1'), [3, 0]);
  assert.equal(pos(Core.newBattle(st, { merit: 3 }), 'gwangun2'), null);
  const s = Core.newBattle(st, { merit: 6 });
  assert.deepEqual([pos(s, 'gwangun1'), pos(s, 'gwangun2')], [[3, 0], [3, 7]]);
});

test('관군 자리에 유닛이 있으면 그 자리에서 가장 가까운 빈 칸', () => {
  // 1장 흑린 자리 (0,3) 를 관군 자리로
  const st = { ...Core.STAGES.ch1, reserves: [{ r: 0, c: 3 }] };
  const g = Core.getUnit(Core.newBattle(st, { merit: 3 }), 'gwangun1');
  assert.deepEqual([g.r, g.c], [0, 2], '위(밖) → 아래(장산범) → 왼쪽 (0,2)');
});
