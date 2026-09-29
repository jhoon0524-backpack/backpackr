import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './load.mjs';

const Core = loadCore();
const cells = (path) => path.map((p) => `${p.r},${p.c}`);

test('길은 출발 칸과 도착 칸을 포함한다', () => {
  const s = Core.newBattle();
  const yoon = Core.getUnit(s, 'yoon'); // (7,2)
  assert.deepEqual(cells(Core.pathTo(s, yoon, 6, 1)), ['7,2', '6,2', '6,1']);
  assert.deepEqual(cells(Core.pathTo(s, yoon, 7, 2)), ['7,2'], '제자리');
});

test('길 길이 = 이동 칸 수 + 1, 모든 이동 가능 칸에 길이 있다', () => {
  const s = Core.newBattle();
  for (const id of ['yoon', 'yeoul', 'soun', 'dallae']) {
    const u = Core.getUnit(s, id);
    for (const t of Core.moveTargets(s, u)) {
      const p = Core.pathTo(s, u, t.r, t.c);
      assert.equal(p.length, t.cost + 1, `${id} → ${t.r},${t.c}`);
      for (let i = 1; i < p.length; i++) {
        assert.equal(Core.distance(p[i - 1], p[i]), 1, '한 칸씩 걷는다');
        assert.equal(Core.isPassable(s, p[i].r, p[i].c), true);
      }
    }
  }
});

test('막힌 칸과 다른 유닛을 돌아간다', () => {
  const s = Core.newBattle();
  const yeoul = Core.getUnit(s, 'yeoul'); // (7,4) → 약수터 (3,3)
  const p = cells(Core.pathTo(s, yeoul, 3, 3));
  assert.equal(p.length, 6);
  for (const blocked of ['6,3', '5,5', '4,5']) assert.equal(p.includes(blocked), false, blocked);
});

test('갈 수 없는 칸이면 null', () => {
  const s = Core.newBattle();
  assert.equal(Core.pathTo(s, Core.getUnit(s, 'yoon'), 1, 1), null, '초가집');
  assert.equal(Core.pathTo(s, Core.getUnit(s, 'yoon'), 7, 3), null, '한결이 서 있는 칸');
});

test('요괴 이동 이벤트의 길은 실제 도착 칸에서 끝난다', () => {
  const s = Core.newBattle();
  Core.endAllyPhase(s);
  const ev = Core.runEnemyPhase(s).filter((e) => e.type === 'move');
  assert.ok(ev.length > 0);
  for (const e of ev) {
    assert.deepEqual(e.path[0], e.from);
    assert.deepEqual(e.path.at(-1), e.to);
    const u = Core.getUnit(s, e.unitId);
    assert.ok(e.path.length - 1 <= u.mov, `${u.id} 이동력 안`);
  }
});
