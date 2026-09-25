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
