import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './load.mjs';

const Core = loadCore();

function setup() {
  const s = Core.newBattle();
  return { s, u: (id) => Core.getUnit(s, id) };
}

test('이동: 파란 칸으로만, 이동 전 위치를 기억한다', () => {
  const { s, u } = setup();
  assert.equal(Core.moveUnit(s, 'yoon', 5, 2), false, '막힌 칸');
  assert.equal(Core.moveUnit(s, 'yoon', 3, 2), false, '너무 멀다');
  assert.equal(Core.moveUnit(s, 'yoon', 6, 1), true);
  assert.deepEqual([u('yoon').r, u('yoon').c], [6, 1]);
  assert.equal(Core.moveUnit(s, 'yoon', 6, 0), false, '한 번 이동한 뒤 다시 이동 불가');
});

test('제자리 이동도 된다', () => {
  const { s, u } = setup();
  assert.equal(Core.moveUnit(s, 'yoon', 7, 2), true);
  assert.deepEqual([u('yoon').r, u('yoon').c], [7, 2]);
});

test('취소: 원래 자리로, 행동 완료 아님, 다시 이동 가능', () => {
  const { s, u } = setup();
  Core.moveUnit(s, 'yoon', 6, 1);
  assert.equal(Core.cancelMove(s, 'yoon'), true);
  assert.deepEqual([u('yoon').r, u('yoon').c], [7, 2]);
  assert.equal(u('yoon').acted, false);
  assert.equal(Core.moveUnit(s, 'yoon', 6, 2), true);
});

test('대기: 행동 완료, 이후 명령 불가', () => {
  const { s, u } = setup();
  Core.moveUnit(s, 'yoon', 6, 1);
  assert.deepEqual(Core.wait(s, 'yoon'), []);
  assert.equal(u('yoon').acted, true);
  assert.equal(Core.cancelMove(s, 'yoon'), false, '행동 끝난 뒤 취소 불가');
  assert.deepEqual([u('yoon').r, u('yoon').c], [6, 1]);
  assert.equal(Core.moveUnit(s, 'yoon', 7, 1), false);
  assert.equal(Core.wait(s, 'yoon'), null);
});

test('기본공격: 사거리 안 적만, HP 감소, 행동 완료', () => {
  const { s, u } = setup();
  assert.equal(Core.canAttack(s, u('yoon')), false, '처음엔 사거리 안에 적이 없다');
  assert.equal(Core.attack(s, 'yoon', 'bulgasari'), null);
  u('yoon').r = 3; u('yoon').c = 4;
  assert.equal(Core.canAttack(s, u('yoon')), true);
  const ev = Core.attack(s, 'yoon', 'bulgasari');
  assert.deepEqual(ev, [{ type: 'damage', attackerId: 'yoon', targetId: 'bulgasari', amount: 7, mult: 1, name: null, skill: false }]);
  assert.equal(u('bulgasari').hp, 15);
  assert.equal(u('yoon').acted, true);
  assert.equal(u('yoon').ki, 6, '기본공격은 기력을 안 쓴다');
});

test('HP 는 0 밑으로 안 내려간다', () => {
  const { s, u } = setup();
  u('yoon').r = 3; u('yoon').c = 4;
  u('bulgasari').hp = 3;
  Core.attack(s, 'yoon', 'bulgasari');
  assert.equal(u('bulgasari').hp, 0);
});

test('공격 스킬: 기력 −4, 스킬 피해', () => {
  const { s, u } = setup();
  u('yoon').r = 1; u('yoon').c = 0; // 도깨비A (0,1) 과 거리 2 → 사거리 1 밖
  assert.equal(Core.canSkill(s, u('yoon')), false, '대상 없음');
  u('yoon').r = 0; u('yoon').c = 0;
  assert.equal(Core.canSkill(s, u('yoon')), true);
  const ev = Core.useSkill(s, 'yoon', 'dokkaebi1');
  assert.equal(ev[0].amount, 20);
  assert.equal(u('dokkaebi1').hp, 2);
  assert.equal(u('yoon').ki, 2);
  assert.equal(u('yoon').acted, true);
});

test('기력 4 미만이면 스킬 불가', () => {
  const { s, u } = setup();
  u('yoon').r = 0; u('yoon').c = 0;
  u('yoon').ki = 3;
  assert.equal(Core.canSkill(s, u('yoon')), false);
  assert.equal(Core.useSkill(s, 'yoon', 'dokkaebi1'), null);
  assert.equal(u('yoon').ki, 3);
  assert.equal(u('yoon').acted, false);
  u('yoon').ki = 4;
  assert.notEqual(Core.useSkill(s, 'yoon', 'dokkaebi1'), null);
  assert.equal(u('yoon').ki, 0);
});

test('정화수: +12, 최대 HP 초과 안 함, 가득 찬 아군도 대상 가능', () => {
  const { s, u } = setup();
  u('hangyeol').hp = 5;
  assert.deepEqual(Core.useSkill(s, 'dallae', 'hangyeol'), [{ type: 'heal', attackerId: 'dallae', targetId: 'hangyeol', amount: 12, name: '정화수' }]);
  assert.equal(u('hangyeol').hp, 17);
  assert.equal(u('dallae').ki, 2);

  const b = setup();
  b.u('hangyeol').hp = 20; // 최대 24
  assert.equal(Core.useSkill(b.s, 'dallae', 'hangyeol')[0].amount, 4);
  assert.equal(b.u('hangyeol').hp, 24);

  const c = setup();
  assert.equal(Core.useSkill(c.s, 'dallae', 'dallae')[0].amount, 0, '가득 찬 자기 자신');
  assert.equal(c.u('dallae').ki, 2, '기력은 쓴다');
});

test('정화수는 적을 대상으로 못 한다', () => {
  const { s, u } = setup();
  u('dallae').r = 3; u('dallae').c = 4;
  assert.equal(Core.useSkill(s, 'dallae', 'bulgasari'), null);
});

test('요괴·퇴각 유닛·요괴 페이즈에는 명령 불가', () => {
  const { s, u } = setup();
  assert.equal(Core.moveUnit(s, 'bulgasari', 3, 4), false);
  u('soun').alive = false;
  assert.equal(Core.moveUnit(s, 'soun', 6, 5), false);
  s.phase = 'enemy';
  assert.equal(Core.moveUnit(s, 'yoon', 6, 1), false);
});

test('피해 이벤트의 mult: 스킬은 상성 배율, 기본공격은 1', () => {
  const s = Core.newBattle();
  const u = (id) => Core.getUnit(s, id);
  u('yoon').r = 0; u('yoon').c = 0;
  assert.equal(Core.useSkill(s, 'yoon', 'dokkaebi1')[0].mult, 1.5, '금 → 목 유리');
  const s2 = Core.newBattle();
  const soun = Core.getUnit(s2, 'soun');
  soun.r = 1; soun.c = 3; Core.getUnit(s2, 'jangsan1').alive = false; // 흑린 (0,3) 옆
  assert.equal(Core.useSkill(s2, 'soun', 'heuklin')[0].mult, 0.7, '화 → 수 불리');
  const s3 = Core.newBattle();
  const y3 = Core.getUnit(s3, 'yoon');
  y3.r = 0; y3.c = 0;
  assert.equal(Core.attack(s3, 'yoon', 'dokkaebi1')[0].mult, 1, '기본공격은 상성 없음');
});
