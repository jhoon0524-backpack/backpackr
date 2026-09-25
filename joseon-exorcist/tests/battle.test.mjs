import test from 'node:test';
import assert from 'node:assert/strict';
import { Core, playBattle } from './sim.mjs';

test('아군이 대기만 하면 패배로 끝난다', () => {
  const s = playBattle({ mode: 'idle' });
  assert.equal(s.result, 'lose');
  assert.equal(s.phase, 'over');
  assert.ok(s.turn <= 10);
  assert.equal(Core.getUnit(s, 'heuklin').alive, true);
});

test('단순한 공격 규칙으로 흑린을 잡으면 승리로 끝난다', () => {
  const s = playBattle({ seed: 1 });
  assert.equal(s.result, 'win');
  assert.equal(Core.getUnit(s, 'heuklin').alive, false);
  assert.ok(s.merit >= 0 && s.merit <= 8);
});

test('날씨가 달라도 모든 판이 10턴 안에 끝난다 (무한 반복 없음)', () => {
  for (let seed = 1; seed <= 50; seed++) {
    const s = playBattle({ seed });
    assert.notEqual(s.result, null, `seed ${seed}`);
    assert.ok(s.turn >= 1 && s.turn <= 10, `seed ${seed} turn ${s.turn}`);
  }
});

test('전투가 끝난 뒤 불변 조건: HP 는 0~최대, 기력은 0~10, 살아 있는 유닛은 겹치지 않는다', () => {
  const s = playBattle({ seed: 7 });
  for (const u of s.units) {
    assert.ok(u.hp >= 0 && u.hp <= u.maxHp, u.name);
    if (u.side === 'ally') assert.ok(u.ki >= 0 && u.ki <= 10, u.name);
    if (!u.alive) continue;
    assert.equal(Core.isPassable(u.r, u.c), true, u.name);
    assert.equal(Core.unitAt(s, u.r, u.c), u, `${u.name} 칸 겹침`);
  }
});
