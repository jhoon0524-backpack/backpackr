import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './load.mjs';

const Core = loadCore();
const ch2 = Core.STAGES.ch2;

test('2장 스테이지: 10×8, 12턴, 문제 없음', () => {
  assert.deepEqual([ch2.rows, ch2.cols, ch2.maxTurn], [10, 8, 12]);
  assert.deepEqual(Core.validateStage(ch2), []);
});

test('2장 아군: 윤무겸·한결·여울·소운 (달래 없음)', () => {
  assert.deepEqual(ch2.allies.map((a) => a.id), ['yoon', 'hangyeol', 'yeoul', 'soun']);
});

test('2장 적: 무녀 2·정화 도깨비 2·정화 장산범 1·달래 보스', () => {
  const count = {};
  for (const e of ch2.enemies) count[e.type] = (count[e.type] || 0) + 1;
  assert.deepEqual(count, { munyeo: 2, dokkaebi_p: 2, jangsan_p: 1, dallae_boss: 1 });
  assert.equal(Core.maxMerit(ch2), 8, '보충 S11');
});

test('2장 전투 상태: 12턴 제한, 보스는 달래', () => {
  const s = Core.newBattle(ch2);
  assert.equal(s.maxTurn, 12);
  assert.deepEqual(s.units.filter((u) => u.boss).map((u) => u.id), ['dallae_boss']);
  assert.deepEqual(Core.enemyOrder(s), ['munyeo1', 'munyeo2', 'dokkaebi_p1', 'dokkaebi_p2', 'jangsan_p', 'dallae_boss']);
});

test('턴 제한은 맵 코드에도 남는다', () => {
  const back = Core.decodeStage(Core.encodeStage(ch2));
  assert.equal(back.stage.maxTurn, 12);
  assert.equal(JSON.parse(Core.encodeStage(Core.STAGES.ch1)).maxTurn, undefined, '1장은 기본 10');
  const bad = JSON.parse(Core.encodeStage(ch2));
  bad.maxTurn = 0;
  assert.match(Core.decodeStage(JSON.stringify(bad)).error, /턴 제한/);
});

test('12턴 요괴 페이즈가 끝나면 패배', () => {
  const s = Core.newBattle(ch2);
  s.turn = 11;
  s.phase = 'enemy';
  Core.endEnemyPhase(s);
  assert.equal(s.result, null);
  assert.equal(s.turn, 12);
  s.phase = 'enemy';
  Core.endEnemyPhase(s);
  assert.equal(s.result, 'lose');
});
