import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './load.mjs';

const Core = loadCore();
const at = (u) => [u.r, u.c];

// 빈 8×8 맵에 원하는 유닛만. allies: {id:[r,c,hp]}, enemies: [[type,r,c,hp]]
function scene(allies, enemies, map) {
  const st = {
    v: 1, name: 't', rows: 8, cols: 8,
    map: map || Array(8).fill('........'),
    allies: Object.entries(allies).map(([id, [r, c]]) => ({ id, r, c })),
    enemies: enemies.map(([type, r, c]) => ({ type, r, c })),
  };
  const s = Core.newBattle(st);
  for (const [id, [, , hp]] of Object.entries(allies)) if (hp !== undefined) Core.getUnit(s, id).hp = hp;
  enemies.forEach(([type, , , hp], i) => {
    if (hp !== undefined) s.units.filter((u) => u.side === 'enemy')[i].hp = hp;
  });
  s.phase = 'enemy';
  return { s, u: (id) => Core.getUnit(s, id) };
}

// ── 무녀 (보충 S5) ──
test('무녀는 칠 수 있으면 거리 2 에서 쏜다 (붙지 않는다)', () => {
  // 무녀 (0,4), 윤무겸 (4,4). 이동 3 → 칠 수 있는 칸 중 윤무겸과 거리 2 인 칸을 고른다
  const { s, u } = scene({ yoon: [4, 4] }, [['munyeo', 0, 4], ['dallae_boss', 7, 7]]);
  const ev = Core.enemyAct(s, 'munyeo');
  assert.equal(ev.find((e) => e.type === 'damage').targetId, 'yoon');
  assert.equal(Core.distance(u('munyeo'), u('yoon')), 2);
  assert.deepEqual(at(u('munyeo')), [2, 4], '거리 2 칸 중 이동 칸이 가장 적은 칸');
  assert.equal(u('yoon').hp, 30 - (9 - 6));
});

test('무녀는 옆에 붙은 아군이 있으면 물러나서 쏜다', () => {
  const { s, u } = scene({ hangyeol: [4, 4] }, [['munyeo', 3, 4], ['dallae_boss', 7, 7]]);
  Core.enemyAct(s, 'munyeo');
  assert.equal(Core.distance(u('munyeo'), u('hangyeol')), 2);
});

test('무녀는 칠 수 없으면 1장 요괴처럼 다가간다', () => {
  const { s, u } = scene({ yoon: [7, 0] }, [['munyeo', 0, 0], ['dallae_boss', 0, 7]]);
  Core.enemyAct(s, 'munyeo');
  assert.deepEqual(at(u('munyeo')), [3, 0]);
});

test('정화된 요괴는 1장 일반 요괴 AI (붙어서 친다)', () => {
  const { s, u } = scene({ yoon: [4, 4] }, [['dokkaebi_p', 1, 4], ['dallae_boss', 7, 7]]);
  Core.enemyAct(s, 'dokkaebi_p');
  assert.equal(Core.distance(u('dokkaebi_p'), u('yoon')), 1);
});

// ── 달래 (보충 S3·S4) ──
test('달래는 공격하지 않고 아군에게서 가장 먼 칸으로 도망친다', () => {
  const { s, u } = scene({ yoon: [4, 3] }, [['dallae_boss', 4, 4]]);
  const before = Core.moveTargets(s, u('dallae_boss')); // 이동 전에 후보 칸을 잰다
  const ev = Core.enemyAct(s, 'dallae_boss');
  assert.equal(ev.some((e) => e.type === 'damage'), false);
  const d = Core.distance(u('dallae_boss'), u('yoon'));
  for (const p of before) assert.ok(Core.distance(p, u('yoon')) <= d, `${p.r},${p.c} 가 더 멀다`);
  assert.equal(d, 5);
});

test('먼 칸이 여럿이면 이동 칸 적은 → 행 → 열', () => {
  // 거리 5 후보: (0,4)(1,5)(2,6)(3,7)(5,7)(7,5) 모두 이동 4칸 → 행이 가장 작은 (0,4)
  const { s, u } = scene({ yoon: [4, 3] }, [['dallae_boss', 4, 4]]);
  Core.enemyAct(s, 'dallae_boss');
  assert.deepEqual(at(u('dallae_boss')), [0, 4]);
});

test('HP 절반 이하 동료가 있으면 다가가 정화수 (+12, 기력 −4)', () => {
  const { s, u } = scene({ yoon: [7, 0] }, [['munyeo', 2, 4, 6], ['dallae_boss', 0, 7]]);
  const ev = Core.enemyAct(s, 'dallae_boss');
  const heal = ev.find((e) => e.type === 'heal');
  assert.deepEqual([heal.targetId, heal.amount], ['munyeo', 12]);
  assert.equal(u('munyeo').hp, 18);
  assert.equal(u('dallae_boss').ki, 2);
  assert.ok(Core.distance(u('dallae_boss'), u('munyeo')) <= 2);
});

test('회복은 최대 HP 를 넘지 않고, 여럿이면 HP 비율 낮은 동료부터', () => {
  const { s, u } = scene({ yoon: [7, 0] }, [['munyeo', 2, 4, 9], ['dokkaebi_p', 2, 5, 3], ['dallae_boss', 0, 7]]);
  const ev = Core.enemyAct(s, 'dallae_boss');
  const heal = ev.find((e) => e.type === 'heal');
  assert.equal(heal.targetId, 'dokkaebi_p', '3/18 < 9/20');
  assert.equal(u('dokkaebi_p').hp, 15);
});

test('자기 HP 가 절반 이하면 자기도 고친다', () => {
  const { s, u } = scene({ yoon: [7, 0] }, [['dallae_boss', 0, 7, 15]]);
  const ev = Core.enemyAct(s, 'dallae_boss');
  assert.equal(ev.find((e) => e.type === 'heal').targetId, 'dallae_boss');
  assert.equal(u('dallae_boss').hp, 27);
});

test('기력 4 미만이면 회복 없이 도망만', () => {
  const { s, u } = scene({ yoon: [7, 0] }, [['munyeo', 2, 4, 6], ['dallae_boss', 0, 7]]);
  u('dallae_boss').ki = 3;
  const ev = Core.enemyAct(s, 'dallae_boss');
  assert.equal(ev.some((e) => e.type === 'heal'), false);
  assert.equal(u('munyeo').hp, 6);
});

test('절반 초과면 회복하지 않는다 (경계: 정확히 절반은 회복)', () => {
  const a = scene({ yoon: [7, 0] }, [['munyeo', 2, 4, 11], ['dallae_boss', 0, 7]]);
  assert.equal(Core.enemyAct(a.s, 'dallae_boss').some((e) => e.type === 'heal'), false);
  const b = scene({ yoon: [7, 0] }, [['munyeo', 2, 4, 10], ['dallae_boss', 0, 7]]);
  assert.equal(Core.enemyAct(b.s, 'dallae_boss').some((e) => e.type === 'heal'), true);
});

test('흑린은 여전히 자리를 지킨다 (ai: hold)', () => {
  const { s, u } = scene({ yoon: [4, 4] }, [['heuklin', 0, 0]]);
  assert.deepEqual(Core.enemyAct(s, 'heuklin'), []);
  assert.deepEqual(at(u('heuklin')), [0, 0]);
});

// ── 달래 탈출 (specs/chapter2.md 7-1) ──
// 8×8, 오른쪽 위 (0,7) 이 탈출로
const ESC = ['.......E', '........', '........', '........', '........', '........', '........', '........'];

test('달래는 탈출로에 가까워지는 칸으로 간다 (아군에게서 먼 칸이 아니라)', () => {
  // 윤무겸이 오른쪽 위에 있어도 탈출로 쪽으로 간다
  const { s, u } = scene({ yoon: [2, 5] }, [['dallae_boss', 6, 3]], ESC);
  const before = Core.escapeMap(s, u('dallae_boss'))['6,3'];
  Core.enemyAct(s, 'dallae_boss');
  const after = Core.escapeMap(s, u('dallae_boss'))[`${u('dallae_boss').r},${u('dallae_boss').c}`];
  assert.equal(before - after, 4, '이동력 4 만큼 가까워진다');
});

test('탈출로에 닿으면 즉시 패배', () => {
  const { s, u } = scene({ yoon: [7, 0] }, [['munyeo', 5, 0], ['dallae_boss', 2, 5]], ESC);
  const ev = Core.enemyAct(s, 'dallae_boss');
  assert.deepEqual(at(u('dallae_boss')), [0, 7]);
  assert.deepEqual(ev.slice(-2).map((e) => e.type), ['escape', 'result']);
  assert.equal(s.result, 'lose');
  assert.equal(s.phase, 'over');
  assert.deepEqual(Core.enemyAct(s, 'munyeo'), [], '남은 요괴는 행동하지 않는다');
});

test('아군이 탈출로에 서 있으면 그 칸으로는 못 나간다 (길막)', () => {
  const { s, u } = scene({ yoon: [0, 7] }, [['dallae_boss', 2, 5]], ESC);
  Core.enemyAct(s, 'dallae_boss');
  assert.equal(s.result, null);
  assert.equal(Core.isEscape(s, u('dallae_boss').r, u('dallae_boss').c), false);
});

test('회복이 탈출보다 먼저: 회복하는 턴에는 동료 곁에서 탈출로에 가까운 칸', () => {
  const { s, u } = scene({ yoon: [7, 0] }, [['munyeo', 4, 2, 5], ['dallae_boss', 5, 3]], ESC);
  const ev = Core.enemyAct(s, 'dallae_boss');
  assert.equal(ev.find((e) => e.type === 'heal').targetId, 'munyeo');
  assert.ok(Core.distance(u('dallae_boss'), u('munyeo')) <= 2);
  // 무녀 거리 2 안 칸 중 탈출로에 가장 가까운 칸
  const d = Core.escapeMap(s, u('dallae_boss'));
  const mine = d[`${u('dallae_boss').r},${u('dallae_boss').c}`];
  // (4-a, 2+b), a+b≤2 → 탈출로 (0,7) 까지 9-(a+b) ≥ 7. 최소 7칸 남는 칸을 고른다
  assert.equal(mine, 7);
});

test('탈출로까지 길이 완전히 막히면 아군에게서 먼 칸으로 (예전 규칙)', () => {
  // 탈출로 (0,7) 을 초가집이 감싼다
  const walled = ['......DE', '.......D', '........', '........', '........', '........', '........', '........'];
  const { s, u } = scene({ yoon: [4, 3] }, [['dallae_boss', 4, 4]], walled);
  Core.enemyAct(s, 'dallae_boss');
  assert.equal(Core.distance(u('dallae_boss'), u('yoon')), 5);
});
