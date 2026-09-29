import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './load.mjs';

const Core = loadCore();
const ch1 = Core.STAGES.ch1;
const T = (t) => ({ kind: 'terrain', t });
const A = (id) => ({ kind: 'ally', id });
const E = (type) => ({ kind: 'enemy', type });
const ERASE = { kind: 'erase' };
const unitAt = (st, r, c) => [...st.allies, ...st.enemies].find((u) => u.r === r && u.c === c);

test('칠하기는 원본을 바꾸지 않는다', () => {
  const before = JSON.stringify(ch1);
  Core.paintStage(ch1, T('D'), 4, 4);
  assert.equal(JSON.stringify(ch1), before);
});

test('지형 칠하기', () => {
  const st = Core.paintStage(ch1, T('K'), 4, 4);
  assert.equal(st.map[4].charAt(4), 'K');
  assert.equal(st.map[4].length, 8);
});

test('유닛이 있는 칸을 초가집으로 칠하면 유닛이 지워진다. 다른 지형은 유닛을 남긴다', () => {
  const a = Core.paintStage(ch1, T('M'), 7, 2);
  assert.equal(unitAt(a, 7, 2).id, 'yoon');
  const b = Core.paintStage(ch1, T('D'), 7, 2);
  assert.equal(unitAt(b, 7, 2), undefined);
  assert.equal(b.allies.some((x) => x.id === 'yoon'), false);
});

test('아군은 한 명씩: 다른 칸에 놓으면 옮겨진다', () => {
  const st = Core.paintStage(ch1, A('yoon'), 4, 4);
  assert.equal(st.allies.filter((a) => a.id === 'yoon').length, 1);
  assert.equal(unitAt(st, 4, 4).id, 'yoon');
  assert.equal(unitAt(st, 7, 2), undefined);
});

test('아군 순서는 정의표 순서로 유지된다 (동률 판정 순서)', () => {
  let st = Core.resizeStage(ch1, 8, 8);
  st = { ...st, allies: [] };
  st = Core.paintStage(st, A('dallae'), 6, 0);
  st = Core.paintStage(st, A('yoon'), 6, 1);
  st = Core.paintStage(st, A('soun'), 6, 2);
  assert.deepEqual(st.allies.map((a) => a.id), ['yoon', 'soun', 'dallae']);
});

test('요괴는 여러 마리, 흑린은 한 마리 (놓으면 옮겨진다)', () => {
  let st = Core.paintStage(ch1, E('dokkaebi'), 4, 4);
  assert.equal(st.enemies.filter((e) => e.type === 'dokkaebi').length, 3);
  st = Core.paintStage(st, E('heuklin'), 3, 0);
  assert.equal(st.enemies.filter((e) => e.type === 'heuklin').length, 1);
  assert.equal(unitAt(st, 3, 0).type, 'heuklin');
  assert.equal(unitAt(st, 0, 3), undefined);
});

test('요괴 순서: 종류 → 행 → 열 (1장 순서와 같은 규칙)', () => {
  const st = Core.paintStage(ch1, E('dokkaebi'), 0, 0);
  assert.deepEqual(st.enemies.map((e) => `${e.type}@${e.r},${e.c}`), [
    'dokkaebi@0,0', 'dokkaebi@0,1', 'dokkaebi@0,6', 'jangsan@1,3', 'jangsan@1,4', 'bulgasari@2,4', 'heuklin@0,3',
  ]);
});

test('초가집·바위 위에는 유닛을 놓을 수 없다', () => {
  assert.deepEqual(Core.paintStage(ch1, A('yoon'), 1, 1), JSON.parse(Core.encodeStage(ch1)));
  assert.deepEqual(Core.paintStage(ch1, E('dokkaebi'), 1, 1), JSON.parse(Core.encodeStage(ch1)));
});

test('유닛 위에 다른 유닛을 놓으면 바뀐다', () => {
  const st = Core.paintStage(ch1, E('jangsan'), 7, 2); // 윤무겸 자리
  assert.equal(unitAt(st, 7, 2).type, 'jangsan');
  assert.equal(st.allies.some((a) => a.id === 'yoon'), false);
});

test('지우개: 유닛이 있으면 유닛, 없으면 지형을 흙길로', () => {
  const a = Core.paintStage(ch1, ERASE, 0, 3); // 흑린(서낭당 위)
  assert.equal(unitAt(a, 0, 3), undefined);
  assert.equal(a.map[0].charAt(3), 'M', '유닛만 지우고 지형은 그대로');
  const b = Core.paintStage(a, ERASE, 0, 3);
  assert.equal(b.map[0].charAt(3), '.');
});

test('맵 밖을 칠하면 아무 일도 없다', () => {
  assert.deepEqual(Core.paintStage(ch1, T('D'), 8, 0), JSON.parse(Core.encodeStage(ch1)));
});

test('크기 줄이기: 밖으로 나간 유닛은 지워진다', () => {
  const st = Core.resizeStage(ch1, 7, 6);
  assert.equal(st.rows, 7);
  assert.equal(st.cols, 6);
  assert.deepEqual(st.map, ['...MM.', '.D....', '.D....', '...K..', '.....D', '.DD..D', '......']);
  assert.equal(st.allies.some((a) => a.r >= 7), false, '7행 아군 4명 지워짐');
  assert.deepEqual(st.allies.map((a) => a.id), ['dallae']);
  assert.equal(st.enemies.some((e) => e.c >= 6), false, '(0,6) 도깨비 지워짐');
  assert.deepEqual(Core.validateStage(st).filter((p) => p.level === 'error'), []);
});

test('크기 늘리기: 새 칸은 흙길', () => {
  const st = Core.resizeStage(ch1, 10, 9);
  assert.equal(st.map.length, 10);
  assert.equal(st.map[0], '...MM....');
  assert.equal(st.map[9], '.........');
  assert.equal(st.allies.length, 5);
});

test('크기는 6~12행, 6~10열로 맞춘다', () => {
  const small = Core.resizeStage(ch1, 2, 3);
  assert.deepEqual([small.rows, small.cols], [6, 6]);
  const big = Core.resizeStage(ch1, 99, 99);
  assert.deepEqual([big.rows, big.cols], [12, 10]);
});

test('편집한 맵으로도 전투가 만들어진다', () => {
  let st = Core.resizeStage(ch1, 10, 8);
  st = Core.paintStage(st, A('yoon'), 9, 0);
  const s = Core.newBattle(st);
  assert.deepEqual([Core.getUnit(s, 'yoon').r, Core.getUnit(s, 'yoon').c], [9, 0]);
  assert.equal(s.rows, 10);
});

// ── 관군 자리 (specs/chapter2.md 7-2) ──
const R = (index) => ({ kind: 'reserve', index });

test('관군 자리 1·2번 놓기, 옮기기', () => {
  let st = Core.paintStage(ch1, R(0), 4, 4);
  assert.deepEqual(st.reserves, [{ r: 4, c: 4 }]);
  st = Core.paintStage(st, R(1), 4, 0);
  assert.deepEqual(st.reserves, [{ r: 4, c: 4 }, { r: 4, c: 0 }]);
  st = Core.paintStage(st, R(0), 3, 0);
  assert.deepEqual(st.reserves, [{ r: 3, c: 0 }, { r: 4, c: 0 }], '1번이 옮겨진다');
});

test('2번은 1번이 없으면 1번이 된다', () => {
  assert.deepEqual(Core.paintStage(ch1, R(1), 4, 4).reserves, [{ r: 4, c: 4 }]);
});

test('같은 칸에 두 자리를 겹치지 않는다 (빈 칸 없는 목록)', () => {
  let st = Core.paintStage(ch1, R(0), 4, 4);
  st = Core.paintStage(st, R(1), 4, 4);
  assert.deepEqual(st.reserves, [{ r: 4, c: 4 }]);
  assert.equal(st.reserves.every(Boolean), true);
});

test('관군 자리: 초가집 위 금지, 초가집으로 칠하면 사라짐, 지우개는 유닛 → 자리 → 지형', () => {
  assert.equal(Core.paintStage(ch1, R(0), 1, 1).reserves, undefined);
  let st = Core.paintStage(ch1, R(0), 4, 4);
  assert.equal(Core.paintStage(st, T('D'), 4, 4).reserves, undefined);
  st = Core.paintStage(Core.paintStage(ch1, T('K'), 4, 4), R(0), 4, 4);
  st = Core.paintStage(st, ERASE, 4, 4);
  assert.equal(st.reserves, undefined);
  assert.equal(st.map[4].charAt(4), 'K', '자리만 지우고 지형은 그대로');
});

test('관군 자리는 맵 코드에 남고, 크기를 줄이면 밖의 자리는 지워진다', () => {
  let st = Core.paintStage(Core.paintStage(ch1, R(0), 2, 2), R(1), 7, 7);
  const back = Core.decodeStage(Core.encodeStage(st));
  assert.deepEqual(back.stage.reserves, [{ r: 2, c: 2 }, { r: 7, c: 7 }]);
  assert.deepEqual(Core.resizeStage(st, 7, 7).reserves, [{ r: 2, c: 2 }]);
  const bad = JSON.parse(Core.encodeStage(st));
  bad.reserves.push({ r: 0, c: 0 });
  assert.match(Core.decodeStage(JSON.stringify(bad)).error, /관군 자리는 2개까지/);
});
