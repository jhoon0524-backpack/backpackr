import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './load.mjs';

const Core = loadCore();
const ch1 = Core.STAGES.ch1;
const clone = (x) => JSON.parse(JSON.stringify(x));
const msgs = (list) => list.map((p) => p.msg);

test('1장 스테이지는 문제가 없다', () => {
  assert.deepEqual(Core.validateStage(ch1), []);
});

test('맵 코드로 바꿨다 되돌리면 같다', () => {
  const code = Core.encodeStage(ch1);
  assert.equal(typeof code, 'string');
  assert.equal(code.includes('\n'), false, '한 줄');
  const back = Core.decodeStage(code);
  assert.equal(back.error, undefined);
  assert.deepEqual(back.stage, clone(ch1));
  assert.deepEqual(Core.newBattle(back.stage), Core.newBattle(), '코드로 만든 전투 = 1장 전투');
});

test('앞뒤 공백·줄바꿈이 붙어 있어도 읽는다 (복사·붙여넣기 대비)', () => {
  assert.equal(Core.decodeStage('  \n' + Core.encodeStage(ch1) + '\n ').error, undefined);
});

test('잘못된 코드는 이유와 함께 거부한다', () => {
  assert.match(Core.decodeStage('아무거나').error, /형식이 잘못/);
  const bad = (patch) => { const s = clone(ch1); patch(s); return Core.decodeStage(JSON.stringify(s)).error; };
  assert.match(bad((s) => { s.map[0] = '...X....'; }), /알 수 없는 지형 글자 "X"/);
  assert.match(bad((s) => { s.enemies.push({ type: 'gumiho', r: 5, c: 5 }); }), /알 수 없는 요괴 "gumiho"/);
  assert.match(bad((s) => { s.allies.push({ id: 'nobody', r: 5, c: 5 }); }), /알 수 없는 아군/);
  assert.match(bad((s) => { s.rows = 20; }), /행 수는 6~12/);
  assert.match(bad((s) => { s.cols = 4; }), /열 수는 6~10/);
  assert.match(bad((s) => { s.map.pop(); }), /줄 수가 행 수와 다릅니다/);
  assert.match(bad((s) => { s.map[2] = '...'; }), /3번째 줄 길이/);
});

test('경고는 불러오기를 막지 않는다', () => {
  const s = clone(ch1);
  s.enemies = s.enemies.filter((e) => e.type !== 'heuklin');
  s.allies = [];
  const r = Core.decodeStage(JSON.stringify(s));
  assert.equal(r.error, undefined);
  assert.deepEqual(msgs(r.problems).sort(), ['아군이 한 명도 없습니다', '흑린이 없으면 이길 수 없습니다'].sort());
  assert.ok(r.problems.every((p) => p.level === 'warn'));
});

test('유닛 위치 경고: 초가집 위, 맵 밖, 같은 칸, 두 번 배치, 흑린 둘', () => {
  const s = clone(ch1);
  s.allies.push({ id: 'yoon', r: 1, c: 1 });            // 초가집 + 두 번
  s.enemies.push({ type: 'dokkaebi', r: 9, c: 0 });     // 맵 밖
  s.enemies.push({ type: 'jangsan', r: 7, c: 2 });      // 윤무겸과 같은 칸
  s.enemies.push({ type: 'heuklin', r: 4, c: 4 });      // 흑린 둘
  const p = Core.validateStage(s);
  const text = msgs(p).join(' | ');
  assert.match(text, /윤무겸이 초가집·바위 위/);
  assert.match(text, /윤무겸이 두 번/);
  assert.match(text, /도깨비가 맵 밖/);
  assert.match(text, /장산범과 윤무겸이 같은 칸/);
  assert.match(text, /흑린은 한 마리만/);
  const rock = p.find((x) => /초가집/.test(x.msg));
  assert.deepEqual([rock.r, rock.c], [1, 1], '경고에 칸 위치가 붙는다');
});
