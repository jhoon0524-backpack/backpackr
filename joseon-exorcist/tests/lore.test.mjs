import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './load.mjs';

const Core = loadCore();

// ── 존재 분류 (specs/lore.md 6장) ──
test('존재 분류 6가지', () => {
  assert.deepEqual(Object.keys(Core.ENTITY_TYPES), ['JAPGWI', 'YEOKGWI', 'WONGWI', 'YOGOE', 'SINRYEONG', 'HUMAN']);
});

test('모든 적 종류에 존재 분류가 있다: 요괴는 YOGOE, 신당회는 HUMAN', () => {
  for (const [type, d] of Object.entries(Core.ENEMY_TYPES)) {
    assert.ok(Core.ENTITY_TYPES[d.entityType], `${type} 분류 없음`);
  }
  for (const t of ['dokkaebi', 'jangsan', 'bulgasari', 'heuklin', 'dokkaebi_p', 'jangsan_p']) {
    assert.equal(Core.ENEMY_TYPES[t].entityType, 'YOGOE', t);
  }
  for (const t of ['munyeo', 'dallae_boss']) assert.equal(Core.ENEMY_TYPES[t].entityType, 'HUMAN', t);
});

test('사람 분류와 사람 공적 표시(human)가 어긋나지 않는다', () => {
  for (const [type, d] of Object.entries(Core.ENEMY_TYPES)) {
    assert.equal(d.entityType === 'HUMAN', !!d.human, type);
  }
});

test('전투 유닛도 분류를 가진다 (아군은 사람)', () => {
  const s = Core.newBattle(Core.STAGES.ch2, { merit: 6 });
  for (const u of s.units) assert.ok(Core.ENTITY_TYPES[u.entityType], u.id);
  assert.equal(Core.getUnit(s, 'yoon').entityType, 'HUMAN');
  assert.equal(Core.getUnit(s, 'gwangun1').entityType, 'HUMAN');
  assert.equal(Core.getUnit(s, 'jangsan_p').entityType, 'YOGOE');
});

test('고증 등급 A·B·C', () => {
  assert.deepEqual(Object.keys(Core.HISTORICITY), ['A', 'B', 'C']);
  assert.equal(Core.HISTORICITY.A.label, '사료 기반');
  assert.equal(Core.HISTORICITY.C.label, '창작 재구성');
});

// ── 기술 이름 (specs/lore.md 8장) ──
function scene(allies, enemies) {
  const st = {
    v: 1, name: 't', rows: 8, cols: 8, map: Array(8).fill('........'),
    allies: Object.entries(allies).map(([id, [r, c]]) => ({ id, r, c })),
    enemies: enemies.map(([type, r, c]) => ({ type, r, c })),
  };
  const s = Core.newBattle(st);
  s.phase = 'enemy';
  return s;
}

test('무녀의 기본 원거리 공격 이름은 무령 (수치는 그대로)', () => {
  assert.equal(Core.ENEMY_TYPES.munyeo.attackName, '무령');
  assert.deepEqual([Core.ENEMY_TYPES.munyeo.atk, Core.ENEMY_TYPES.munyeo.rng], [9, 2]);
  const s = scene({ yoon: [4, 4] }, [['munyeo', 2, 4], ['dallae_boss', 7, 7]]);
  const ev = Core.enemyAct(s, 'munyeo').find((e) => e.type === 'damage');
  assert.equal(ev.name, '무령');
});

test('이름 없는 기본공격은 null, 스킬은 스킬 이름', () => {
  const s = Core.newBattle();
  const y = Core.getUnit(s, 'yoon');
  y.r = 0; y.c = 0;
  assert.equal(Core.attack(s, 'yoon', 'dokkaebi1')[0].name, null);
  const s2 = Core.newBattle();
  const y2 = Core.getUnit(s2, 'yoon');
  y2.r = 0; y2.c = 0;
  assert.equal(Core.useSkill(s2, 'yoon', 'dokkaebi1')[0].name, '벽사검');
});

test('달래의 회복(아군·적 모두)은 정화수', () => {
  const s = Core.newBattle();
  Core.getUnit(s, 'hangyeol').hp = 5;
  assert.equal(Core.useSkill(s, 'dallae', 'hangyeol')[0].name, '정화수');
  const e = scene({ yoon: [7, 0] }, [['munyeo', 2, 4], ['dallae_boss', 0, 7]]);
  Core.getUnit(e, 'munyeo').hp = 5;
  assert.equal(Core.enemyAct(e, 'dallae_boss').find((x) => x.type === 'heal').name, '정화수');
});
