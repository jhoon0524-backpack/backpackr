// 5장 사라진 장부 (specs/chapter5.md)
import test from 'node:test';
import assert from 'node:assert/strict';
import { Core } from './sim.mjs';

const ch5 = Core.STAGES.ch5;
const fresh = (opts) => Core.newBattle(ch5, { merit: 13, ...opts });
const U = (s, id) => Core.getUnit(s, id);
const put = (s, id, r, c) => { const u = U(s, id); u.r = r; u.c = c; return u; };
// 좌표는 스테이지에서 읽는다 (맵은 자동 검증으로 조정되는 AI 초안)
const GK = ch5.points.find((p) => p.id === 'gaeksa'), GM = ch5.points.find((p) => p.id === 'golmok');
const OFF = ch5.appear;
const ADJ = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const open = (r, c) => ch5.map[r] && ch5.map[r][c] === '.';
const NEXT_TO_OFF = ADJ.map(([dr, dc]) => [OFF.r + dr, OFF.c + dc]).find(([r, c]) => open(r, c));
const TWO_FROM_OFF = ADJ.map(([dr, dc]) => [NEXT_TO_OFF[0] + dr, NEXT_TO_OFF[1] + dc]).find(([r, c]) => open(r, c) && Math.abs(r - OFF.r) + Math.abs(c - OFF.c) === 2);
// 막다른 칸 (성문 길에 없는 곳) — 다른 아군을 치워 둘 자리
const PARK = [[1, 0], [1, 7], [8, 0], [8, 2], [8, 5], [1, 5]];
// 흔적 두 곳 → 관리 옆 → 운반자 등장까지
function toChase(s) {
  put(s, 'yoon', GK.r, GK.c); Core.arrive(s, 'yoon');
  put(s, 'hangyeol', GM.r, GM.c); Core.arrive(s, 'hangyeol');
  put(s, 'soun', ...NEXT_TO_OFF); return Core.arrive(s, 'soun');
}
function parkOthers(s, keep) {
  let i = 0;
  for (const u of Core.livingUnits(s, 'ally')) if (!keep.includes(u.id)) put(s, u.id, ...PARK[i++]);
}

test('5장 스테이지: 10×8·15턴, 성문 두 곳(북·남, 칸 2개씩), 시작 적 없음, 에디터 검사 오류 없음, 최대 공적 6', () => {
  assert.deepEqual([ch5.rows, ch5.cols, ch5.maxTurn], [10, 8, 15]);
  assert.equal(Core.validateStage(ch5).filter((p) => p.level === 'error').length, 0);
  const s = fresh();
  assert.equal(Core.livingUnits(s, 'enemy').length, 0);
  const gates = [0, 9].map((r) => [...Array(8).keys()].filter((c) => Core.isEscape(s, r, c)));
  assert.deepEqual(gates, [[3, 4], [3, 4]], '관군 한 명으로는 성문 하나도 막히지 않는다');
  assert.equal(Core.maxMerit(ch5), 6, '관리 확보 1 + 운반자 확보 2 + 임무 완료 3');
  assert.equal(s.objective.phase, 'investigate');
});

test('아군은 객사 앞 큰길에서 시작 — 성문을 막고 있지 않고, 두 성문 모두 4칸 이상', () => {
  const s = fresh();
  for (const a of Core.livingUnits(s, 'ally')) {
    assert.ok(!Core.isEscape(s, a.r, a.c), a.id);
    assert.ok(a.r >= 3 && a.r <= 4, a.id + ' 가운데 줄');
    for (const gr of [0, 9]) assert.ok(Math.abs(a.r - gr) >= 3, a.id); // 세로로 3줄 이상 + 가로 이동 → 실제 4칸 이상
  }
  for (const y of Core.livingUnits(s, 'ally')) {
    const steps = (gr) => {
      const seen = { [y.r + ',' + y.c]: 0 }, q = [[y.r, y.c]];
      while (q.length) { const [r, c] = q.shift(); for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = (r + dr) + ',' + (c + dc); if (seen[k] === undefined && Core.isPassable(s, r + dr, c + dc)) { seen[k] = seen[r + ',' + c] + 1; q.push([r + dr, c + dc]); } } }
      return Math.min(...[3, 4].map((c) => seen[gr + ',' + c]));
    };
    assert.ok(steps(0) >= 4 && steps(9) >= 4, `${y.id} 북 ${steps(0)} 남 ${steps(9)}`);
  }
});

test('흔적 연쇄: 뒷골목은 객사를 조사하기 전에는 조사되지 않는다. 두 곳째에 관리가 드러난다', () => {
  const s = fresh();
  const golmok = Core.pointById(s, 'golmok');
  assert.equal(Core.pointOpen(s, golmok), false);
  put(s, 'hangyeol', GM.r, GM.c);
  assert.deepEqual(Core.arrive(s, 'hangyeol'), [], '객사 먼저');
  put(s, 'yoon', GK.r, GK.c);
  assert.deepEqual(Core.arrive(s, 'yoon').map((e) => e.type), ['investigate']);
  assert.equal(Core.pointOpen(s, golmok), true);
  const ev = Core.arrive(s, 'hangyeol'); // 그 자리 (뒷골목) 에서 다시
  assert.deepEqual(ev.map((e) => e.type), ['investigate', 'truth', 'appear']);
  assert.equal(s.objective.phase, 'find');
  const off = U(s, 'official');
  assert.deepEqual([off.side, off.untargetable, off.mov], ['neutral', true, 0]);
  assert.equal(s.merit, 0, '흔적 자체에는 공적이 없다');
});

test('관리: 누구도 칠 수 없고 움직이지 않는다. 옆 칸에 서면 관리 확보 +1 → 운반자 등장 → 추격 단계', () => {
  const s = fresh();
  put(s, 'yoon', GK.r, GK.c); Core.arrive(s, 'yoon');
  put(s, 'hangyeol', GM.r, GM.c); Core.arrive(s, 'hangyeol');
  const off = U(s, 'official');
  const y = put(s, 'yoon', ...TWO_FROM_OFF);
  assert.deepEqual(Core.arrive(s, 'yoon'), [], '두 칸 떨어지면 아니다');
  put(s, 'yoon', ...NEXT_TO_OFF);
  assert.ok(!Core.attackTargets(s, y).includes(off), '칠 수 없다');
  const ev = Core.arrive(s, 'yoon');
  assert.deepEqual(ev.map((e) => e.type), ['official', 'runner']);
  assert.deepEqual([s.objective.phase, s.merit], ['chase', 1]);
  const r = U(s, 'runner');
  assert.deepEqual([r.side, r.human, r.runner, r.maxHp, r.atk, r.def, r.mov, r.rng], ['enemy', true, true, 28, 8, 5, 4, 1]);
  s.phase = 'enemy';
  assert.deepEqual(Core.enemyAct(s, 'official'), [], '관리는 아무것도 하지 않는다');
});

test('관리가 드러날 때 이미 옆에 선 아군이 있으면 바로 이야기한다', () => {
  const s = fresh();
  put(s, 'soun', ...NEXT_TO_OFF);
  put(s, 'yoon', GK.r, GK.c); Core.arrive(s, 'yoon');
  put(s, 'hangyeol', GM.r, GM.c);
  const ev = Core.arrive(s, 'hangyeol');
  assert.deepEqual(ev.map((e) => e.type), ['investigate', 'truth', 'appear', 'official', 'runner']);
});

test('운반자: 싸우지 않고 가까운 성문으로 간다. 성문에 닿으면 패배 (탈출)', () => {
  const s = fresh();
  toChase(s);
  parkOthers(s, []);
  const r = U(s, 'runner');
  const before = Core.runnerSteps(s);
  Core.endAllyPhase(s);
  const ev = Core.enemyAct(s, 'runner');
  assert.ok(!ev.some((e) => e.type === 'damage'), '공격하지 않는다');
  assert.ok(Core.runnerSteps(s) < before, '성문에 가까워진다');
  let guard = 0;
  while (s.result === null && guard++ < 5) { Core.enemyAct(s, 'runner'); }
  assert.deepEqual([s.result, s.loseReason], ['lose', 'escape']);
  assert.ok(Core.isEscape(s, r.r, r.c));
});

test('한 성문이 막히면 다른 성문으로 간다 (북문을 막으면 남문, 남문을 막으면 북문)', () => {
  for (const [block, other] of [[[[9, 3], [9, 4]], '북문'], [[[0, 3], [0, 4]], '남문']]) {
    const s = fresh();
    toChase(s);
    const blockers = ['gwangun1', 'gwangun2'];
    parkOthers(s, blockers); // 다른 아군은 길에서 치운다
    block.forEach(([r, c], i) => put(s, blockers[i], r, c));
    const g = Core.runnerGates(s);
    assert.equal(g[0].name, other, JSON.stringify(g));
    assert.equal(g.length, 1, '막힌 성문은 목록에서 빠진다');
  }
});

test('관군 한 명으로는 성문 하나를 막지 못한다 (성문 칸 두 개, 길목 두 칸)', () => {
  const s = fresh();
  toChase(s);
  parkOthers(s, ['gwangun1']);
  for (const cell of [[9, 3], [8, 3], [7, 3], [0, 3], [1, 3], [2, 3], [8, 4], [1, 4]].filter(([r, c]) => open(r, c) || ch5.map[r][c] === 'E')) {
    put(s, 'gwangun1', ...cell);
    const names = Core.runnerGates(s).map((g) => g.name).sort();
    assert.deepEqual(names, ['남문', '북문'], `관군 (${cell}) 하나로는 두 성문 모두 열려 있다`);
  }
});

test('성문 두 곳을 모두 막으면 운반자는 아군에게서 먼 칸으로 버틴다 (탈출하지 못함)', () => {
  const s = fresh();
  toChase(s);
  parkOthers(s, ['gwangun1', 'gwangun2', 'yoon', 'hangyeol']);
  [['gwangun1', 9, 3], ['gwangun2', 9, 4], ['yoon', 0, 3], ['hangyeol', 0, 4]].forEach(([id, r, c]) => put(s, id, r, c));
  assert.deepEqual(Core.runnerGates(s), []);
  Core.endAllyPhase(s);
  for (let i = 0; i < 3; i++) Core.enemyAct(s, 'runner');
  assert.equal(s.result, null);
});

test('중간 사건: 운반자 HP 가 절반 이하가 되면 한 번 — 봉인 문서가 떨어지고 귀화 2 등장', () => {
  const s = fresh();
  toChase(s);
  const r = U(s, 'runner');
  const y = put(s, 'yeoul', r.r - 1, r.c);
  r.hp = 15;
  const ev = Core.attack(s, 'yeoul', 'runner');
  assert.ok(r.hp <= 14 && r.alive);
  assert.deepEqual(ev.filter((e) => e.type !== 'damage').map((e) => e.type), ['ledgerPage', 'reinforce', 'reinforce']);
  assert.equal(Core.livingUnits(s, 'enemy').filter((u) => u.type === 'gwihwa').length, 2);
  y.acted = false; r.hp = 10;
  const ev2 = Core.attack(s, 'yeoul', 'runner');
  assert.ok(!ev2.some((e) => e.type === 'ledgerPage'), '한 번만');
});

test('승리: 운반자 제압 (사람 — 죽지 않는다). 귀화가 남아 있어도 이긴다. 공적 = 관리 1 + 운반자 확보 2 + 완료 3', () => {
  const s = fresh();
  toChase(s);
  const r = U(s, 'runner');
  put(s, 'yeoul', r.r - 1, r.c);
  r.hp = 15;
  Core.attack(s, 'yeoul', 'runner'); // 중간 사건 → 귀화 2
  U(s, 'yeoul').acted = false;
  r.hp = 1;
  const ev = Core.attack(s, 'yeoul', 'runner');
  const d = ev.find((e) => e.type === 'defeat');
  assert.equal(Core.DEFEAT_TYPES[d.defeatType], '제압');
  assert.equal(d.merit, 0, '사람을 쓰러뜨린 공적은 0');
  assert.deepEqual([s.result, s.merit], ['win', 6]);
  assert.ok(Core.livingUnits(s, 'enemy').some((u) => u.type === 'gwihwa'));
});

test('패배: 15턴이 끝나면 / 아군 전원 퇴각', () => {
  const s = fresh();
  s.turn = 15;
  Core.endAllyPhase(s);
  Core.runEnemyPhase(s);
  assert.deepEqual([s.result, s.loseReason], ['lose', 'time']);
});

test('수련: 견제사격은 운반자 이동 −2, 밀어내기는 운반자를 성문에서 멀어지게 할 수 있다, 결계는 골목을 막는다', () => {
  const s = fresh({ training: { hangyeol: 'chujeok', yeoul: 'gyoran', soun: 'jinbeop' } });
  toChase(s);
  const r = U(s, 'runner');
  const two = [[0, -2], [0, 2], [-2, 0], [2, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]].map(([dr, dc]) => [r.r + dr, r.c + dc]).find(([rr, cc]) => open(rr, cc) && !Core.unitAt(s, rr, cc));
  put(s, 'hangyeol', ...two);
  Core.control(s, 'hangyeol', 'runner');
  assert.equal(r.slow, true);
  assert.equal(Math.max(...Core.moveTargets(s, r).map((p) => p.cost)), 2, '이동 4 → 2');
  // 밀어내기: 운반자를 남문 쪽 반대로 민다
  const s2 = fresh({ training: { yeoul: 'gyoran' } });
  toChase(s2);
  parkOthers(s2, ['yeoul']);
  const r2 = put(s2, 'runner', 7, 3); // 남문 (9,3) 두 칸 앞
  put(s2, 'yeoul', 8, 3);
  const before = Core.runnerSteps(s2);
  Core.control(s2, 'yeoul', 'runner');
  assert.deepEqual([r2.r, r2.c], [6, 3]);
  assert.ok(Core.runnerSteps(s2) > before, '성문까지 더 멀어졌다');
  // 결계: 남문 앞 길목 (7,3) 에 칠 수 있다. 조사 지점(뒷골목) 칸에는 칠 수 없다 — 기존 규칙
  const s3 = fresh({ training: { soun: 'jinbeop' } });
  toChase(s3);
  const so = put(s3, 'soun', 6, 3);
  so.acted = false;
  assert.ok(Core.barrierCells(s3, so).some((c) => c.r === 7 && c.c === 3), '길목에 결계를 칠 수 있다');
  const so2 = put(s3, 'soun', GM.r + 1, GM.c);
  assert.ok(!Core.barrierCells(s3, so2).some((c) => c.r === GM.r && c.c === GM.c), '조사 지점 칸은 안 된다');
});

test('플레이 기록: 흔적 턴·관리 발견·운반자 등장·제압 턴·성문까지 거리·무엇이 막았나 (5장에만 필드가 생긴다)', () => {
  const s2 = fresh({ training: { hangyeol: 'chujeok' } });
  const log2 = Core.newPlayLog(s2, 'ch5', 0);
  put(s2, 'yoon', GK.r, GK.c); Core.logEvents(log2, s2, Core.arrive(s2, 'yoon'));
  put(s2, 'hangyeol', GM.r, GM.c); Core.logEvents(log2, s2, Core.arrive(s2, 'hangyeol'));
  put(s2, 'soun', ...NEXT_TO_OFF); Core.logEvents(log2, s2, Core.arrive(s2, 'soun'));
  parkOthers(s2, ['hangyeol']);
  const r = U(s2, 'runner');
  const two = [[2, 0], [-2, 0], [0, -2], [0, 2]].map(([dr, dc]) => [r.r + dr, r.c + dc]).find(([rr, cc]) => open(rr, cc) && !Core.unitAt(s2, rr, cc));
  put(s2, 'hangyeol', ...two); U(s2, 'hangyeol').acted = false; // 운반자 아래쪽 — 북문 길을 막지 않는 자리
  Core.logEvents(log2, s2, Core.control(s2, 'hangyeol', 'runner'));
  put(s2, 'gwangun1', 0, 3); put(s2, 'gwangun2', 0, 4); // 가까운 북문을 막는다 → 남문으로 돌아간다
  Core.logEvents(log2, s2, Core.endAllyPhase(s2));
  Core.logEvents(log2, s2, Core.enemyAct(s2, 'runner'));
  assert.deepEqual(log2.clueTurns, [1, 1]);
  assert.deepEqual([log2.officialFoundTurn, log2.runnerSpawnTurn, log2.runnerSlowedByChujeok], [1, 1, 1]);
  assert.ok(log2.runnerDistanceToExitByTurn.length >= 2);
  assert.equal(log2.runnerBlockedBySoldier, 1, '북문을 막은 관군');
  const ch4log = Core.newPlayLog(Core.newBattle(Core.STAGES.ch4, { merit: 13 }), 'ch4', 0);
  assert.ok(!('clueTurns' in ch4log), '다른 장의 기록 모양은 그대로');
});

test('월드맵: 4장 뒤 큰고을 [조사한다], 5장 뒤 큰고을 안정됨·나루터 괴변 발생(조사 준비 중)·급보, 수련점 추가 없음', () => {
  const after4 = { v: 1, cleared: ['ch1', 'ch2', 'ch3', 'ch4'], merit: 19, training: {} };
  const after5 = { v: 1, cleared: ['ch1', 'ch2', 'ch3', 'ch4', 'ch5'], merit: 25, training: {} };
  assert.equal(Core.sortieChapter(after4, 'keungoeul'), 'ch5');
  assert.equal(Core.regionById('keungoeul').action, '조사한다');
  const w = Core.worldState(after5);
  assert.deepEqual([w.keungoeul, w.naru], ['STABILIZED', 'EXORCISM_REQUIRED']);
  assert.equal(Core.worldState(after4).naru, 'PEACEFUL');
  assert.match(Core.regionDesc(Core.regionById('keungoeul'), 'STABILIZED'), /관리는 확보됐다/);
  assert.match(Core.regionDesc(Core.regionById('naru'), 'EXORCISM_REQUIRED'), /사공 없는 배/);
  assert.equal(Core.regionNote(Core.regionById('naru'), 'EXORCISM_REQUIRED'), '조사 준비 중');
  assert.equal(Core.regionNote(Core.regionById('naru'), 'PEACEFUL'), '아직 강을 건널 때가 아니다.');
  assert.deepEqual(Core.worldNews(after5, []).map((n) => n.region), ['naru']);
  assert.match(Core.worldNews(after5, [])[0].text, /배 밑에서 사람이 두드리는 소리/);
  assert.equal(Core.trainingPoints(after5), 3, '5장은 수련점을 주지 않는다');
  assert.equal(Core.rankFor(after5.merit).name, '종8품', '새 품계 없음');
});
