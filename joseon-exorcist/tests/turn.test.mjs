import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './load.mjs';

const Core = loadCore();
const fixed = (v) => () => v; // 날씨 랜덤 고정: 0→맑음 0.25→강풍 0.5→비 0.75→흐림
const never = () => { throw new Error('이 턴에는 날씨를 바꾸면 안 된다'); };

// 한 턴을 통째로 넘긴다: 아군 페이즈 끝 → 요괴 페이즈 끝 → 다음 아군 페이즈 시작
function nextTurn(s, rng = fixed(0)) {
  Core.endAllyPhase(s);
  Core.endEnemyPhase(s);
  return Core.startAllyPhase(s, rng);
}

test('1턴 시작: 흐림 유지, 기력 +1 없음', () => {
  const s = Core.newBattle();
  Core.startAllyPhase(s, never);
  assert.equal(s.weather, '흐림');
  for (const u of Core.livingUnits(s, 'ally')) assert.equal(u.ki, 6);
});

test('2턴부터 매 턴 기력 +1, 최대 10', () => {
  const s = Core.newBattle();
  Core.startAllyPhase(s, never);
  const kis = [];
  for (let t = 2; t <= 7; t++) {
    nextTurn(s, fixed(0.99));
    kis.push(Core.getUnit(s, 'yoon').ki);
  }
  assert.deepEqual(kis, [7, 8, 9, 10, 10, 10]);
});

test('날씨는 4·7·10턴 시작에만 바뀐다', () => {
  const s = Core.newBattle();
  Core.startAllyPhase(s, never);
  const seen = [];
  const rolls = { 4: 0, 7: 0.3, 10: 0.6 }; // 맑음, 강풍, 비
  for (let t = 2; t <= 10; t++) {
    nextTurn(s, rolls[t] === undefined ? never : fixed(rolls[t]));
    seen.push(s.weather);
  }
  assert.deepEqual(seen, ['흐림', '흐림', '맑음', '맑음', '맑음', '강풍', '강풍', '강풍', '비']);
});

test('랜덤 값 0~1 을 4종에 고르게 나눈다', () => {
  const pickAt = (v) => {
    const s = Core.newBattle();
    s.turn = 4;
    Core.startAllyPhase(s, fixed(v));
    return s.weather;
  };
  assert.deepEqual([0, 0.24, 0.25, 0.49, 0.5, 0.74, 0.75, 0.999].map(pickAt),
    ['맑음', '맑음', '강풍', '강풍', '비', '비', '흐림', '흐림']);
});

test('아군 페이즈 시작: 약수터 위 아군 HP +10, 최대 HP 초과 안 함', () => {
  const s = Core.newBattle();
  const yoon = Core.getUnit(s, 'yoon');
  yoon.r = 3; yoon.c = 3; yoon.hp = 10;
  const ev = Core.startAllyPhase(s, never);
  assert.equal(yoon.hp, 20);
  assert.deepEqual(ev, [{ type: 'spring', targetId: 'yoon', amount: 10 }]);
  yoon.hp = 25;
  Core.startAllyPhase(s, never);
  assert.equal(yoon.hp, 30);
});

test('요괴 페이즈 시작: 약수터 위 요괴도 회복', () => {
  const s = Core.newBattle();
  const b = Core.getUnit(s, 'bulgasari');
  b.r = 3; b.c = 3; b.hp = 5;
  const ev = Core.endAllyPhase(s);
  assert.equal(s.phase, 'enemy');
  assert.equal(b.hp, 15);
  assert.deepEqual(ev, [{ type: 'spring', targetId: 'bulgasari', amount: 10 }]);
});

test('약수터 회복은 자기 페이즈에만', () => {
  const s = Core.newBattle();
  const yoon = Core.getUnit(s, 'yoon');
  yoon.r = 3; yoon.c = 3; yoon.hp = 10;
  Core.endAllyPhase(s);
  assert.equal(yoon.hp, 10, '요괴 페이즈 시작에 아군은 회복 안 함');
});

test('새 아군 페이즈에 행동 완료 표시가 풀린다', () => {
  const s = Core.newBattle();
  Core.startAllyPhase(s, never);
  for (const u of Core.livingUnits(s, 'ally')) Core.wait(s, u.id);
  assert.equal(Core.allActed(s), true);
  nextTurn(s);
  assert.equal(Core.allActed(s), false);
  assert.equal(s.turn, 2);
  assert.equal(s.phase, 'ally');
});

test('퇴각한 아군은 전원 행동 판정에서 빠진다', () => {
  const s = Core.newBattle();
  for (const u of Core.livingUnits(s, 'ally')) if (u.id !== 'yoon') u.alive = false;
  Core.wait(s, 'yoon');
  assert.equal(Core.allActed(s), true);
});

test('이동만 하고 턴을 끝내면 그 자리에 머물고 취소할 수 없다', () => {
  const s = Core.newBattle();
  Core.moveUnit(s, 'yoon', 6, 1);
  Core.endAllyPhase(s);
  const yoon = Core.getUnit(s, 'yoon');
  assert.deepEqual([yoon.r, yoon.c], [6, 1]);
  assert.equal(yoon.from, null);
});

test('요괴 페이즈에는 아군 페이즈를 다시 끝낼 수 없다', () => {
  const s = Core.newBattle();
  Core.endAllyPhase(s);
  assert.deepEqual(Core.endAllyPhase(s), []);
  assert.equal(s.phase, 'enemy');
});
