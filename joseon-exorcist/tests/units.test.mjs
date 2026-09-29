import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './load.mjs';

const Core = loadCore();
const pick = (u, keys) => Object.fromEntries(keys.map((k) => [k, u[k]]));
const STAT = ['name', 'hp', 'atk', 'def', 'mov', 'rng', 'elem', 'r', 'c'];

test('새 전투: 1턴, 흐림, 공적 0, 아군 페이즈', () => {
  const s = Core.newBattle();
  assert.equal(s.turn, 1);
  assert.equal(s.maxTurn, 10);
  assert.equal(s.weather, '흐림');
  assert.equal(s.merit, 0);
  assert.equal(s.phase, 'ally');
  assert.equal(s.result, null);
});

test('아군 5명 수치·시작 위치가 기획서 표 순서와 같다', () => {
  const allies = Core.livingUnits(Core.newBattle(), 'ally');
  assert.deepEqual(allies.map((u) => pick(u, STAT)), [
    { name: '윤무겸', hp: 30, atk: 12, def: 6, mov: 3, rng: 1, elem: '금', r: 7, c: 2 },
    { name: '한결', hp: 24, atk: 10, def: 4, mov: 3, rng: 2, elem: '목', r: 7, c: 3 },
    { name: '여울', hp: 34, atk: 11, def: 7, mov: 5, rng: 1, elem: '토', r: 7, c: 4 },
    { name: '소운', hp: 22, atk: 11, def: 3, mov: 3, rng: 2, elem: '화', r: 7, c: 5 },
    { name: '달래', hp: 26, atk: 7, def: 5, mov: 4, rng: 1, elem: '없음', r: 6, c: 3 },
  ]);
  assert.deepEqual(allies.map((u) => u.skill), ['벽사검', '파사궁', '축지격', '화염부', '정화수']);
  assert.deepEqual(allies.map((u) => u.title), ['벽사청 종사관', '벽사청 궁수', '축지의 도인', '청운 도문 도사', '신당회 만신']);
  assert.deepEqual(allies.map((u) => u.guest), [false, false, true, true, true]);
  for (const u of allies) {
    assert.equal(u.ki, 6);
    assert.equal(u.maxKi, 10);
    assert.equal(u.hp, u.maxHp);
  }
});

test('요괴 6마리 수치·시작 위치가 기획서 표 순서와 같다', () => {
  const enemies = Core.livingUnits(Core.newBattle(), 'enemy');
  const e = (name, elem, r, c) => ({ name, hp: 22, atk: 10, def: 5, mov: 3, rng: 1, elem, r, c });
  assert.deepEqual(enemies.map((u) => pick(u, STAT)), [
    e('도깨비', '목', 0, 1), e('도깨비', '목', 0, 6),
    e('장산범', '토', 1, 3), e('장산범', '토', 1, 4),
    e('불가사리', '금', 2, 4),
    { name: '흑린', hp: 50, atk: 13, def: 8, mov: 2, rng: 1, elem: '수', r: 0, c: 3 },
  ]);
  assert.deepEqual(enemies.map((u) => u.boss), [false, false, false, false, false, true]);
  for (const u of enemies) {
    assert.equal(u.faction, '요괴 세력');
    assert.equal(u.ki, null);
    assert.equal(u.skill, null);
  }
  assert.equal(enemies[5].title, '요괴의 수장');
  assert.equal(enemies[0].title, '—');
});

test('모든 유닛은 통과 가능한 서로 다른 칸에서 시작한다', () => {
  const s = Core.newBattle();
  const seen = new Set();
  for (const u of s.units) {
    assert.equal(Core.isPassable(s, u.r, u.c), true, u.name);
    const key = `${u.r},${u.c}`;
    assert.equal(seen.has(key), false, `${key} 겹침`);
    seen.add(key);
  }
});

test('전투마다 새 상태 — 한 판의 변경이 다음 판에 남지 않는다', () => {
  const a = Core.newBattle();
  a.units[0].hp = 1;
  assert.equal(Core.newBattle().units[0].hp, 30);
});

test('unitAt / getUnit', () => {
  const s = Core.newBattle();
  assert.equal(Core.unitAt(s, 0, 3).name, '흑린');
  assert.equal(Core.unitAt(s, 4, 4), null);
  assert.equal(Core.getUnit(s, 'dallae').name, '달래');
  Core.getUnit(s, 'dallae').alive = false;
  assert.equal(Core.unitAt(s, 6, 3), null, '퇴각한 유닛은 칸을 차지하지 않는다');
});
