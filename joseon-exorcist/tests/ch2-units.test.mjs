import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './load.mjs';

const Core = loadCore();
const pick = (d, keys) => Object.fromEntries(keys.map((k) => [k, d[k]]));
const STAT = ['name', 'emoji', 'hp', 'atk', 'def', 'mov', 'rng', 'elem'];

// 아군 2명 + 적 한 종류씩 세운 작은 스테이지
function stageWith(types) {
  return {
    v: 1, name: 't', rows: 6, cols: 6,
    map: ['......', '......', '......', '......', '......', '......'],
    allies: [{ id: 'yoon', r: 5, c: 0 }],
    enemies: types.map((type, i) => ({ type, r: 0, c: i })),
  };
}

test('관군 수치 (specs/chapter2.md 1-2)', () => {
  assert.deepEqual(pick(Core.ALLY_DEFS.gwangun, [...STAT, 'faction', 'guest', 'skill']), {
    name: '관군', emoji: '🪖', hp: 20, atk: 9, def: 5, mov: 3, rng: 1, elem: '없음',
    faction: '벽사청', guest: false, skill: null,
  });
  assert.equal(Core.ALLY_ORDER.includes('gwangun'), false, '관군은 에디터에서 직접 놓지 않는다');
});

test('2장 적 수치 (specs/chapter2.md 2-2)', () => {
  const T = Core.ENEMY_TYPES;
  assert.deepEqual(pick(T.munyeo, STAT), { name: '신당회 무녀', emoji: '🪭', hp: 20, atk: 9, def: 4, mov: 3, rng: 2, elem: '없음' });
  assert.deepEqual(pick(T.dokkaebi_p, STAT), { name: '정화된 도깨비', emoji: '👹', hp: 18, atk: 8, def: 4, mov: 3, rng: 1, elem: '목' });
  assert.deepEqual(pick(T.jangsan_p, STAT), { name: '정화된 장산범', emoji: '🐅', hp: 18, atk: 8, def: 4, mov: 3, rng: 1, elem: '토' });
  assert.deepEqual(pick(T.dallae_boss, STAT), { name: '달래', emoji: '🔔', hp: 40, atk: 9, def: 6, mov: 4, rng: 1, elem: '없음' });
  assert.equal(T.dallae_boss.boss, true);
});

test('소속·칭호·기력 (보충 S6, S2)', () => {
  const s = Core.newBattle(stageWith(['munyeo', 'dokkaebi_p', 'dallae_boss']));
  const u = (id) => Core.getUnit(s, id);
  assert.deepEqual([u('munyeo').faction, u('munyeo').title, u('munyeo').ki], ['신당회', '—', null]);
  assert.equal(u('dokkaebi_p').faction, '신당회 (정화된 요괴)');
  assert.deepEqual([u('dallae_boss').faction, u('dallae_boss').title], ['신당회', '신당회 만신']);
  assert.deepEqual([u('dallae_boss').ki, u('dallae_boss').maxKi, u('dallae_boss').skill], [6, 10, '생명수']);
});

test('1장 요괴 표시는 그대로', () => {
  const s = Core.newBattle();
  const h = Core.getUnit(s, 'heuklin');
  assert.deepEqual([h.faction, h.title, h.ki], ['요괴 세력', '요괴의 수장', null]);
  assert.deepEqual([Core.getUnit(s, 'dokkaebi1').faction, Core.getUnit(s, 'dokkaebi1').title], ['요괴 세력', '—']);
});

test('스킬 없는 유닛(관군)은 기력이 있어도 스킬을 못 쓴다', () => {
  const st = stageWith(['dokkaebi_p']);
  const s = Core.newBattle(st);
  const y = Core.getUnit(s, 'yoon');
  y.skill = null; // 관군처럼 스킬 없음
  y.r = 1; y.c = 0;
  assert.equal(Core.canSkill(s, y), false);
  assert.equal(Core.useSkill(s, 'yoon', 'dokkaebi_p'), null);
  assert.equal(Core.canAttack(s, y), true);
});

test('2장 적도 에디터에서 놓을 수 있고, 보스는 흑린·달래 중 하나만', () => {
  for (const t of ['munyeo', 'dokkaebi_p', 'jangsan_p', 'dallae_boss']) assert.ok(Core.ENEMY_ORDER.includes(t), t);
  let st = Core.paintStage(Core.STAGES.ch1, { kind: 'enemy', type: 'dallae_boss' }, 4, 4);
  assert.equal(st.enemies.filter((e) => Core.ENEMY_TYPES[e.type].boss).map((e) => e.type).join(), 'dallae_boss');
});
