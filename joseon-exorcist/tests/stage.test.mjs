import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './load.mjs';

const Core = loadCore();

const small = {
  v: 1, name: '시험 맵', rows: 6, cols: 7,
  map: ['.......', '.D.....', '...M...', '.......', '..K....', '.......'],
  allies: [{ id: 'hangyeol', r: 5, c: 0 }, { id: 'yoon', r: 5, c: 1 }],
  enemies: [{ type: 'heuklin', r: 0, c: 6 }, { type: 'jangsan', r: 1, c: 3 }]
};

test('newBattle() 은 1장 스테이지로 만든다', () => {
  const a = Core.newBattle();
  const b = Core.newBattle(Core.STAGES.ch1);
  assert.deepEqual(a, b);
});

test('다른 크기의 스테이지로 전투를 만든다', () => {
  const s = Core.newBattle(small);
  assert.equal(s.rows, 6);
  assert.equal(s.cols, 7);
  assert.equal(Core.terrainAt(s, 2, 3), 'M');
  assert.equal(Core.isPassable(s, 1, 1), false);
  assert.equal(Core.isPassable(s, 0, 7), false, '열 7 은 맵 밖');
  assert.equal(Core.isPassable(s, 5, 6), true);
});

test('아군은 스테이지 순서, 수치는 정의표에서', () => {
  const s = Core.newBattle(small);
  const allies = Core.livingUnits(s, 'ally');
  assert.deepEqual(allies.map((u) => u.id), ['hangyeol', 'yoon']);
  assert.equal(allies[1].hp, 30);
  assert.deepEqual([allies[1].r, allies[1].c], [5, 1]);
});

test('요괴 id: 한 마리면 종류 이름, 여럿이면 번호', () => {
  const s = Core.newBattle(small);
  assert.deepEqual(Core.enemyOrder(s), ['heuklin', 'jangsan']);
  assert.deepEqual(Core.enemyOrder(Core.newBattle()), ['dokkaebi1', 'dokkaebi2', 'jangsan1', 'jangsan2', 'bulgasari', 'heuklin']);
});

test('전투가 스테이지 데이터를 바꾸지 않는다', () => {
  const before = JSON.stringify(Core.STAGES.ch1);
  const s = Core.newBattle();
  s.map[0] = 'DDDDDDDD';
  Core.getUnit(s, 'yoon').r = 0;
  assert.equal(JSON.stringify(Core.STAGES.ch1), before);
});

test('작은 맵에서도 한 판이 끝까지 돈다', () => {
  const s = Core.newBattle(small);
  for (let guard = 0; s.result === null && guard < 20; guard++) {
    Core.startAllyPhase(s, () => 0.5);
    for (const u of Core.livingUnits(s, 'ally')) Core.wait(s, u.id);
    Core.endAllyPhase(s);
    Core.runEnemyPhase(s);
  }
  assert.equal(s.result, 'lose');
});

test('공적 최대 = 보스 아닌 적 수 + 3 (1장 = 8)', () => {
  assert.equal(Core.maxMerit(Core.STAGES.ch1), 8);
  assert.equal(Core.maxMerit(small), 1 + 3);
});

test('보스가 흑린이 아니어도 보스 격파 = 승리 (보스 플래그 기준)', () => {
  const s = Core.newBattle(small);
  const boss = Core.getUnit(s, 'heuklin');
  assert.equal(boss.boss, true);
  const yoon = Core.getUnit(s, 'yoon');
  yoon.r = 0; yoon.c = 5; boss.hp = 1;
  Core.attack(s, 'yoon', 'heuklin');
  assert.equal(s.result, 'win');
});
