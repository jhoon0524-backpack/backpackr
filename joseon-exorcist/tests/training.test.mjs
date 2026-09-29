// v0.8 개인 성장 — 수련 (specs/growth.md)
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './load.mjs';

const Core = loadCore();

// 빈 8×8 연습장. 아군 4명은 아래, 적은 opts 로 놓는다
function arena(enemies, training, map) {
  const stage = {
    v: 1, name: '연습', rows: 8, cols: 8, maxTurn: 10,
    map: map || Array(8).fill('........'),
    allies: [{ id: 'yoon', r: 7, c: 0 }, { id: 'hangyeol', r: 7, c: 2 }, { id: 'yeoul', r: 7, c: 4 }, { id: 'soun', r: 7, c: 6 }],
    // 흑린을 구석(6,7)에 둔다: 움직이지 않고, 이 판이 한 마리 쓰러뜨려도 끝나지 않게 (승패 판정에 보스가 필요)
    enemies: enemies.map(([type, r, c]) => ({ type, r, c })).concat([{ type: 'heuklin', r: 6, c: 7 }])
  };
  const s = Core.newBattle(stage, { training });
  Core.getUnit(s, 'heuklin').hp = 999;
  return s;
}
const U = (s, id) => Core.getUnit(s, id);
const put = (s, id, r, c) => { const u = U(s, id); u.r = r; u.c = c; return u; };
const cells = (list) => list.map((p) => `${p.r},${p.c}`).sort();

// ── 수련점과 선택 ──────────────────────────────────
const after2 = { v: 1, cleared: ['ch1', 'ch2'], merit: 7, training: {} };
const after3 = { v: 1, cleared: ['ch1', 'ch2', 'ch3'], merit: 13, training: {} };

test('수련 방향: 4명 × 2개, 모두 이름·역할·설명이 있고 기술 이름은 기존 그대로 (파사 같은 새 기술 없음)', () => {
  assert.deepEqual(Core.TRAINING_ORDER, ['yoon', 'hangyeol', 'soun', 'yeoul']);
  assert.deepEqual(Core.TRAINING_ORDER.map((id) => Core.TRAININGS[id].map((t) => t.name)),
    [['집행', '벽사'], ['사수', '추적'], ['부법', '진법'], ['기습', '교란']]);
  for (const id of Core.TRAINING_ORDER) for (const t of Core.TRAININGS[id]) assert.ok(t.id && t.role && t.desc, t.name);
  const s = arena([], {});
  assert.deepEqual(['yoon', 'hangyeol', 'yeoul', 'soun'].map((id) => U(s, id).skill), ['벽사검', '파사궁', '축지격', '화염부']);
});

test('수련점: 3장을 깨면 2 (1·2장은 0). 깬 장에서 계산', () => {
  assert.equal(Core.trainingPoints(Core.newProgress()), 0);
  assert.equal(Core.trainingPoints(after2), 0);
  assert.equal(Core.trainingPoints(after3), 2);
});

test('수련: 한 사람에 하나, 2명까지. 원본은 바뀌지 않는다', () => {
  assert.equal(Core.train(after2, 'yoon', 'jiphaeng'), null, '3장 전에는 못 한다');
  const p1 = Core.train(after3, 'yoon', 'jiphaeng');
  assert.deepEqual(p1.training, { yoon: 'jiphaeng' });
  assert.deepEqual(after3.training, {}, '원본 그대로');
  assert.equal(Core.trainingPoints(p1), 1);
  assert.equal(Core.train(p1, 'yoon', 'byeoksa'), null, '2점을 한 사람에게 몰아 A·B 둘 다 금지');
  assert.equal(Core.train(p1, 'yoon', 'jiphaeng'), null);
  assert.equal(Core.train(p1, 'hangyeol', 'jiphaeng'), null, '다른 사람의 방향은 못 고른다');
  assert.equal(Core.train(p1, 'dallae', 'jiphaeng'), null);
  const p2 = Core.train(p1, 'soun', 'jinbeop');
  assert.equal(Core.trainingPoints(p2), 0);
  assert.equal(Core.train(p2, 'yeoul', 'gisup'), null, '4명 중 2명만');
  assert.deepEqual(p2.training, { yoon: 'jiphaeng', soun: 'jinbeop' });
});

test('저장: 수련이 남고, 이후 장 결과에도 유지. 잘못된 수련 기록은 버리되 진행은 살린다', () => {
  const p = Core.train(after3, 'hangyeol', 'sasu');
  const saved = Core.checkProgress(JSON.parse(JSON.stringify(p)));
  assert.deepEqual(saved.training, { hangyeol: 'sasu' });
  assert.deepEqual(Core.applyResult(saved, 'ch3', 'win', 0).training, { hangyeol: 'sasu' });
  const bad = Core.checkProgress({ ...after3, training: { yoon: 'sasu' } });
  assert.deepEqual([bad.cleared, bad.training], [after3.cleared, {}]);
  const tooMany = Core.checkProgress({ ...after2, training: { yoon: 'jiphaeng' } });
  assert.deepEqual(tooMany.training, {}, '수련점보다 많은 수련은 버린다');
});

test('개발자 초기화: 수련만 비운다 (진행·공적은 그대로)', () => {
  const p = Core.resetTraining(Core.train(after3, 'yoon', 'byeoksa'));
  assert.deepEqual(p, after3);
});

test('전투에 수련이 실린다. 없으면 null', () => {
  const s = arena([], { yoon: 'jiphaeng', soun: 'bubeop', dallae: 'x', hangyeol: 'nope' });
  assert.deepEqual(['yoon', 'hangyeol', 'yeoul', 'soun'].map((id) => U(s, id).training), ['jiphaeng', null, null, 'bubeop']);
});

// ── 윤무겸 ─────────────────────────────────────────
test('집행: 벽사검으로 적을 쓰러뜨리면 1칸 재이동. 공격은 다시 못 하고 이동만 1칸', () => {
  const s = arena([['dokkaebi', 3, 3], ['dokkaebi', 0, 7]], { yoon: 'jiphaeng' });
  const y = put(s, 'yoon', 4, 3);
  U(s, 'dokkaebi1').hp = 1;
  const ev = Core.useSkill(s, 'yoon', 'dokkaebi1');
  assert.ok(ev.some((e) => e.type === 'training' && e.kind === 'jiphaeng'));
  assert.equal(y.acted, true);
  assert.equal(y.reMove, true);
  assert.equal(Core.canCommand(s, y), false, '공격·기술은 다시 못 한다');
  assert.deepEqual(cells(Core.reMoveTargets(s, y)), ['3,3', '4,2', '4,3', '4,4', '5,3'], '1칸만 (제자리 포함)');
  assert.equal(Core.reMove(s, 'yoon', 2, 3), null, '2칸은 안 된다');
  assert.deepEqual(Core.reMove(s, 'yoon', 3, 3).map((e) => e.type), ['move']);
  assert.deepEqual([y.r, y.c, y.reMove], [3, 3, false]);
  assert.equal(Core.reMove(s, 'yoon', 4, 3), null, '한 번만');
});

test('집행: 쓰러뜨리지 못했거나, 기본공격이면 발동하지 않는다', () => {
  const s = arena([['dokkaebi', 3, 3], ['dokkaebi', 3, 5]], { yoon: 'jiphaeng' });
  put(s, 'yoon', 4, 3);
  Core.useSkill(s, 'yoon', 'dokkaebi1');
  assert.equal(U(s, 'yoon').reMove, false, '살아남음');
  const s2 = arena([['dokkaebi', 3, 3], ['dokkaebi', 0, 7]], { yoon: 'jiphaeng' });
  put(s2, 'yoon', 4, 3);
  U(s2, 'dokkaebi1').hp = 1;
  Core.attack(s2, 'yoon', 'dokkaebi1');
  assert.equal(U(s2, 'yoon').reMove, false, '벽사검만');
});

test('재이동: 제자리를 고르면 쓰지 않고 끝. 다음 차례가 오면 사라진다', () => {
  const s = arena([['dokkaebi', 3, 3], ['dokkaebi', 0, 7]], { yoon: 'jiphaeng' });
  const y = put(s, 'yoon', 4, 3);
  U(s, 'dokkaebi1').hp = 1;
  Core.useSkill(s, 'yoon', 'dokkaebi1');
  assert.deepEqual(Core.reMove(s, 'yoon', 4, 3), []);
  assert.equal(y.reMove, false);
  y.reMove = true;
  Core.endAllyPhase(s);
  assert.equal(y.reMove, false, '턴 종료');
});

test('벽사: 봉인 복구 뒤 1칸 재이동 (마지막 봉인으로 이기면 없음)', () => {
  const s = Core.newBattle(Core.STAGES.ch3, { merit: 0, training: { yoon: 'byeoksa' } });
  s.units.filter((u) => u.type === 'wongwi').forEach((u) => { u.alive = false; });
  s.objective.phase = 'seal';
  const y = put(s, 'yoon', 2, 1); // 금줄
  const ev = Core.repairSeal(s, 'yoon');
  assert.deepEqual(ev.map((e) => e.type), ['seal', 'training']);
  assert.equal(y.reMove, true);
  assert.ok(Core.reMoveTargets(s, y).length > 1);
  s.objective.repaired = s.objective.repaired.concat(['doltap']);
  y.reMove = false; y.acted = false;
  s.objective.repaired = ['geumjul', 'doltap'];
  put(s, 'yoon', ...(() => { const p = Core.pointById(s, 'seonangmok'); return [p.r, p.c]; })());
  const last = Core.repairSeal(s, 'yoon');
  assert.ok(last.some((e) => e.type === 'result'));
  assert.equal(y.reMove, false, '승리로 끝나면 재이동 없음');
});

test('벽사가 아니면 봉인 복구 뒤 재이동 없음', () => {
  const s = Core.newBattle(Core.STAGES.ch3, { merit: 0, training: { yoon: 'jiphaeng' } });
  s.objective.phase = 'seal';
  put(s, 'yoon', 2, 1);
  Core.repairSeal(s, 'yoon');
  assert.equal(U(s, 'yoon').reMove, false);
});

// ── 한결 ───────────────────────────────────────────
test('사수: 움직이지 않은 차례에는 파사궁 사거리 3, 움직이면 2. 기본공격은 그대로 2', () => {
  const s = arena([['dokkaebi', 2, 2]], { hangyeol: 'sasu' });
  const h = put(s, 'hangyeol', 5, 2); // 거리 3
  assert.equal(Core.skillRange(h), 3);
  assert.deepEqual(Core.skillTargets(s, h).map((t) => t.id), ['dokkaebi']);
  assert.deepEqual(Core.attackTargets(s, h), [], '기본공격은 2');
  assert.equal(Core.skillRange(h, { r: 5, c: 1 }), 2, '다른 칸으로 옮긴다고 보면 2');
  Core.moveUnit(s, 'hangyeol', 5, 2); // 제자리 이동은 움직이지 않은 것
  assert.equal(Core.skillRange(h), 3);
  Core.cancelMove(s, 'hangyeol');
  Core.moveUnit(s, 'hangyeol', 5, 3);
  assert.equal(Core.skillRange(h), 2);
  assert.deepEqual(Core.skillTargets(s, h), []);
});

test('사수가 아니면 사거리 2', () => {
  const s = arena([['dokkaebi', 2, 2]], {});
  const h = put(s, 'hangyeol', 5, 2);
  assert.equal(Core.skillRange(h), 2);
  assert.deepEqual(Core.skillTargets(s, h), []);
});

test('v0.9.3 견제사격: 추적 수련 한결에게만 있다 (무수련·사수 한결, 다른 인물에게는 없음)', () => {
  const s = arena([['dokkaebi', 5, 2]], { hangyeol: 'chujeok' });
  assert.equal(Core.controlAction(U(s, 'hangyeol')), '견제사격');
  for (const tr of [{}, { hangyeol: 'sasu' }]) {
    const s2 = arena([['dokkaebi', 5, 2]], tr);
    assert.equal(Core.controlAction(U(s2, 'hangyeol')), null);
    assert.equal(Core.control(s2, 'hangyeol', 'dokkaebi'), null, '무수련은 쓸 수 없다');
  }
  for (const id of ['yoon', 'soun', 'yeoul']) assert.equal(Core.controlAction(U(s, id)), null, id);
  assert.equal(Core.canControl(s, U(s, 'hangyeol')), true, '거리 2 — 기본 공격 사거리');
  put(s, 'dokkaebi', 4, 2);
  assert.equal(Core.canControl(s, U(s, 'hangyeol')), false, '거리 3 은 안 된다');
});

test('v0.9.3 견제사격: 기력 그대로, 기본 공격 피해의 50%, 이동 −2, 최소 1, 중첩 없음, 다음 자기 차례가 끝나면 풀림, 행동 끝', () => {
  const s = arena([['dokkaebi', 5, 2], ['dokkaebi', 0, 7]], { hangyeol: 'chujeok' });
  const h = U(s, 'hangyeol'), d = U(s, 'dokkaebi1');
  d.hp = d.maxHp = 99;
  const ki = h.ki, full = Core.damage(s, h, d, false);
  const ev = Core.control(s, 'hangyeol', 'dokkaebi1');
  assert.equal(h.ki, ki, '기력 소비 없음');
  assert.equal(99 - d.hp, Math.round(full * 0.5), '기본 공격의 절반 (' + full + ' → ' + Math.round(full * 0.5) + ')');
  assert.ok(ev.some((e) => e.type === 'training' && e.kind === 'chujeok'));
  assert.ok(ev.some((e) => e.type === 'damage' && e.name === '견제사격' && e.skill === false));
  assert.equal(d.slow, true);
  assert.equal(Math.max(...Core.moveTargets(s, d).map((p) => p.cost)), 1, '이동 3 → 1');
  assert.equal(h.acted, true, '행동 끝');
  assert.equal(Core.control(s, 'hangyeol', 'dokkaebi1'), null, '다시 못 쓴다');
  h.acted = false;
  Core.control(s, 'hangyeol', 'dokkaebi1');
  assert.equal(Math.max(...Core.moveTargets(s, d).map((p) => p.cost)), 1, '중첩 없음 (−4 가 아님)');
  Core.endAllyPhase(s);
  Core.runEnemyPhase(s);
  assert.equal(d.slow, false, '맞은 적의 다음 차례가 끝나면 해제');
});
test('v0.9.3 추적: 이동력 −2 라도 최소 1', () => {
  const s = arena([['dokkaebi', 1, 2]], { hangyeol: 'chujeok' });
  const d = U(s, 'dokkaebi');
  d.mov = 2; d.slow = true;
  assert.equal(Math.max(...Core.moveTargets(s, d).map((p) => p.cost)), 1);
});
// ── 소운 ───────────────────────────────────────────
test('부법: 옆 칸의 적이 하나면 그 적에게 50% 피해로 번진다', () => {
  const s = arena([['dokkaebi', 2, 3], ['dokkaebi', 2, 4], ['dokkaebi', 0, 0]], { soun: 'bubeop' });
  put(s, 'soun', 4, 3);
  const a = U(s, 'dokkaebi1'), b = U(s, 'dokkaebi2');
  a.hp = a.maxHp = 99; b.hp = b.maxHp = 99;
  const full = Core.damage(s, U(s, 'soun'), b, true);
  const ev = Core.useSkill(s, 'soun', 'dokkaebi1');
  const spread = ev.filter((e) => e.type === 'damage' && e.targetId === 'dokkaebi2')[0];
  assert.equal(spread.amount, Math.round(full * 0.5));
  assert.equal(spread.name, '부법');
  assert.ok(ev.some((e) => e.type === 'training' && e.kind === 'bubeop'));
});

test('부법: 옆 적이 둘 이상이면 플레이어가 고른다 — 고르지 않으면 쓰지 않는다 (자동 선택 없음)', () => {
  const s = arena([['dokkaebi', 2, 3], ['dokkaebi', 2, 4], ['dokkaebi', 2, 2]], { soun: 'bubeop' });
  put(s, 'soun', 4, 3);
  s.units.forEach((u) => { if (u.side === 'enemy') { u.hp = 99; u.maxHp = 99; } });
  assert.deepEqual(Core.spreadTargets(s, U(s, 'dokkaebi1')).map((u) => u.id).sort(), ['dokkaebi2', 'dokkaebi3']);
  assert.equal(Core.useSkill(s, 'soun', 'dokkaebi1'), null);
  assert.equal(U(s, 'soun').ki, Core.KI_START, '기력도 쓰지 않는다');
  assert.equal(Core.useSkill(s, 'soun', 'dokkaebi1', { spreadId: 'dokkaebi1' }), null, '대상 자신은 못 고른다');
  const ev = Core.useSkill(s, 'soun', 'dokkaebi1', { spreadId: 'dokkaebi3' });
  assert.ok(ev.some((e) => e.type === 'damage' && e.targetId === 'dokkaebi3'));
  assert.ok(!ev.some((e) => e.targetId === 'dokkaebi2'));
});

test('부법: 옆에 적이 없으면 번지지 않는다. 아군·중립에게는 번지지 않는다', () => {
  const s = arena([['dokkaebi', 2, 3], ['dokkaebi', 0, 0]], { soun: 'bubeop' });
  put(s, 'soun', 4, 3);
  put(s, 'yoon', 2, 4);
  U(s, 'dokkaebi1').hp = 99;
  const ev = Core.useSkill(s, 'soun', 'dokkaebi1');
  assert.deepEqual(ev.map((e) => e.type), ['damage']);
});

test('진법: 거리 2 안의 빈 칸에 결계 (기력 4, 행동 끝). 적은 못 들어오고 아군은 지나간다', () => {
  const s = arena([['dokkaebi', 2, 3]], { soun: 'jinbeop' });
  const so = put(s, 'soun', 5, 3);
  assert.equal(Core.canBarrier(s, so), true);
  assert.ok(!Core.barrierCells(s, so).some((p) => Core.distance(p, so) > 2));
  assert.equal(Core.placeBarrier(s, 'soun', 2, 3), null, '유닛이 있는 칸은 안 된다');
  const ev = Core.placeBarrier(s, 'soun', 4, 3);
  assert.deepEqual(ev.map((e) => e.type), ['barrier', 'training']);
  assert.deepEqual([so.acted, so.ki], [true, Core.KI_START - Core.SKILL_COST]);
  const d = U(s, 'dokkaebi');
  assert.ok(!Core.moveTargets(s, d).some((p) => p.r === 4 && p.c === 3), '적은 결계 칸에 못 선다');
  const y = put(s, 'yoon', 5, 2);
  assert.ok(Core.moveTargets(s, y).some((p) => p.r === 4 && p.c === 3), '아군은 들어간다');
});

test('진법: 적은 결계를 지나가지도 못한다 (길목 막기)', () => {
  // 가운데 줄만 뚫린 벽: 결계로 막으면 적은 돌아갈 길이 없다
  const map = ['........', '........', 'DDD.DDDD', '........', '........', '........', '........', '........'];
  const s = arena([['dokkaebi', 0, 3]], { soun: 'jinbeop' }, map);
  put(s, 'soun', 4, 3);
  Core.placeBarrier(s, 'soun', 2, 3);
  const d = U(s, 'dokkaebi');
  assert.ok(Core.moveTargets(s, d).every((p) => p.r < 2), '벽 너머로 못 간다');
  Core.endAllyPhase(s);
  Core.runEnemyPhase(s);
  assert.ok(d.r < 2, 'AI 도 결계를 지나가지 못한다');
});

test('진법: 2턴 지속, 하나만 유지 (새로 치면 먼저 것은 사라진다)', () => {
  const s = arena([['dokkaebi', 0, 0]], { soun: 'jinbeop' });
  put(s, 'soun', 5, 3);
  Core.placeBarrier(s, 'soun', 4, 3); // 1턴
  Core.endAllyPhase(s); Core.runEnemyPhase(s); Core.startAllyPhase(s, () => 0); // 2턴
  assert.ok(Core.barrierAt(s, 4, 3), '다음 턴 적 차례까지 남는다');
  U(s, 'soun').ki = 10; // 첫 결계로 기력 6 → 2, 2턴 +1 = 3 이라 기력을 채워 둔다
  assert.ok(Core.placeBarrier(s, 'soun', 5, 5));
  assert.ok(!Core.barrierAt(s, 4, 3) && Core.barrierAt(s, 5, 5), '새 결계를 놓으면 기존 결계 제거');
  Core.endAllyPhase(s); Core.runEnemyPhase(s);
  const ev = Core.startAllyPhase(s, () => 0); // 3턴: 2턴에 친 결계는 4턴에 사라진다
  assert.ok(Core.barrierAt(s, 5, 5));
  Core.endAllyPhase(s); Core.runEnemyPhase(s);
  const ev4 = Core.startAllyPhase(s, () => 0);
  assert.ok(!Core.barrierAt(s, 5, 5));
  assert.ok(ev4.some((e) => e.type === 'barrierEnd'));
  assert.ok(!ev.some((e) => e.type === 'barrierEnd'));
});

test('진법: 지점(조사·봉인·원한) 칸과 탈출로에는 못 친다', () => {
  const s = Core.newBattle(Core.STAGES.ch3, { merit: 0, training: { soun: 'jinbeop' } });
  const so = U(s, 'soun');
  for (const p of s.points) {
    so.r = p.r + 1; so.c = p.c;
    assert.ok(!Core.barrierCells(s, so).some((c) => c.r === p.r && c.c === p.c), p.id);
  }
  const s2 = Core.newBattle(Core.STAGES.ch2, { merit: 0, training: { soun: 'jinbeop' } });
  const so2 = U(s2, 'soun');
  for (let r = 0; r < s2.rows; r++) for (let c = 0; c < s2.cols; c++) {
    if (!Core.isEscape(s2, r, c)) continue;
    so2.r = r + 1 < s2.rows ? r + 1 : r - 1; so2.c = c;
    assert.ok(!Core.barrierCells(s2, so2).some((x) => x.r === r && x.c === c), `탈출로 ${r},${c}`);
  }
});

test('진법이 아니면 결계를 못 친다', () => {
  const s = arena([['dokkaebi', 0, 0]], {});
  assert.equal(Core.canBarrier(s, U(s, 'soun')), false);
  assert.equal(Core.placeBarrier(s, 'soun', 6, 6), null);
});

// ── 여울 ───────────────────────────────────────────
test('기습: 3칸 이상 이동한 뒤 축지격 피해 ×1.5, 2칸이면 그대로', () => {
  const make = () => {
    const s = arena([['dokkaebi', 2, 4]], { yeoul: 'gisup' });
    U(s, 'dokkaebi').hp = 99;
    return s;
  };
  const s = make();
  Core.moveUnit(s, 'yeoul', 3, 4); // 7,4 → 3,4 = 4칸
  const normal = (() => { const t = make(); put(t, 'yeoul', 3, 4); return Core.damage(t, U(t, 'yeoul'), U(t, 'dokkaebi'), true); })();
  const ev = Core.useSkill(s, 'yeoul', 'dokkaebi');
  assert.equal(ev[0].amount, Math.round(normal * 1.5));
  assert.ok(ev.some((e) => e.type === 'training' && e.kind === 'gisup'));
  const s2 = arena([['dokkaebi', 4, 4]], { yeoul: 'gisup' });
  U(s2, 'dokkaebi').hp = 99;
  Core.moveUnit(s2, 'yeoul', 5, 4); // 2칸
  const ev2 = Core.useSkill(s2, 'yeoul', 'dokkaebi');
  assert.ok(!ev2.some((e) => e.type === 'training'));
});

test('v0.9.3 밀어내기: 교란 수련 여울에게만, 사거리 1, 기력 그대로, 기본 공격 피해의 50%, 여울 반대쪽으로 1칸, 행동 끝', () => {
  for (const tr of [{}, { yeoul: 'gisup' }]) {
    const s0 = arena([['dokkaebi', 6, 4]], tr);
    assert.equal(Core.controlAction(U(s0, 'yeoul')), null);
    assert.equal(Core.control(s0, 'yeoul', 'dokkaebi'), null);
  }
  const s = arena([['dokkaebi', 3, 4]], { yeoul: 'gyoran' });
  const y = put(s, 'yeoul', 4, 4), d = U(s, 'dokkaebi');
  assert.equal(Core.controlAction(y), '밀어내기');
  d.hp = d.maxHp = 99;
  const ki = y.ki, full = Core.damage(s, y, d, false);
  const ev = Core.control(s, 'yeoul', 'dokkaebi');
  assert.deepEqual([d.r, d.c], [2, 4], '위로 1칸');
  assert.equal(99 - d.hp, Math.round(full * 0.5 + 1e-9));
  assert.equal(y.ki, ki);
  assert.equal(y.acted, true);
  assert.ok(ev.some((e) => e.type === 'push' && e.name === '교란'));
  assert.ok(ev.some((e) => e.type === 'training' && e.kind === 'gyoran'));
  // 옆으로도 민다 (여울 반대 방향)
  const s2 = arena([['dokkaebi', 4, 5]], { yeoul: 'gyoran' });
  put(s2, 'yeoul', 4, 4); U(s2, 'dokkaebi').hp = 99;
  Core.control(s2, 'yeoul', 'dokkaebi');
  assert.deepEqual([U(s2, 'dokkaebi').r, U(s2, 'dokkaebi').c], [4, 6]);
  // 사거리 1: 두 칸 떨어진 적은 안 된다
  const s3 = arena([['dokkaebi', 2, 4]], { yeoul: 'gyoran' });
  put(s3, 'yeoul', 4, 4);
  assert.deepEqual(Core.controlTargets(s3, U(s3, 'yeoul')), []);
});
test('v0.9.3 밀어내기: 바위·맵 밖·다른 유닛 쪽이면 밀리지 않고 피해만 들어간다', () => {
  const map = ['........', '........', '....D...', '........', '........', '........', '........', '........'];
  const cases = [
    ['바위', arena([['dokkaebi', 3, 4], ['dokkaebi', 0, 1]], { yeoul: 'gyoran' }, map), 'dokkaebi1', [4, 4], [3, 4]],
    ['맵 밖', arena([['dokkaebi', 0, 4]], { yeoul: 'gyoran' }), 'dokkaebi', [1, 4], [0, 4]],
    ['다른 유닛', arena([['dokkaebi', 3, 4], ['dokkaebi', 2, 4]], { yeoul: 'gyoran' }), 'dokkaebi1', [4, 4], [3, 4]]
  ];
  for (const [why, s, id, at, stay] of cases) {
    put(s, 'yeoul', ...at);
    const d = U(s, id); d.hp = d.maxHp = 99;
    const ev = Core.control(s, 'yeoul', id);
    assert.deepEqual([d.r, d.c], stay, why);
    assert.ok(d.hp < 99, why + ': 피해는 들어간다');
    assert.ok(!ev.some((e) => e.type === 'push'), why);
  }
});

test('v0.9.3 기본공격·기술로는 더 이상 추적·교란이 걸리지 않는다 (자동 발동 폐기)', () => {
  const s = arena([['dokkaebi', 5, 2]], { hangyeol: 'chujeok' });
  const d = U(s, 'dokkaebi'); d.hp = d.maxHp = 99;
  Core.attack(s, 'hangyeol', 'dokkaebi');
  U(s, 'hangyeol').acted = false;
  Core.useSkill(s, 'hangyeol', 'dokkaebi');
  assert.equal(d.slow, false);
  const s2 = arena([['dokkaebi', 6, 4]], { yeoul: 'gyoran' });
  const e = U(s2, 'dokkaebi'); e.hp = e.maxHp = 99;
  const ev = Core.attack(s2, 'yeoul', 'dokkaebi');
  U(s2, 'yeoul').acted = false;
  const ev2 = Core.useSkill(s2, 'yeoul', 'dokkaebi');
  assert.deepEqual([e.r, e.c], [6, 4]);
  assert.ok(!ev.concat(ev2).some((x) => x.type === 'training' || x.type === 'push'));
});
test('v0.9.3 밀어내기: 강제 이동은 탈출 판정을 바로 일으키지 않는다 — 탈출로로 밀린 달래는 자기 차례에 행동한 뒤 탈출', () => {
  const s = Core.newBattle(Core.STAGES.ch2, { merit: 0, training: { yeoul: 'gyoran' } });
  const d = put(s, 'dallae_boss', 1, 7);
  d.hp = d.maxHp = 99;
  put(s, 'yeoul', 2, 7);
  const ev = Core.control(s, 'yeoul', 'dallae_boss');
  assert.deepEqual([d.r, d.c], [0, 7], '탈출로 칸으로 밀 수는 있다');
  assert.ok(Core.isEscape(s, 0, 7));
  assert.equal(s.result, null, '밀려서 바로 지지 않는다');
  assert.ok(!ev.some((e) => e.type === 'escape'));
  Core.endAllyPhase(s);
  Core.runEnemyPhase(s);
  assert.deepEqual([s.result, s.loseReason], ['lose', 'escape'], '자기 차례에 탈출');
});
test('수련 효과는 적대 대상에게만 — 중립(서낭신)에게는 추적·교란·부법이 걸리지 않는다', () => {
  const s = Core.newBattle(Core.STAGES.ch3, { merit: 0, training: { hangyeol: 'chujeok', yeoul: 'gyoran', soun: 'bubeop' } });
  const g = U(s, 'seonang');
  g.hp = g.maxHp = 999;
  put(s, 'hangyeol', g.r + 2, g.c);
  const e1 = Core.useSkill(s, 'hangyeol', 'seonang');
  assert.equal(g.slow, false);
  assert.ok(!e1.some((e) => e.type === 'training'));
  const at = [g.r, g.c];
  put(s, 'yeoul', g.r + 1, g.c);
  Core.useSkill(s, 'yeoul', 'seonang');
  assert.deepEqual([g.r, g.c], at, '서낭신은 밀리지 않는다');
  // 원귀 옆에 서낭신이 있어도 불길은 서낭신에게 번지지 않는다
  const s2 = Core.newBattle(Core.STAGES.ch3, { merit: 0, training: { soun: 'bubeop' } });
  const g2 = U(s2, 'seonang');
  const w = put(s2, 'wongwi1', g2.r + 1, g2.c);
  w.hp = w.maxHp = 99;
  s2.units.filter((u) => u.type === 'wongwi' && u !== w).forEach((u) => { u.alive = false; });
  put(s2, 'soun', w.r + 2, w.c);
  assert.deepEqual(Core.spreadTargets(s2, w), []);
  const e2 = Core.useSkill(s2, 'soun', 'wongwi1');
  assert.ok(!e2.some((e) => e.targetId === 'seonang'));
});

test('역할 문구: 기획자 확정 8개', () => {
  assert.deepEqual(Core.TRAINING_ORDER.flatMap((id) => Core.TRAININGS[id].map((t) => t.role)), [
    '적을 베며 전선을 뚫는 선봉', '괴변의 핵심을 직접 처리하는 임무 수행자',
    '멀리서 핵심 표적을 노리는 저격수', '도망치는 적의 발을 묶는 추격자',
    '여럿을 한꺼번에 태우는 술법 공격수', '길목을 막고 전장을 설계하는 진법가',
    '거리를 벌렸다 파고드는 돌격수', '적의 위치를 흐트러뜨리는 전장 교란자'
  ]);
});

test('v0.9.3 견제사격·밀어내기는 적대 대상에게만 — 서낭신(중립)은 대상이 아니다', () => {
  const s = Core.newBattle(Core.STAGES.ch3, { merit: 0, training: { hangyeol: 'chujeok', yeoul: 'gyoran' } });
  const g = U(s, 'seonang'); g.hp = g.maxHp = 999;
  s.units.filter((u) => u.side === 'enemy').forEach((u) => { u.alive = false; });
  put(s, 'hangyeol', g.r + 2, g.c);
  put(s, 'yeoul', g.r + 1, g.c);
  assert.ok(Core.attackTargets(s, U(s, 'hangyeol')).includes(g), '기본 공격은 된다 (확인창)');
  assert.deepEqual(Core.controlTargets(s, U(s, 'hangyeol')), []);
  assert.deepEqual(Core.controlTargets(s, U(s, 'yeoul')), []);
  assert.equal(Core.control(s, 'hangyeol', 'seonang'), null);
  assert.equal(Core.control(s, 'yeoul', 'seonang'), null);
  assert.equal(g.hp, 999);
});
test('v0.9.3 이미 추적·교란을 고른 저장도 새 행동이 그대로 보인다 (저장 형식 그대로)', () => {
  const saved = Core.checkProgress({ v: 1, cleared: ['ch1', 'ch2', 'ch3'], merit: 13, training: { hangyeol: 'chujeok', yeoul: 'gyoran' } });
  assert.deepEqual(saved.training, { hangyeol: 'chujeok', yeoul: 'gyoran' });
  const s = Core.newBattle(Core.STAGES.ch4, { merit: saved.merit, training: saved.training });
  assert.deepEqual([Core.controlAction(U(s, 'hangyeol')), Core.controlAction(U(s, 'yeoul'))], ['견제사격', '밀어내기']);
});
// ── 기록과 회귀 ────────────────────────────────────
test('플레이 기록: 고른 수련과 발동 횟수가 남는다', () => {
  const s = arena([['dokkaebi', 3, 3], ['dokkaebi', 0, 7]], { yoon: 'jiphaeng', hangyeol: 'chujeok' });
  const log = Core.newPlayLog(s, 'ch4', 0);
  assert.deepEqual(log.trainingChoices, { yoon: 'jiphaeng', hangyeol: 'chujeok' });
  put(s, 'yoon', 4, 3);
  U(s, 'dokkaebi1').hp = 1;
  Core.logEvents(log, s, Core.useSkill(s, 'yoon', 'dokkaebi1'));
  assert.deepEqual(log.trainingActivations, { jiphaeng: 1 });
  assert.deepEqual(log.trainingEvents, [{ turn: 1, unit: 'yoon', kind: 'jiphaeng' }]);
});

test('수련이 없으면 1~3장 규칙은 그대로 (사거리·이동력·결계 없음)', () => {
  for (const id of Core.CAMPAIGN) {
    const s = Core.newBattle(Core.STAGES[id], { merit: 0 });
    assert.equal(s.barrier, null);
    for (const u of Core.livingUnits(s, 'ally')) {
      assert.equal(u.training, null);
      assert.equal(Core.skillRange(u), u.rng);
    }
  }
});
