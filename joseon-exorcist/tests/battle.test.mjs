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
    assert.equal(Core.isPassable(s, u.r, u.c), true, u.name);
    assert.equal(Core.unitAt(s, u.r, u.c), u, `${u.name} 칸 겹침`);
  }
});

test('2장: 대기만 하면 12턴 패배', () => {
  const s = playBattle({ mode: 'idle', stage: Core.STAGES.ch2 });
  assert.equal(s.result, 'lose');
  assert.ok(s.turn <= 12);
});

test('2장: 품계·날씨가 달라도 모든 판이 12턴 안에 끝난다', () => {
  for (const merit of [0, 3, 6]) {
    for (let seed = 1; seed <= 20; seed++) {
      const s = playBattle({ seed, stage: Core.STAGES.ch2, merit });
      assert.notEqual(s.result, null, `merit ${merit} seed ${seed}`);
      assert.ok(s.turn <= 12);
    }
  }
});

test('2장: 단순한 공격 규칙으로 달래를 잡으면 승리', () => {
  const s = playBattle({ seed: 1, stage: Core.STAGES.ch2, merit: 0 });
  assert.equal(s.result, 'win');
  assert.equal(Core.getUnit(s, 'dallae_boss').alive, false);
});

// ── 2장 v0.3.1: 탈출과 관군 자리가 판단을 만든다 (specs/chapter2.md 7장) ──
test('2장: 아무것도 안 하면 12턴 전에 달래가 탈출해서 진다', () => {
  const s = playBattle({ mode: 'idle', stage: Core.STAGES.ch2 });
  assert.equal(s.result, 'lose');
  assert.ok(s.turn < 12, `${s.turn}턴에 탈출`);
  const d = Core.getUnit(s, 'dallae_boss');
  assert.equal(Core.isEscape(s, d.r, d.c), true);
});

test('2장 종9품: 달래를 쫓지 않으면 지고, 쫓으면 이긴다', () => {
  for (let seed = 1; seed <= 10; seed++) {
    assert.equal(playBattle({ seed, stage: Core.STAGES.ch2, merit: 0, mode: 'nearest' }).result, 'lose', `seed ${seed}`);
    assert.equal(playBattle({ seed, stage: Core.STAGES.ch2, merit: 0, mode: 'greedy' }).result, 'win', `seed ${seed}`);
  }
});

test('2장 정9품 이상: 관군이 탈출로 갈래를 막아 달래를 쫓지 않아도 이긴다 (품계 = 전장 통제)', () => {
  for (const merit of [3, 6]) {
    for (let seed = 1; seed <= 10; seed++) {
      assert.equal(playBattle({ seed, stage: Core.STAGES.ch2, merit, mode: 'nearest' }).result, 'win', `merit ${merit} seed ${seed}`);
    }
  }
});
