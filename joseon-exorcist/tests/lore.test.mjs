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

// ── 벽사록 데이터 (specs/lore.md 9~11장) ──
const ids = Core.LORE.map((e) => e.id);
const byId = Object.fromEntries(Core.LORE.map((e) => [e.id, e]));

test('카테고리 6개, 초기 항목: 세력 3·귀물 3·의식 3·물건 10', () => {
  assert.deepEqual(Core.LORE_CATEGORIES, ['인물', '세력', '귀물', '의식', '물건', '기록']);
  const count = {};
  for (const e of Core.LORE) count[e.cat] = (count[e.cat] || 0) + 1;
  assert.deepEqual(count, { 세력: 3, 귀물: 3, 의식: 3, 물건: 10 });
  assert.equal(new Set(ids).size, ids.length, 'id 중복 없음');
});

test('모든 항목: 고증 등급·설명·재해석 메모', () => {
  for (const e of Core.LORE) {
    assert.ok(Core.HISTORICITY[e.grade], `${e.id} 등급`);
    assert.ok(Core.LORE_CATEGORIES.includes(e.cat), `${e.id} 카테고리`);
    assert.ok(e.text.length > 10, `${e.id} 설명`);
    assert.ok(e.note && e.note.length > 5, `${e.id} 게임 재해석 메모`);
    assert.ok(Array.isArray(e.unlock), `${e.id} 밝힘 조건`);
  }
});

test('세 세력은 모두 창작(C) 조직이고, 실제 역사에 있었다고 쓰지 않는다', () => {
  for (const id of ['byeoksacheong', 'sindanghoe', 'domun']) {
    assert.equal(byId[id].grade, 'C', id);
    assert.match(byId[id].note, /게임 속|역사에 없던/, id);
  }
  assert.match(byId.byeoksacheong.note, /실제 역사에 없던/);
});

test('물건 10개는 ITEM_001~010 순서, 명세의 등급', () => {
  const items = Core.LORE.filter((e) => e.cat === '물건');
  assert.deepEqual(items.map((e) => e.item), Array.from({ length: 10 }, (_, i) => 'ITEM_' + String(i + 1).padStart(3, '0')));
  assert.deepEqual(items.map((e) => e.name), ['정화수', '방상시탈', '도판', '도봉', '문배', '세화', '천중적부', '동지팥', '신칼', '무령']);
  assert.equal(byId.bangsangsital.grade, 'A');
  assert.equal(byId.jeonghwasu.grade, 'B');
});

test('사료·민속 항목(A·B)도 게임 효과가 창작임을 메모에 밝힌다 (물건)', () => {
  for (const e of Core.LORE.filter((x) => x.cat === '물건' && x.grade !== 'C')) {
    assert.match(e.note, /창작|게임에서는|예정/, e.id);
  }
});

test('귀물 항목은 존재 분류를 가진다', () => {
  for (const e of Core.LORE.filter((x) => x.cat === '귀물')) assert.ok(Core.ENTITY_TYPES[e.entityType], e.id);
});

test('밝힘: 세력은 처음부터, 귀물은 만나면, 의식은 1장 승리 뒤, 후속 장 물건은 잠김 (보충 L2)', () => {
  const on = (seen) => Core.LORE.filter((e) => Core.loreUnlocked(e, seen)).map((e) => e.id);
  assert.deepEqual(on([]), ['byeoksacheong', 'sindanghoe', 'domun']);
  const ch1 = Core.loreTokensForBattle(Core.newBattle());
  assert.deepEqual(ch1.sort(), ['enemy:bulgasari', 'enemy:dokkaebi', 'enemy:heuklin', 'enemy:jangsan']);
  assert.ok(on(ch1).includes('heuklin') && on(ch1).includes('dokkaebi') && on(ch1).includes('jangsan'));
  assert.equal(on(ch1).includes('narye'), false);
  const after1 = [...ch1, 'clear:ch1'];
  for (const id of ['narye', 'daena', 'bangsangssi', 'bangsangsital']) assert.ok(on(after1).includes(id), id);
  const ch2 = Core.loreTokensForBattle(Core.newBattle(Core.STAGES.ch2));
  assert.ok(on(ch2).includes('muryeong'), '무녀를 만나면 무령');
  assert.ok(on(ch2).includes('dokkaebi'), '정화된 도깨비도 도깨비');
  assert.ok(on(['skill:정화수']).includes('jeonghwasu'));
  const everything = [...after1, ...ch2, 'skill:정화수', 'clear:ch2'];
  assert.deepEqual(Core.LORE.filter((e) => !Core.loreUnlocked(e, everything)).map((e) => e.id),
    ['dopan', 'dobong', 'munbae', 'sehwa', 'cheonjungjeokbu', 'dongjipat'], '후속 장 물건 6개만 잠김');
});

test('유닛은 정의표 종류(type)를 안다', () => {
  const s = Core.newBattle(Core.STAGES.ch2, { merit: 3 });
  assert.equal(Core.getUnit(s, 'munyeo1').type, 'munyeo');
  assert.equal(Core.getUnit(s, 'gwangun1').type, 'gwangun');
  assert.equal(Core.getUnit(s, 'yoon').type, 'yoon');
});

// ── 용어 사전 (specs/lore.md 7장) ──
import { readHtml } from './load.mjs';

test('용어 사전: 피할 말과 쓸 말', () => {
  const avoid = Core.GLOSSARY.map((g) => g.avoid);
  for (const w of ['퇴마', '엑소시즘', '악마', '저주', '몬스터', '퇴마사']) assert.ok(avoid.includes(w), w);
  for (const g of Core.GLOSSARY) assert.ok(g.use.length > 0, g.avoid);
});

test('화면 문구·대사·벽사록에 피할 말이 없다 (제목 「조선 퇴마전」만 예외)', () => {
  let html = readHtml();
  html = html.replace(/\/\/ GLOSSARY-START[\s\S]*?\/\/ GLOSSARY-END/, ''); // 사전 자체는 뺀다
  html = html.split('조선 퇴마전').join('');                           // 제목
  html = html.replace(/\/\/[^\n]*/g, '');                                // 코드 주석
  for (const g of Core.GLOSSARY) {
    assert.equal(html.includes(g.avoid), false, `"${g.avoid}" 대신 ${g.use.join('·')}`);
  }
});
