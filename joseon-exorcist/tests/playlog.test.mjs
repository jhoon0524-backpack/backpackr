// 플레이 로그 (specs/playtest.md 1장)
import test from 'node:test';
import assert from 'node:assert/strict';
import { Core, playBattle } from './sim.mjs';

const sum = (m) => Object.values(m).reduce((a, b) => a + b, 0);

test('새 로그: 장·품계·관군 수·이름, 2장은 달래의 탈출로 거리부터 기록', () => {
  const s = Core.newBattle(Core.STAGES.ch2, { merit: 3 });
  const log = Core.newPlayLog(s, 'ch2', 2);
  assert.deepEqual([log.chapter, log.rank, log.soldierCount, log.restartCount], ['ch2', '정9품', 1, 2]);
  assert.equal(log.names.munyeo1, '신당회 무녀');
  assert.equal(log.dalraeTrail.length, 1);
  assert.equal(typeof log.dalraeTrail[0].dist, 'number');
  const s1 = Core.newBattle();
  const l1 = Core.newPlayLog(s1, 'ch1');
  assert.deepEqual([l1.rank, l1.soldierCount, l1.dalraeTrail.length], ['종9품', 0, 0], '1장 달래는 아군이라 추적하지 않는다');
});

test('기본공격·스킬·정화수·제압을 나눠 센다', () => {
  const s = Core.newBattle(Core.STAGES.ch2);
  const log = Core.newPlayLog(s, 'ch2');
  const yoon = Core.getUnit(s, 'yoon');
  const m = Core.getUnit(s, 'munyeo1');
  yoon.r = m.r; yoon.c = m.c + 1;
  Core.logMove(log, s, 'yoon', { r: 9, c: 3 }, { r: yoon.r, c: yoon.c });
  Core.logEvents(log, s, Core.useSkill(s, 'yoon', 'munyeo1')); // 벽사검
  const h = Core.getUnit(s, 'hangyeol');
  h.r = m.r + 1; h.c = m.c + 1; m.hp = 1;
  Core.logEvents(log, s, Core.attack(s, 'hangyeol', 'munyeo1')); // 기본공격으로 제압
  assert.deepEqual(log.unitMoves, { yoon: 1 });
  assert.deepEqual([log.skillsByUnit.yoon, log.attacks.hangyeol, log.skills['벽사검']], [1, 1, 1]);
  assert.equal(log.damageTaken.munyeo1, log.damageDealt.yoon + log.damageDealt.hangyeol);
  assert.deepEqual(log.defeatedUnits.map((d) => [d.id, d.how, d.by, d.merit]), [['munyeo1', '제압', 'hangyeol', 0]]);
});

test('제자리 이동은 이동으로 세지 않는다', () => {
  const s = Core.newBattle();
  const log = Core.newPlayLog(s, 'ch1');
  Core.logMove(log, s, 'yoon', { r: 7, c: 2 }, { r: 7, c: 2 });
  assert.deepEqual([log.unitMoves, log.moves], [{}, []]);
});

test('달래 정화수: 횟수·회복량, 끝난 뒤 회복된 적을 다시 쳤는지·버틴 턴', () => {
  const s = Core.newBattle(Core.STAGES.ch2);
  const log = Core.newPlayLog(s, 'ch2');
  const m = Core.getUnit(s, 'munyeo1'); // (1,1), 달래 (2,0) 와 거리 2
  m.hp = 3;
  s.phase = 'enemy';
  Core.logEvents(log, s, Core.enemyAct(s, 'dallae_boss'));
  assert.equal(log.dalraeHealCount, 1);
  assert.equal(log.healing.dallae_boss, 12);
  assert.equal(log.skills['정화수'], 1);
  // 다음 턴에 윤무겸이 그 무녀를 제압
  s.phase = 'ally'; s.turn = 3;
  const yoon = Core.getUnit(s, 'yoon');
  yoon.r = m.r; yoon.c = m.c + 1; m.hp = 1;
  Core.logEvents(log, s, Core.attack(s, 'yoon', 'munyeo1'));
  Core.finishPlayLog(log, s);
  assert.deepEqual(log.healFollowUps, [{ target: 'munyeo1', turn: 1, attackedAgain: true, survivedTurns: 2, defeated: true }]);
});

test('끝난 로그: 결과·턴·공적이 전투 상태와 같다, 달래를 물리치면 탈출로 거리는 null', () => {
  const s = Core.newBattle(Core.STAGES.ch2);
  const log = Core.newPlayLog(s, 'ch2');
  const yoon = Core.getUnit(s, 'yoon');
  const d = Core.getUnit(s, 'dallae_boss');
  yoon.r = d.r + 1; yoon.c = d.c; d.hp = 1;
  Core.logEvents(log, s, Core.attack(s, 'yoon', 'dallae_boss'));
  Core.finishPlayLog(log, s);
  assert.deepEqual([log.result, log.totalTurns, log.meritEarned, log.dalraeEscapeDistance], ['win', 1, 3, null]);
  assert.equal(log.defeatedUnits[0].how, '물러남', '화면 문구와 같게');
});

// 자동 플레이 여러 판으로 로그 합계가 서로 맞는지 (계산 누락·중복 탐지)
const runs = [];
for (const merit of [0, 3, 6]) {
  for (const mode of ['greedy', 'nearest']) {
    for (let seed = 1; seed <= 5; seed++) runs.push({ seed, mode, merit, stage: Core.STAGES.ch2, chapter: 'ch2' });
  }
}
for (let seed = 1; seed <= 3; seed++) runs.push({ seed, mode: 'greedy', chapter: 'ch1' });

test('자동 플레이 33판: 로그 합계가 전투 결과와 맞는다', () => {
  for (const opts of runs) {
    const s = playBattle(opts);
    const log = s.log;
    const tag = `${opts.chapter} merit ${opts.merit} ${opts.mode} seed ${opts.seed}`;
    assert.equal(log.result, s.result, tag);
    assert.equal(log.totalTurns, s.turn, tag);
    assert.equal(log.meritEarned, s.merit, tag);
    assert.equal(sum(log.damageDealt), sum(log.damageTaken), `${tag} 준 피해 = 받은 피해`);
    assert.equal(sum(log.attacks) + sum(log.skillsByUnit), log.hits.length + log.heals.length, `${tag} 행동 수`);
    assert.equal(log.defeatedUnits.length, s.units.filter((u) => !u.alive).length, `${tag} 쓰러진 수`);
    assert.equal(log.dalraeHealCount, log.heals.filter((h) => h.by === 'dallae_boss').length, tag);
    assert.equal(log.healFollowUps.length, log.heals.length, tag);
    assert.equal(log.soldierCount, s.units.filter((u) => u.type === 'gwangun').length, tag);
    assert.equal(sum(log.unitMoves), log.moves.length, tag);
    // 2장 패배가 탈출이면 달래는 탈출로(거리 0)에 있다
    if (opts.chapter === 'ch2' && s.result === 'lose' && s.turn < 12) assert.equal(log.dalraeEscapeDistance, 0, tag);
  }
});

test('로그는 JSON 으로 그대로 옮겨진다', () => {
  const log = playBattle({ seed: 1, mode: 'greedy', stage: Core.STAGES.ch2, merit: 3, chapter: 'ch2' }).log;
  assert.deepEqual(JSON.parse(JSON.stringify(log)), log);
});
