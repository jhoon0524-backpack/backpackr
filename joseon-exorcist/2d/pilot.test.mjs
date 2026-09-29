// 2D 파일럿 v2 규칙 검사 — 2d/DESIGN-BRIEF.md (v2, [v2-수정1]·[v2-수정2]) 6-1 수치표 · 8장 추격 · 8-5 귀화 · 8-6 봇 · 9장 패배.
// core.js / stage-ch5.js 는 DOM 을 쓰지 않으므로 Node 에서 그대로 불러 쓴다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const C = require('./core.js');
const S = require('./stage-ch5.js');
const G = C.buildGraph(S);
const K = C.K;
const DT = 1 / 60;

function chase() { return C.createChase(S, { graph: G }); }
function run(st, bot, maxT) {
  for (let i = 0; i < maxT / DT && !st.over; i++) { C.step(st, DT, bot ? bot(st) : {}); st.events.length = 0; }
  return st;
}
function toward(st, u, goal) {
  const path = C.planPath(st, u, goal);
  const q = path[0];
  const d = Math.hypot(q.x - u.x, q.y - u.y);
  return d > 1 && Math.hypot(goal.x - u.x, goal.y - u.y) > 6 ? { mx: (q.x - u.x) / d, my: (q.y - u.y) / d } : { mx: 0, my: 0 };
}
const pt = (a) => ({ x: a[0], y: a[1] });

// ── 6-1 수치표 ─────────────────────────────────────────────
test('6-1: 아무것도 안 하면 운반자가 약 4.9초에 북문 빗장에 붙고 약 11.9초에 탈출', () => {
  const st = chase();
  let arrive = null;
  run(st, (s) => { if (arrive === null && s.runner.state === 'work') arrive = s.t; return {}; }, 30);
  assert.ok(Math.abs(arrive - S.DESIGN_TABLE.runnerToGate) <= 0.3, `빗장 도착 ${arrive.toFixed(2)}초`);
  assert.equal(st.over.result, 'escape');
  assert.ok(Math.abs(st.over.t - S.DESIGN_TABLE.nothing) <= 0.3, `탈출 ${st.over.t.toFixed(2)}초`);
});

test('6-1: 관군 2 → 북문(0.5초에 탭)만 하면 밀쳐 내기 2.5초 × 2 뒤 빗장 → 약 16.9초 탈출 (관군은 게이지를 못 깎는다)', () => {
  const st = chase();
  let sent = false;
  run(st, (s) => { if (!sent && s.t >= 0.5) { sent = true; C.commandSoldier(s, 'sol1', 'N'); C.commandSoldier(s, 'sol2', 'N'); } return {}; }, 40);
  assert.equal(st.over.result, 'escape');
  assert.ok(Math.abs(st.over.t - S.DESIGN_TABLE.soldiersNorth) <= 0.5, `탈출 ${st.over.t.toFixed(2)}초`);
  assert.equal(st.runner.gauge, K.GAUGE);
});

test('6-1: 인물·관군이 성문(빗장·지킴 자리)까지 가는 시간이 표와 ±0.5초', () => {
  const st = chase();
  const want = { yoon: 3.9, yeoul: 3.3, hangyeol: 4.1, soun: 4.3 };
  for (const [id, t] of Object.entries(want)) {
    const u = C.unit(st, id);
    for (const g of ['N', 'S']) {
      const secs = C.pathLength(u, C.planPath(st, u, pt(S.GATES[g].latch))) / u.speed;
      assert.ok(Math.abs(secs - t) <= 0.5, `${id} → ${g} ${secs.toFixed(2)}초 (표 ${t})`);
    }
  }
  for (const id of ['sol1', 'sol2']) {
    const u = C.unit(st, id);
    const tN = C.pathLength(u, C.planPath(st, u, pt(S.GATES.N.posts[0]))) / u.speed;
    const tS = C.pathLength(u, C.planPath(st, u, pt(S.GATES.S.posts[0]))) / u.speed;
    assert.ok(Math.abs(tN - S.DESIGN_TABLE.soldierToN) <= 0.5, `${id} → 북문 ${tN.toFixed(2)}`);
    assert.ok(Math.abs(tS - S.DESIGN_TABLE.soldierToS) <= 0.5, `${id} → 남문 ${tS.toFixed(2)}`);
  }
});

// ── 8-2 · 8-3 [v2-수정2] 성문 경계 · 정면 막기 ──────────────────
function atGate(st, facing) {
  // 운반자를 북문 빗장 자리에 두고 일을 시작하게 한다 (기본은 성문 쪽을 봄)
  const r = st.runner;
  r.x = 240; r.y = 40; r.state = 'work'; r.target = 'N'; r.prepT = 0; r.facing = facing || { x: 0, y: -1 };
}
const angle = (a, b) => Math.acos(Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y)));

test('8-3: 동료 자동 공격·관군·원거리(화살·견제사격·부적)의 제압치는 0', () => {
  const st = chase();
  atGate(st);
  const r = st.runner;
  C.hitRunner(st, C.unit(st, 'yeoul'), { subdue: 2, ranged: false, kind: 'melee' }); // 조종 인물이 아님
  C.hitRunner(st, C.unit(st, 'sol1'), { subdue: 2, ranged: false, kind: 'melee' });
  assert.equal(r.gauge, K.GAUGE);
  const st2 = chase(); atGate(st2); C.switchControl(st2, 'hangyeol');
  const h = C.unit(st2, 'hangyeol'); h.x = 240; h.y = 150;
  C.attack(st2, h); // 자동 조준 화살 — 등 뒤에서
  assert.equal(st2.runner.gauge, K.GAUGE);
  assert.equal(st2.runner.gateHits, 1, '화살도 성문에서 옆·뒤로 맞으면 "맞음"에 들어간다');
  assert.ok(st2.runner.latch.N === 0);
  const st3 = chase(); atGate(st3); C.switchControl(st3, 'soun');
  const so = C.unit(st3, 'soun'); so.x = 240; so.y = 150; so.facing = { x: 0, y: -1 };
  C.attack(st3, so);
  run(st3, () => ({}), 0.6);
  assert.equal(st3.runner.gauge, K.GAUGE);
});

test('8-2 규칙 2-1 [v2-수정2]: 바라보는 쪽 ±60° 에서 친 것은 막힘 — 제압치 0, 빗장 영향 0, 포기 횟수 0', () => {
  const st = chase();
  atGate(st, { x: 0, y: 1 }); // 다가온 윤무겸 쪽으로 돌아선 운반자
  st.runner.latch.N = 5;
  const me = C.unit(st, 'yoon'); me.x = 240; me.y = 80; me.facing = { x: 0, y: -1 };
  let blocked = 0;
  for (let k = 0; k < 3; k++) {
    me.atkT = 0; C.attack(st, me);
    blocked += st.events.filter((e) => e.type === 'hitRunner' && e.blocked).length; st.events.length = 0;
  }
  assert.equal(st.runner.gauge, K.GAUGE);
  assert.equal(st.runner.latch.N, 5);
  assert.equal(st.runner.gateHits, 0);
  assert.equal(st.runner.state, 'work');
  assert.equal(blocked, 3);
  assert.equal(st.log.hits.blocked, 3);
  // ±60° 경계: 정면에서 55° 는 막히고 65° 는 들어간다
  for (const [deg, blockedWant] of [[55, true], [65, false]]) {
    const s2 = chase(); atGate(s2, { x: 0, y: 1 });
    const a = Math.PI / 2 - deg * Math.PI / 180;
    const m = C.unit(s2, 'yoon'); m.x = 240 + Math.cos(a) * 40; m.y = 40 + Math.sin(a) * 40;
    C.hitRunner(s2, m, { subdue: 2, ranged: false, kind: 'melee' });
    assert.equal(s2.runner.gauge === K.GAUGE, blockedWant, `${deg}°`);
  }
});

test('8-3 [v2-수정2]: 옆·뒤는 ×1 — 윤무겸 2·2 = 4 에서 2타 포기, 벽사검 4 + 2 = 6 (한 교전 최대), 한 번에 빗장 −2초', () => {
  const st = chase();
  atGate(st);
  st.runner.latch.N = 5;
  const me = C.unit(st, 'yoon'); me.x = 240; me.y = 80; me.facing = { x: 0, y: -1 };
  me.atkT = 0; C.attack(st, me);
  assert.equal(st.runner.latch.N, 5 - K.LATCH_HIT);
  assert.equal(K.LATCH_HIT, 2);
  assert.equal(st.runner.state, 'work');
  me.atkT = 0; C.attack(st, me);
  assert.equal(st.runner.gauge, K.GAUGE - 4);
  assert.equal(st.runner.state, 'run', '옆·뒤 2번 맞으면 성문을 포기하고 달린다');
  assert.equal(st.runner.target, 'S');
  // 옆(90°)에서 친 것도 들어간다
  const s1 = chase(); atGate(s1);
  const m1 = C.unit(s1, 'yoon'); m1.x = 280; m1.y = 40; m1.facing = { x: -1, y: 0 };
  C.attack(s1, m1);
  assert.equal(s1.runner.gauge, K.GAUGE - 2);
  const st2 = chase(); atGate(st2);
  const m2 = C.unit(st2, 'yoon'); m2.x = 240; m2.y = 140; m2.facing = { x: 0, y: -1 };
  C.useSkill(st2, m2, { x: 0, y: -1 });
  m2.atkT = 0; C.attack(st2, m2);
  assert.equal(st2.runner.gauge, K.GAUGE - 6);
  assert.equal(st2.runner.state, 'run');
  assert.equal(K.BACK_MULT, 1, '×1.5 없음');
});

test('8-2 규칙 3 [v2-수정2]: 봉인 문서 뒤에는 옆·뒤 1타로 포기, 포기 뒤 "안 밀림" 시간은 없다', () => {
  const st = chase();
  atGate(st);
  st.sealDone = true;
  const me = C.unit(st, 'yoon'); me.x = 240; me.y = 80;
  const y0 = me.y;
  C.hitRunner(st, me, { subdue: 2, ranged: false, kind: 'melee' });
  assert.equal(st.runner.target, 'S');
  assert.equal(st.runner.state, 'run');
  assert.ok(me.y - y0 > 30, '주변 56u 아군을 48u 밀쳐 냄');
  assert.ok(me.stunT > 0.3);
  assert.equal('immuneT' in st.runner, false);
  assert.equal('ABANDON_IMMUNE' in K, false);
});

test('8-2 규칙 2 [v2-수정2]: 110u 안의 조종 인물 쪽으로 초당 95° [기획자 결정·마스터 조정](봉인 뒤 2.4 rad) 돌아서고, 경계 중 빗장은 절반 속도', () => {
  for (const [sealed, rate] of [[false, K.TURN], [true, K.TURN_SEAL]]) {
    const st = chase();
    atGate(st); st.sealDone = sealed;
    const me = C.unit(st, 'yoon'); me.x = 240; me.y = 140; // 100u 뒤
    for (const u of C.heroes(st)) if (u.id !== 'yoon') u.down = true;
    for (const id of ['sol1', 'sol2']) C.unit(st, id).down = true;
    run(st, () => ({}), 0.5);
    const turned = angle(st.runner.facing, { x: 0, y: -1 });
    assert.ok(Math.abs(turned - rate * 0.5) < 0.06, `0.5초에 ${turned.toFixed(2)} rad (기대 ${rate * 0.5})`);
    run(st, () => ({}), 1.5);
    assert.ok(angle(st.runner.facing, { x: 0, y: 1 }) < 0.01, '끝내 정면으로 본다');
    assert.ok(Math.abs(st.runner.latch.N - 2.0 * K.ALERT_LATCH) < 0.05, `경계 중 빗장 ${st.runner.latch.N.toFixed(2)}`);
  }
  assert.equal(K.TURN, 95 * Math.PI / 180); assert.equal(K.TURN_SEAL, 2.4); assert.equal(K.ALERT_R, 110); assert.equal(K.ALERT_LATCH, 0.5);
  // 110u 밖이면 성문 쪽을 보고 빗장은 제 속도
  const s2 = chase(); atGate(s2, { x: 0, y: 1 });
  const m2 = C.unit(s2, 'yoon'); m2.x = 240; m2.y = 300;
  run(s2, () => ({}), 2.0);
  assert.ok(angle(s2.runner.facing, { x: 0, y: -1 }) < 0.01);
  assert.ok(s2.runner.latch.N > 1.5);
});

test('8-2 규칙 2-2 [v2-수정2]: 성문에서도 정면 76u 안이면 0.4초 예고 후 밀치기 (피해 2)', () => {
  const st = chase();
  atGate(st, { x: 0, y: 1 });
  const me = C.unit(st, 'yoon'); me.x = 240; me.y = 100;
  let warned = null, shoved = null;
  for (let i = 0; i < 60; i++) {
    C.step(st, DT, {});
    for (const e of st.events) { if (e.type === 'shoveWarn' && warned === null) warned = st.t; if (e.type === 'shove' && e.hit && shoved === null) shoved = st.t; }
    st.events.length = 0;
  }
  assert.ok(warned !== null && shoved !== null);
  assert.ok(Math.abs(shoved - warned - K.SHOVE_WIND) < 0.05);
  assert.equal(me.hp, 30 - 2);
});

test('8-3 [v2-수정1]: 달리는 구간의 제압치 합 ≤ 2 (넘는 타격은 0, 비틀은 3초에 한 번)', () => {
  const st = chase();
  const r = st.runner;
  r.state = 'run'; r.prepT = 0; r.segSum = 0;
  const me = C.unit(st, 'yoon');
  let flinches = 0;
  for (let k = 0; k < 8; k++) {
    const before = r.flinchT;
    C.hitRunner(st, me, { subdue: 3, ranged: false, kind: 'melee' });
    if (r.flinchT > before) flinches++;
  }
  assert.equal(r.gauge, K.GAUGE - K.SEG_CAP);
  assert.equal(flinches, 1);
  // 구간은 성문 교전(옆·뒤 2타 포기) 때 새로 생긴다
  atGate(st);
  me.x = 240; me.y = 90;
  for (let k = 0; k < 2; k++) C.hitRunner(st, me, { subdue: 2, ranged: false, kind: 'melee' });
  assert.equal(r.state, 'run');
  assert.equal(r.segSum, 0);
});

test('8-2 규칙 4: 달리는 운반자 앞 44u 안의 조종 인물은 0.4초 예고 후 밀쳐짐 (피해 2)', () => {
  const st = chase();
  const r = st.runner;
  r.state = 'run'; r.prepT = 0; r.x = 240; r.y = 400; r.lastDir = { x: 0, y: -1 };
  r.path = [{ x: 240, y: 40 }];
  const me = C.unit(st, 'yoon'); me.x = 240; me.y = 330;
  let warned = null, shoved = null;
  for (let i = 0; i < 60; i++) {
    C.step(st, DT, {});
    for (const e of st.events) { if (e.type === 'shoveWarn' && warned === null) warned = st.t; if (e.type === 'shove' && shoved === null) shoved = st.t; }
    st.events.length = 0;
  }
  assert.ok(warned !== null && shoved !== null);
  assert.ok(Math.abs(shoved - warned - K.SHOVE_WIND) < 0.05);
  assert.equal(K.SHOVE_DMG, 2);
  assert.equal(me.hp, 30 - 2);
});
test('끼임 방지: 조종 인물이 빗장 바로 옆(24u)에 버티고 서 있어도 운반자는 28u 안에서 일을 시작하고 빗장이 풀린다', () => {
  const st = chase();
  const r = st.runner;
  r.state = 'run'; r.prepT = 0; r.target = 'N'; r.x = 249; r.y = 38; r.path = []; r.lastDir = { x: 0, y: -1 };
  C.switchControl(st, 'yeoul'); st.switchCd = 0;
  const me = C.unit(st, 'yeoul'); me.x = 216; me.y = 46;
  for (const u of C.heroes(st)) if (u.id !== 'yeoul') u.down = true;
  for (const id of ['sol1', 'sol2']) C.unit(st, id).down = true;
  run(st, () => { me.x = 216; me.y = 46; return {}; }, 6); // 밀쳐져도 곧바로 그 자리로 돌아와 버틴다
  assert.ok(C.runnerWorking(r) || st.over, `운반자 ${r.state} (${r.x.toFixed(0)},${r.y.toFixed(0)})`);
  assert.ok(r.latch.N > 1, `빗장 ${r.latch.N.toFixed(2)}`);
});
test('회피: 0.25초 동안 무적 — 밀치기를 흘린다', () => {
  const st = chase();
  const r = st.runner;
  r.state = 'run'; r.prepT = 0; r.x = 240; r.y = 400; r.lastDir = { x: 0, y: -1 }; r.path = [{ x: 240, y: 40 }];
  const me = C.unit(st, 'yoon'); me.x = 240; me.y = 330;
  let dodged = false;
  for (let i = 0; i < 60; i++) {
    const inp = {};
    if (r.shoveWind > 0 && r.shoveWind < 0.2 && !dodged) { inp.dodge = true; inp.mx = 1; dodged = true; }
    C.step(st, DT, inp); st.events.length = 0;
  }
  assert.equal(me.hp, 30);
});

// ── 8-5 봉인 문서 · 귀화 ───────────────────────────────────
function sealAtN(st) {
  atGate(st); st.runner.gauge = 15;
  const me = C.unit(st, 'yoon'); me.x = 240; me.y = 80;
  C.hitRunner(st, me, { subdue: 2, ranged: false, kind: 'melee' });
  return me;
}
test('8-5 [v2-수정2]: 게이지 14 이하에서 봉인 문서 — 먼 성문으로 도주, 귀화 ① 은 문서 자리, ② 는 운반자가 그 성문에 닿을 때', () => {
  const st = chase();
  sealAtN(st);
  assert.ok(st.sealDone);
  assert.equal(st.runner.target, 'S');
  assert.equal(st.gwihwa.length, 1);
  assert.equal(st.gwihwa[0].from, 'doc');
  assert.ok(st.gwihwa[0].riseT > 1.4, '1.5초 피어오름');
  let arriveT = null, g2 = null;
  run(st, (s) => { if (s.runner.state === 'work' && arriveT === null) arriveT = s.t; g2 = s.gwihwa.find((g) => g.from === 'gate'); if (g2 && arriveT === null) arriveT = -1; return {}; }, 12);
  assert.ok(g2, '성문 귀화가 나왔다');
  assert.notEqual(arriveT, -1, '운반자가 닿기 전에는 성문 귀화가 없다');
  // 조종 인물(북쪽)이 140u 밖이면 성문 앞을 지킨다
  run(st, () => ({}), 2.5);
  const g2b = st.gwihwa.find((g) => g.from === 'gate');
  assert.ok(g2b && Math.hypot(g2b.x - S.GATES.S.front[0], g2b.y - S.GATES.S.front[1]) < 40, '성문 앞을 지킴');
});
test('8-5: 귀화 체력 12 — "치우는 법" 표의 소요 시간', () => {
  const secsToKill = (who, useSkill, extra) => {
    const st = chase();
    st.runner.state = 'prep'; st.runner.prepT = 1e9;
    C.switchControl(st, who); st.switchCd = 0;
    for (const u of C.heroes(st)) if (u.id !== who) u.down = true; // 동료 자동 공격을 빼고 잰다
    const me = C.ctlUnit(st);
    me.x = 240; me.y = 700; me.facing = { x: 0, y: -1 };
    const gw = C.spawnGwihwa(st, 240, 700 - (extra || 44), 'doc');
    gw.riseT = 0; gw.atkT = 99;
    let t0 = null, k = 0;
    for (let i = 0; i < 60 * 20 && st.gwihwa.includes(gw); i++) {
      gw.atkT = 99; gw.x = 240; gw.y = 700 - (extra || 44); // 고정 표적
      const inp = { attack: true };
      if (useSkill && k === 0) inp.skill = true;
      k++;
      const hpBefore = gw.hp;
      C.step(st, DT, inp);
      if (t0 === null && gw.hp < hpBefore) t0 = st.t - DT;
      st.events.length = 0;
    }
    return st.t - DT - t0;
  };
  const near = (a, b, tol = 0.1) => Math.abs(a - b) <= tol;
  const t1 = secsToKill('yoon'); assert.ok(near(t1, 0.6), `윤무겸 3연 ${t1.toFixed(2)}`);
  const t2 = secsToKill('yeoul'); assert.ok(near(t2, 1.05), `여울 2연 ×2 ${t2.toFixed(2)}`);
  const t3 = secsToKill('hangyeol', false, 120); assert.ok(near(t3, 1.5), `한결 화살 ${t3.toFixed(2)}`);
  const t4 = secsToKill('soun', true, 60); assert.ok(near(t4, 0, 0.05), `소운 화염부 ${t4.toFixed(2)}`);
});
test('8-5 [v2-수정1]: 동료 자동 공격은 1.5초마다 1 — 동료 3명이면 약 4.5초', () => {
  const st = chase();
  st.runner.prepT = 1e9;
  const me = C.ctlUnit(st); me.x = 240; me.y = 800;
  const gw = C.spawnGwihwa(st, 240, 700, 'doc'); gw.riseT = 0;
  for (const id of ['hangyeol', 'yeoul', 'soun']) { const u = C.unit(st, id); u.x = 240 + (id === 'yeoul' ? 30 : id === 'soun' ? -30 : 0); u.y = 740; }
  let t = null;
  for (let i = 0; i < 60 * 10; i++) {
    gw.atkT = 99; gw.x = 240; gw.y = 700;
    for (const id of ['hangyeol', 'yeoul', 'soun']) { const u = C.unit(st, id); u.y = 740; u.path = []; }
    C.step(st, DT, {}); st.events.length = 0;
    if (!st.gwihwa.includes(gw)) { t = st.t; break; }
  }
  assert.ok(t !== null && Math.abs(t - 4.5) <= 0.2, `동료 셋 ${t}`);
});
test('8-5 [v2-수정2]: 문서가 땅에 있으면 퇴송된 귀화가 6초 뒤 되살아난다', () => {
  const st = chase();
  const me = sealAtN(st);
  st.pendingGw2 = null; // 성문 귀화는 따로 시험
  C.hitGwihwa(st, st.gwihwa[0], 99, me, 0);
  const before = st.log.gwihwaSpawned;
  run(st, () => ({}), 5.9);
  assert.equal(st.log.gwihwaSpawned, before, '6초 전에는 없음');
  run(st, () => ({}), 0.2);
  assert.equal(st.log.gwihwaSpawned, before + 1, '6초 뒤 되살아남');
});
test('8-5 [v2-수정2]: 문서 수습 — 누르고 있기 1.0초(소운 0.5초), 수습하면 문서 귀화는 사그라들고 성문 귀화는 남는다', () => {
  for (const [who, need] of [['yoon', 1.0], ['soun', 0.5]]) {
    const st = chase();
    sealAtN(st);
    C.spawnGwihwa(st, S.GATES.S.front[0], S.GATES.S.front[1], 'gate', 'S'); st.pendingGw2 = null;
    if (who !== 'yoon') C.switchControl(st, who);
    const u = C.unit(st, who); u.x = st.doc.x; u.y = st.doc.y + 20; u.stunT = 0;
    for (const g of st.gwihwa) g.riseT = 99;
    let n = 0;
    while (!st.doc.picked && n < 120) { C.step(st, DT, { attackHeld: true }); st.events.length = 0; n++; }
    assert.ok(st.doc.picked, who);
    assert.ok(Math.abs(n * DT - need) < 0.05, `${who} 수습 ${(n * DT).toFixed(2)}초`);
    assert.deepEqual(st.gwihwa.map((g) => g.from), ['gate'], '문서 귀화 사그라듦, 성문 귀화 남음');
  }
});

// ── 8-6 [v2-수정2] 실제 플레이어 행동을 흉내 낸 봇 (설계 simv2/h.mjs 를 그대로 옮김) ──
// 인위적인 제약(성문 근처에서 안 치기 등)은 두지 않는다. 사람 손 = 반응 지연 + 탭 간격 + 기술 3초에 한 번.
const PATHS = new WeakMap();
function towardC(st, u, goal) {
  let m = PATHS.get(u);
  if (!m || st.t - m.t > 0.4 || !m.path.length || Math.hypot(m.goal.x - goal.x, m.goal.y - goal.y) > 40) { m = { t: st.t, goal: { x: goal.x, y: goal.y }, path: C.planPath(st, u, goal) }; PATHS.set(u, m); }
  while (m.path.length > 1 && Math.hypot(m.path[0].x - u.x, m.path[0].y - u.y) < 3) m.path.shift();
  const q = m.path[0] || goal; const d = Math.hypot(q.x - u.x, q.y - u.y);
  return d > 1 && Math.hypot(goal.x - u.x, goal.y - u.y) > 6 ? { mx: (q.x - u.x) / d, my: (q.y - u.y) / d } : { mx: 0, my: 0 };
}
function play(bot, maxT = 155) {
  const st = chase();
  let gwOnHero = 0;
  for (let i = 0; i < maxT / DT && !st.over; i++) {
    C.step(st, DT, bot ? bot(st) : {});
    for (const e of st.events) if (e.type === 'gwihwaAttack' && C.unit(st, e.target) && C.unit(st, e.target).kind === 'hero') gwOnHero++;
    st.events.length = 0;
  }
  return { st, res: st.over ? st.over.result : 'none', t: st.t, gwOnHero, afterSeal: st.log.sealAt != null ? st.t - st.log.sealAt : null };
}
const bots = {
  nothing: () => () => ({}),
  soldiers: (orders, t0 = 0.5) => { let sent = false; return (s) => { if (!sent && s.t >= t0) { sent = true; for (const [id, o] of orders) C.commandSoldier(s, id, o); } return {}; }; },
  // 달리는 운반자를 뒤에서 쫓으며 연타 (성문에서도 붙어 있으면 그대로 침)
  chaseTap: (who) => { let k = 0; return (s) => { k++; if (who && s.control !== who && s.t > 0.2) C.switchControl(s, who); const me = C.ctlUnit(s), r = s.runner; const mv = towardC(s, me, { x: r.x - r.lastDir.x * 36, y: r.y - r.lastDir.y * 36 }); return { ...mv, attack: k % 4 === 0 && Math.hypot(r.x - me.x, r.y - me.y) < 70 }; }; },
  // 한결 화살 + 견제사격만
  arrows: () => { let k = 0; return (s) => { k++; if (s.control !== 'hangyeol' && s.t > 0.2 && !C.unit(s, 'hangyeol').down) C.switchControl(s, 'hangyeol'); const me = C.ctlUnit(s); if (me.id !== 'hangyeol') return {}; const r = s.runner; const d = Math.hypot(r.x - me.x, r.y - me.y); return { ...(d > 150 ? towardC(s, me, r) : { mx: 0, my: 0 }), attack: k % 6 === 0, skill: k % 30 === 0 }; }; },
  // 달려가 팔 길이(80u) 안이면 연타 (+기술). 사람 손: 반응 1.2초, 탭 0.45초, 기술 안 씀
  naive: (who, human) => { let k = 0, lastAtk = -9; return (s) => { k++; if (human && s.t < 1.2) return {}; if (who && s.control !== who && s.t > 0.2 && !C.unit(s, who).down) C.switchControl(s, who); const me = C.ctlUnit(s), r = s.runner; const d = Math.hypot(r.x - me.x, r.y - me.y); const atk = d < 80 && (human ? s.t - lastAtk >= 0.45 : k % 4 === 0); if (atk) lastAtk = s.t; return { ...towardC(s, me, r), attack: atk, skill: !human && k % 20 === 0 && d < 100 }; }; },
  // 성문 옆에서 기다렸다 운반자가 바라보는 쪽 ±60° 밖(옆·뒤)으로 돌아 들어가 친다. 가까운 귀화(90u)는 먼저. 정면에 붙으면 회피로 옆으로.
  flank: (opts = {}) => {
    let k = 0, lastAtk = -9, lastSk = -9, lastDodge = -9;
    return (st) => {
      k++;
      if (opts.human && st.t < (opts.react || 1.2)) return {};
      if (opts.switchTo && st.t >= 0.2 && st.control !== opts.switchTo && !C.unit(st, opts.switchTo).down) C.switchControl(st, opts.switchTo);
      if (C.ctlUnit(st).id === 'hangyeol') { for (const id of ['yoon', 'yeoul', 'soun']) if (!C.unit(st, id).down && C.switchControl(st, id)) break; }
      const me = C.ctlUnit(st), r = st.runner, g = S.GATES[r.target];
      let goal, attack = false, skill = false, attackHeld = false, dodge = false, dx = 0, dy = 0;
      const gw = st.gwihwa.filter((x) => x.riseT <= 0).map((x) => ({ x, d: Math.hypot(x.x - me.x, x.y - me.y) })).sort((a, b) => a.d - b.d)[0];
      if (opts.pickDoc && st.doc && !st.doc.picked) {
        goal = st.doc; if (Math.hypot(st.doc.x - me.x, st.doc.y - me.y) <= K.DOC_R - 4) { attackHeld = true; goal = me; }
        if (gw && gw.d < 50) { goal = gw.x; attack = true; attackHeld = false; }
      } else if (gw && gw.d < 90) { goal = gw.x; attack = gw.d < 70; skill = gw.d < 80; }
      else if (C.runnerWorking(r)) {
        const f = r.facing; const d = Math.hypot(r.x - me.x, r.y - me.y) || 1;
        const v = { x: (me.x - r.x) / d, y: (me.y - r.y) / d };
        const dot = v.x * f.x + v.y * f.y;
        if (dot < -K.BACK_COS - 0.15) { const side0 = (f.x * v.y - f.y * v.x) >= 0 ? 1 : -1; const tx = -f.y * side0, ty = f.x * side0; goal = { x: r.x + (tx * 0.8 - f.x * 0.6) * 40, y: r.y + (ty * 0.8 - f.y * 0.6) * 40 }; attack = d < 80; skill = d < 110; }
        else {
          const side = (f.x * v.y - f.y * v.x) >= 0 ? 1 : -1;
          const ang = Math.atan2(v.y, v.x) + side * 0.9;
          goal = { x: r.x + Math.cos(ang) * 92, y: r.y + Math.sin(ang) * 92 };
          if (d < 80 && dot > 0.4 && st.t - lastDodge > 1.1) { dodge = true; lastDodge = st.t; dx = -v.y * side + v.x * 0.6; dy = v.x * side + v.y * 0.6; }
        }
      } else goal = { x: g.latch[0] + (me.x < g.latch[0] ? -70 : 70), y: g.latch[1] - g.face.y * 70 };
      let mv = towardC(st, me, goal);
      if (dodge) mv = { mx: dx, my: dy };
      if (opts.human) {
        if (attack && st.t - lastAtk >= (opts.tap || 0.45)) lastAtk = st.t; else attack = false;
        if (skill && st.t - lastSk >= 3) lastSk = st.t; else skill = false;
        return { ...mv, attack, attackHeld, skill, dodge };
      }
      return { ...mv, attack: attack && k % 4 === 0, attackHeld, skill, dodge };
    };
  },
};

// 아래 결과는 경계 회전 95°/초 기준 [기획자 결정 90°/초 → 우회 경계값 때문에 마스터 조정 95°/초]. 목표는 [v2-수정2] 8-6 · I-1 그대로다.
test('8-6 우회 전략은 모두 진다: 아무것도 안 함 · 관군 2탭(북문만 / 북·남) · 여울 뒤쫓기 연타 · 윤무겸 뒤쫓기 연타 · 한결 화살만', () => {
  const cases = [
    ['아무것도 안 함', bots.nothing(), 40, 11.9],
    ['관군 2 → 북문', bots.soldiers([['sol1', 'N'], ['sol2', 'N']]), 40, 16.9],
    ['관군 1 북 · 1 남', bots.soldiers([['sol1', 'N'], ['sol2', 'S']]), 40, 14.4],
    ['여울 뒤쫓기 연타', bots.chaseTap('yeoul'), 155, null],
    ['윤무겸 뒤쫓기 연타', bots.chaseTap(null), 155, null],
    ['한결 화살만', bots.arrows(), 155, 114.5],
  ];
  for (const [name, bot, maxT, want] of cases) {
    const r = play(bot, maxT);
    assert.ok(r.res === 'escape' || r.res === 'timeout' || r.res === 'wipe', `${name}: ${r.res} @${r.t.toFixed(1)}`);
    if (want !== null) assert.ok(Math.abs(r.t - want) <= 1.5, `${name}: ${r.t.toFixed(1)}초 (브리프 8-6 ${want})`);
  }
});

test('8-6 달려가 팔 길이 안이면 연타 → 패배 또는 60초 이상 (정면 막힘이 대부분)', () => {
  const cases = [['윤무겸', bots.naive(null)], ['여울', bots.naive('yeoul')], ['소운', bots.naive('soun')], ['윤무겸 사람 손', bots.naive(null, true)], ['여울 사람 손', bots.naive('yeoul', true)]];
  for (const [name, bot] of cases) {
    const r = play(bot);
    assert.ok(r.res !== 'win' || r.t >= 60, `${name}: ${r.res} @${r.t.toFixed(1)}`);
    assert.ok(r.st.log.hits.blocked > r.st.log.hits.back, `${name}: 막힘 ${r.st.log.hits.blocked} / 옆·뒤 ${r.st.log.hits.back}`);
  }
});

// [마스터 결정] 난이도 폭(사람 손 봇 시간, 문서 먼저 ↔ 바로 추격 차, 귀화에게 맞은 횟수)은 120°/초 때의 기준이라 테스트로 막지 않고
// 측정 기록으로 console 에 낸다 (QA-NOTES · DESIGN-ISSUES v2-7). 테스트로는 바꿀 수 없는 원칙만 지킨다.
test('8-6 정확한 옆·뒤 봇(윤무겸 · 여울)은 60초 안에 제압하고, 봉인 문서 뒤 교전을 거친다', () => {
  for (const [name, bot] of [['윤무겸', bots.flank()], ['여울', bots.flank({ switchTo: 'yeoul' })]]) {
    const r = play(bot);
    assert.equal(r.res, 'win', `${name}: ${r.res} @${r.t.toFixed(1)}`);
    assert.ok(r.t <= 60, `${name}: ${r.t.toFixed(1)}초`);
    assert.ok(r.st.log.sealAt !== null && r.st.log.gwihwaDown >= 1, `${name}: 봉인 ${r.st.log.sealAt} 귀화 퇴송 ${r.st.log.gwihwaDown}`);
    assert.equal(r.st.log.hits.front, 0, '정면 타격은 들어가지 않는다');
  }
});

test('8-6 사람 손 봇: 최소 1조합 제압, "문서 먼저"·"바로 추격" 둘 다 이기는 조합이 있고, 이긴 판은 모두 봉인 뒤 20초 이상, 귀화 퇴송 3회 이상인 승리가 있다 (시간·차·맞은 횟수는 측정 기록)', () => {
  const rows = [];
  for (const who of [null, 'yeoul']) {
    for (const [react, tap] of [[1.2, 0.45], [0.8, 0.35], [1.6, 0.55]]) {
      const v = { switchTo: who || undefined, human: true, react, tap };
      rows.push({ name: `${who || 'yoon'} ${react}/${tap}`, ch: play(bots.flank({ ...v })), dc: play(bots.flank({ ...v, pickDoc: true })) });
    }
  }
  const fmt = (r) => `${r.res}@${r.t.toFixed(1)} 봉인뒤 ${r.afterSeal == null ? '-' : r.afterSeal.toFixed(1)} 귀화퇴송 ${r.st.log.gwihwaDown} 귀화에게맞음 ${r.gwOnHero}`;
  for (const { name, ch, dc } of rows) console.log(`[측정 기록] 사람 손 ${name} | 바로 추격 ${fmt(ch)} | 문서 먼저 ${fmt(dc)} | 차 ${ch.res === 'win' && dc.res === 'win' ? (dc.t - ch.t).toFixed(1) : '-'}`);
  const wins = rows.flatMap(({ ch, dc }) => [ch, dc]).filter((r) => r.res === 'win');
  assert.ok(wins.length >= 1, '사람 손 봇이 한 판도 못 이김');
  assert.ok(rows.some(({ ch }) => ch.res === 'win'), '"바로 추격"으로 이기는 조합이 없음');
  assert.ok(rows.some(({ dc }) => dc.res === 'win'), '"문서 먼저"로 이기는 조합이 없음');
  for (const r of wins) assert.ok(r.afterSeal >= 20, `봉인 뒤 ${r.afterSeal.toFixed(1)}초`);
  assert.ok(wins.some((r) => r.st.log.gwihwaDown >= 3), '귀화를 3회 이상 퇴송한 승리가 없음');
});

test('8-6 정확한 옆·뒤 봇도 이긴 판은 봉인 뒤 제압까지 20초 이상 (바로 추격 · 문서 먼저)', () => {
  for (const who of [null, 'yeoul']) for (const pickDoc of [false, true]) {
    const r = play(bots.flank({ switchTo: who || undefined, pickDoc }));
    if (r.res === 'win') assert.ok(r.afterSeal >= 20, `${who || 'yoon'} ${pickDoc ? '문서' : '추격'}: 봉인 뒤 ${r.afterSeal.toFixed(1)}초`);
  }
});

// ── 패배 3종 (9장) ─────────────────────────────────────────
test('패배: 빗장 100% · 2:30 · 전원 퇴장', () => {
  assert.equal(run(chase(), null, 30).over.result, 'escape');
  const b = chase(); b.runner.prepT = 1e9; b.sealDone = true; // 1:40 봉인 문서 보조는 따로 시험
  assert.equal(run(b, null, 151).over.result, 'timeout');
  assert.ok(Math.abs(b.over.t - 150) < 0.05);
  const c = chase();
  for (const u of C.heroes(c)) C.damage(c, u, 99);
  C.step(c, DT, {});
  assert.equal(c.over.result, 'wipe');
});
test('봉인 문서 보조: 1:40 까지 안 나오면 그때 발생', () => {
  const st = chase(); st.runner.prepT = 1e9;
  run(st, null, 100.2);
  assert.ok(st.sealDone && Math.abs(st.log.sealAt - 100) < 0.05);
});

// ── 위생 · 대사 원문 ───────────────────────────────────────
test('core.js 는 화면과 난수를 직접 쓰지 않는다', () => {
  const code = readFileSync(new URL('./core.js', import.meta.url), 'utf8');
  for (const word of ['document', 'window', 'Math.random']) assert.equal(code.includes(word), false, word);
});
test('2d/index.html 은 외부 주소를 불러오지 않는다', () => {
  const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
  assert.deepEqual(html.match(/\b(?:src|href)\s*=\s*["']?\s*(?:https?:)?\/\//gi) || [], []);
});
test('대사는 specs/chapter5.md 글자 그대로', () => {
  const spec = readFileSync(new URL('../specs/chapter5.md', import.meta.url), 'utf8');
  for (const [key, lines] of Object.entries(S.LINES)) {
    for (const [who, text] of lines) {
      if (who === 'pause') { assert.ok(spec.includes('(잠깐)')); continue; }
      assert.ok(spec.includes(`"${text}"`), `${key}: "${text}"`);
    }
  }
  assert.ok(spec.includes(S.TEXT.chapter6));
});
