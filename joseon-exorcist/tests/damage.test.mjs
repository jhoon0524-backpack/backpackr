import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './load.mjs';

const Core = loadCore();

function setup(weather = '흐림') {
  const s = Core.newBattle();
  s.weather = weather;
  return { s, u: (id) => Core.getUnit(s, id) };
}

// specs/battle.md 7장 검산 예시
test('예시 1: 윤무겸 기본공격 → 도깨비 = 7', () => {
  const { s, u } = setup();
  assert.equal(Core.damage(s, u('yoon'), u('dokkaebi1'), false), 7);
});

test('예시 2: 윤무겸 벽사검 → 도깨비(흐림) = 20', () => {
  const { s, u } = setup();
  assert.equal(Core.damage(s, u('yoon'), u('dokkaebi1'), true), 20);
});

test('예시 3: 소운 화염부 → 흑린(서낭당, 맑음) = 6', () => {
  const { s, u } = setup('맑음');
  assert.equal(Core.isShrine(s, u('heuklin').r, u('heuklin').c), true);
  assert.equal(Core.damage(s, u('soun'), u('heuklin'), true), 6);
});

test('예시 4: 윤무겸 기본공격 → 흑린(서낭당) = 3', () => {
  const { s, u } = setup();
  assert.equal(Core.damage(s, u('yoon'), u('heuklin'), false), 3);
});

test('예시 5: 도깨비 기본공격 → 소운 = 7', () => {
  const { s, u } = setup();
  assert.equal(Core.damage(s, u('dokkaebi1'), u('soun'), false), 7);
});

test('기본공격 최소 1', () => {
  const { s, u } = setup();
  // 달래 공격 7 → 흑린 방어 8: max(1, −1) = 1, 서낭당 ×0.8 = 0.8 → 반올림 1
  assert.equal(Core.damage(s, u('dallae'), u('heuklin'), false), 1);
  // 서낭당 밖
  u('heuklin').r = 3; u('heuklin').c = 0;
  assert.equal(Core.damage(s, u('dallae'), u('heuklin'), false), 1);
});

test('기본공격에는 상성·날씨가 붙지 않는다', () => {
  const { s, u } = setup('맑음');
  // 소운(화) → 불가사리(금): 스킬이면 유리지만 기본공격은 11−5 = 6
  assert.equal(Core.damage(s, u('soun'), u('bulgasari'), false), 6);
});

test('날씨: 맑음 화 +30%, 비 화 −30%, 강풍 목 +30%, 흐림 없음', () => {
  assert.equal(Core.weatherMultiplier('맑음', '화'), 1.3);
  assert.equal(Core.weatherMultiplier('비', '화'), 0.7);
  assert.equal(Core.weatherMultiplier('강풍', '목'), 1.3);
  assert.equal(Core.weatherMultiplier('강풍', '화'), 1);
  assert.equal(Core.weatherMultiplier('맑음', '목'), 1);
  for (const e of ['금', '목', '토', '수', '화', '없음']) assert.equal(Core.weatherMultiplier('흐림', e), 1);
  assert.deepEqual([...Core.WEATHERS].sort(), ['강풍', '맑음', '비', '흐림'].sort());
});

test('날씨가 스킬 피해에 반영된다', () => {
  // 소운 화염부 → 불가사리(금, 서낭당 아님): (16.5−5)=11.5 ×1.5 = 17.25
  const base = 11.5 * 1.5;
  for (const [w, mul] of [['흐림', 1], ['맑음', 1.3], ['비', 0.7], ['강풍', 1]]) {
    const { s, u } = setup(w);
    assert.equal(Core.damage(s, u('soun'), u('bulgasari'), true), Math.round(base * mul), w);
  }
  // 한결 파사궁(목) → 장산범(토), 강풍: (15−5)×1.5×1.3 = 19.5 → 20
  const { s, u } = setup('강풍');
  assert.equal(Core.damage(s, u('hangyeol'), u('jangsan1'), true), 20);
});

test('반올림은 맨 끝에 한 번만', () => {
  // 여울 축지격(토) → 흑린(수, 서낭당): (16.5−8)=8.5 ×1.5=12.75 ×0.8=10.2 → 10
  // (중간에 반올림하면 13×0.8=10.4 로 같지만, 8.5 를 먼저 올리면 9×1.5×0.8=10.8 → 11 로 달라진다)
  const { s, u } = setup();
  assert.equal(Core.damage(s, u('yeoul'), u('heuklin'), true), 10);
});

test('가장 약한 스킬 조합도 1 이상 (소운 → 흑린, 비, 서낭당 = 3)', () => {
  const { s, u } = setup('비');
  assert.equal(Core.damage(s, u('soun'), u('heuklin'), true), 3);
});
