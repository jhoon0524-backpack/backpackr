// 월드맵 (specs/worldmap.md)
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './load.mjs';

const Core = loadCore();
const fresh = { v: 1, cleared: [], merit: 0 };
const after1 = { v: 1, cleared: ['ch1'], merit: 2 };
const after2 = { v: 1, cleared: ['ch1', 'ch2'], merit: 7 };

test('지역 8곳, 상태 8가지, 모든 지역에 이름·표식·위치·설명', () => {
  assert.deepEqual(Core.REGIONS.map((r) => r.id), ['hq', 'heukseok', 'yeougol', 'keungoeul', 'seonang', 'pyesachal', 'sangil', 'naru']);
  assert.deepEqual(Object.keys(Core.REGION_STATUS),
    ['HQ', 'PEACEFUL', 'UNKNOWN', 'OMEN', 'EXORCISM_REQUIRED', 'STABILIZED', 'LOCKED', 'BLOCKED']);
  for (const r of Core.REGIONS) {
    assert.ok(r.name && r.mark && r.desc.default, r.id);
    assert.ok(r.x >= 0 && r.x <= 100 && r.y >= 0 && r.y <= 130, `${r.id} 위치`);
  }
});

test('빨간 상태는 괴변 발생, 안정됨 — 화면에 퇴마·정화라고 쓰지 않는다', () => {
  assert.equal(Core.REGION_STATUS.EXORCISM_REQUIRED, '괴변 발생');
  assert.equal(Core.REGION_STATUS.STABILIZED, '안정됨');
});

test('연결선은 양쪽에서 같고, 모든 지역이 본진과 이어진다', () => {
  for (const r of Core.REGIONS) {
    for (const id of r.links) assert.ok(Core.regionById(id).links.includes(r.id), `${r.id}–${id}`);
  }
  const seen = new Set(['hq']);
  const queue = ['hq'];
  while (queue.length) for (const id of Core.regionById(queue.shift()).links) if (!seen.has(id)) { seen.add(id); queue.push(id); }
  assert.equal(seen.size, 8);
});

test('새 게임 지도', () => {
  assert.deepEqual(Core.worldState(fresh), {
    hq: 'HQ', heukseok: 'EXORCISM_REQUIRED', yeougol: 'UNKNOWN', keungoeul: 'PEACEFUL',
    seonang: 'OMEN', pyesachal: 'LOCKED', sangil: 'BLOCKED', naru: 'PEACEFUL'
  });
});

test('1장 완료: 흑석촌 안정됨, 여우골 괴변 발생', () => {
  const w = Core.worldState(after1);
  assert.deepEqual([w.heukseok, w.yeougol, w.seonang], ['STABILIZED', 'EXORCISM_REQUIRED', 'OMEN']);
});

test('2장 완료: 여우골 안정됨, 서낭고개 이상 징후 유지', () => {
  const w = Core.worldState(after2);
  assert.deepEqual([w.heukseok, w.yeougol, w.seonang], ['STABILIZED', 'STABILIZED', 'OMEN']);
});

test('이전 저장(v0.3~v0.5 형식)도 저장값만으로 계산된다 — 따로 저장하는 지역 상태가 없다', () => {
  const old = Core.checkProgress({ v: 1, cleared: ['ch1', 'ch2'], merit: 13 });
  assert.equal(Core.worldState(old).yeougol, 'STABILIZED');
  // 깬 장과 지역이 어긋나는 경우가 없다
  for (const p of [fresh, after1, after2]) {
    const w = Core.worldState(p);
    for (const r of Core.REGIONS.filter((x) => x.chapter)) {
      assert.equal(w[r.id] === 'STABILIZED', p.cleared.includes(r.chapter), `${r.id} ${p.cleared}`);
    }
  }
});

test('상태별 설명: 여우골 미확인 → 목격 → 회수', () => {
  const y = Core.regionById('yeougol');
  assert.match(Core.regionDesc(y, 'UNKNOWN'), /아직 보고가 들어오지 않았다/);
  assert.match(Core.regionDesc(y, 'EXORCISM_REQUIRED'), /달래가/);
  assert.match(Core.regionDesc(y, 'STABILIZED'), /신당회 사람들은 이미 모습을 감췄다/);
  assert.match(Core.regionDesc(Core.regionById('heukseok'), 'STABILIZED'), /흑린의 위협이 사라졌다/);
});

test('급보: 장을 깬 뒤 한 번, 본 급보는 다시 안 나온다', () => {
  assert.deepEqual(Core.worldNews(fresh, []), []);
  assert.deepEqual(Core.worldNews(after1, []).map((n) => [n.id, n.region]), [['news:ch1', 'yeougol']]);
  assert.deepEqual(Core.worldNews(after1, ['news:ch1']), []);
  assert.deepEqual(Core.worldNews(after2, ['news:ch1']).map((n) => n.region), ['seonang']);
  assert.deepEqual(Core.worldNews(after2, []).map((n) => n.id), ['news:ch2'],
    '2장까지 깬 이전 저장은 최근 급보만 — 이미 안정된 여우골을 가리키는 지난 급보는 뜨지 않는다');
});

test('현재 임무: 흑석촌 → 여우골 → 서낭고개 조사 준비 중', () => {
  assert.deepEqual([Core.currentMission(fresh).region, Core.currentMission(fresh).ready], ['heukseok', true]);
  assert.deepEqual([Core.currentMission(after1).region, Core.currentMission(after1).title], ['yeougol', '사라진 여의주']);
  assert.deepEqual([Core.currentMission(after2).region, Core.currentMission(after2).ready], ['seonang', false]);
});

test('장 무대 지역: 흑석촌 1장, 여우골 2장, 나머지는 전투 없음', () => {
  assert.deepEqual(Core.REGIONS.filter((r) => r.chapter).map((r) => [r.id, r.chapter]), [['heukseok', 'ch1'], ['yeougol', 'ch2']]);
  for (const r of Core.REGIONS.filter((x) => x.chapter)) assert.ok(Core.STAGES[r.chapter], r.id);
});

test('권역: 청령현 하나, 지역 8곳이 모두 청령현 소속 (6~10 지역 유지)', () => {
  assert.deepEqual(Core.PROVINCES.map((p) => [p.id, p.name]), [['cheongryeong', '청령현']]);
  assert.deepEqual(Core.PROVINCES[0].regions, Core.REGIONS.map((r) => r.id));
  for (const r of Core.REGIONS) assert.equal(r.province, 'cheongryeong', r.id);
  assert.ok(Core.PROVINCES[0].regions.length >= 6 && Core.PROVINCES[0].regions.length <= 10);
});
