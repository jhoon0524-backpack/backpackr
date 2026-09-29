// 2D 파일럿 규칙 검사 — DESIGN-BRIEF 6-1 표 · 8-2 운반자 행동 규칙 · 8-3 제압 · 8-5 귀화 · 9장 패배.
// core.js / stage-ch5.js 는 DOM 을 쓰지 않으므로 Node 에서 그대로 불러 쓴다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const C = require('./core.js');
const S = require('./stage-ch5.js');
const G = C.buildGraph(S);
const DT = 1 / 60;
const TOL = 0.5; // 초 (REVIEW-2 선택 4: 표는 ±0.5초 근사)

function chase() { return C.createChase(S, { graph: G }); }
function runUntil(st, cond, maxT, input) {
  for (let i = 0; i < maxT / DT && !st.over; i++) {
    C.step(st, DT, typeof input === 'function' ? input(st) : input || {});
    if (cond(st)) return st.t;
  }
  return null;
}
// 아군을 모두 빼고 한 명만 멀리 둔다 (전원 퇴장 패배가 나지 않게)
function isolate(st, keepId, x, y) {
  for (const u of st.units) u.down = true;
  const u = C.unit(st, keepId || 'yoon');
  u.down = false; u.x = x == null ? 15 : x; u.y = y == null ? 1400 : y; u.state = 'guard'; u.home = { x: u.x, y: u.y };
  if (st.control !== u.id) st.control = u.id;
  u.state = 'controlled';
  C.replan(st, true);
  return u;
}
function place(st, id, x, y, guard = true) {
  const u = C.unit(st, id);
  u.down = false; u.x = x; u.y = y; u.state = guard ? 'guard' : 'moving'; u.home = { x, y }; u.path = [];
  return u;
}
const N = (id) => G.idx[id];

// ── 6-1 표: 도착 시간 ───────────────────────────────────────
test('6-1 표: 인물·관군 → 북문/남문 지킴 자리 도착 시간이 설계값 ±0.5초', () => {
  for (const [id, want] of Object.entries(S.DESIGN_TABLE.allies)) {
    for (const gate of ['N', 'S']) {
      const st = chase();
      if (id === 'yoon') C.switchControl(st, 'yeoul');
      st.runner.windup = 1e9; // 운반자는 멈춰 둔다
      C.command(st, id, gate === 'N' ? 'NG' : 'SG');
      const u = C.unit(st, id);
      const t = runUntil(st, () => u.state === 'guard', 60);
      assert.ok(t !== null, `${id} → ${gate} 도착 못 함`);
      assert.ok(Math.abs(t - want[gate]) <= TOL, `${id} → ${gate}: ${t.toFixed(2)}초 (설계 ${want[gate]})`);
    }
  }
});

test('6-1 표: 운반자는 처음에 N1(시장뒷골목)을 고르고, 방해가 없으면 약 29.2초에 북문 지킴 선에 닿는다', () => {
  const st = chase();
  assert.equal(st.runner.routeName, 'N1');
  isolate(st, 'yoon', 15, 1400);
  assert.equal(st.runner.routeName, 'N1');
  const t = runUntil(st, (s) => s.runner.y <= S.DESIGN_TABLE.guardLine.N, 60);
  assert.ok(Math.abs(t - S.DESIGN_TABLE.runner.N1) <= TOL, `N1 도착 ${t.toFixed(2)}초 (설계 29.2)`);
  runUntil(st, () => false, 5);
  assert.equal(st.over.result, 'escape');
  assert.equal(st.over.gate, 'N');
});

test('6-1 표: 출발 직후 아군 한 명이 N1 근처에 있으면(+5.5초) 운반자는 S1(창고골목)으로 돌고, 약 29.9초에 남문', () => {
  const st = chase();
  place(st, 'yeoul', 345, 300);
  C.replan(st, true);
  assert.equal(st.runner.routeName, 'S1');
  const t = runUntil(st, (s) => s.runner.y >= S.DESIGN_TABLE.guardLine.S, 60);
  assert.ok(Math.abs(t - S.DESIGN_TABLE.runner.S1) <= TOL, `S1 도착 ${t.toFixed(2)}초 (설계 29.9)`);
});

test('6-1 표 [2차 수정]: 시작 비용 N1 31.4 · S1 32.1 · N2 42.4(관군 벌점 11) · S2 시작 순간 막힘(∞)', () => {
  const st = chase();
  const obs = C.obstacles(st);
  const ctx = { obs, blocked: C.blockedEdges(st, obs) };
  const route = (ids) => ids.map(N);
  const p = { x: st.runner.x, y: st.runner.y };
  const cost = {
    N1: C.routeCost(st, p, route(['MK', 'MN', 'EA', 'E1', 'NYE', 'NGm', 'NG', 'NX']), ctx),
    S1: C.routeCost(st, p, route(['MK', 'MS', 'ED2', 'EC', 'E5', 'SYE', 'SGm', 'SG', 'SX']), ctx),
    N2: C.routeCost(st, p, route(['MK', 'MW', 'PL', 'RA', 'NY', 'NGm', 'NG', 'NX']), ctx),
    S2: C.routeCost(st, p, route(['MK', 'MW', 'PL', 'RC', 'RCC', 'SY', 'SGm', 'SG', 'SX']), ctx),
  };
  for (const k of ['N1', 'S1', 'N2']) assert.ok(Math.abs(cost[k] - S.DESIGN_TABLE.startCost[k]) <= TOL, `${k} ${cost[k].toFixed(2)} (설계 ${S.DESIGN_TABLE.startCost[k]})`);
  assert.equal(cost.S2, Infinity, '파티 4명이 큰길을 가로질러 서 있어 S2 는 막힘');
  // 관군을 빼면 N2 벌점 11초가 사라진다
  for (const id of ['sol1', 'sol2']) C.unit(st, id).down = true;
  const obs2 = C.obstacles(st);
  const n2free = C.routeCost(st, p, route(['MK', 'MW', 'PL', 'RA', 'NY', 'NGm', 'NG', 'NX']), { obs: obs2, blocked: C.blockedEdges(st, obs2) });
  assert.ok(Math.abs((cost.N2 - n2free) - 11) < 1e-6);
});

// ── 폭 규칙 (6장 · 8-2 규칙 6) ──────────────────────────────
function edgeBlockedWith(edgeA, edgeB, bodies, barriers) {
  const st = chase();
  for (const u of st.units) u.down = true;
  bodies.forEach(([x, y, guard], k) => {
    const id = st.units[k].id;
    place(st, id, x, y, guard);
  });
  st.barriers = barriers || [];
  const obs = C.obstacles(st);
  const set = C.blockedEdges(st, obs);
  const e = G.edges.find((ed) => (ed.a === N(edgeA) && ed.b === N(edgeB)) || (ed.b === N(edgeA) && ed.a === N(edgeB)));
  return set.has(e.i);
}
test('폭 규칙: 골목 30u 는 누구든 한 명이면 막힌다 (지킴이 아니어도)', () => {
  assert.equal(edgeBlockedWith('E1', 'EA', [[345, 400, false]]), true);
  assert.equal(edgeBlockedWith('E1', 'EA', []), false);
});
test('폭 규칙: 성문 72u 는 지킴 1명이면 뚫리고 2명이면 막힌다', () => {
  assert.equal(edgeBlockedWith('NGm', 'NG', [[162, 30, true]]), false);
  assert.equal(edgeBlockedWith('NGm', 'NG', [[162, 30, true], [198, 30, true]]), true);
});
test('폭 규칙: 성문은 지킴 1명 + 결계(45u)로도 닫힌다', () => {
  const bar = [{ x1: 162, y1: 30, x2: 207, y2: 30, t: 12 }];
  assert.equal(edgeBlockedWith('NGm', 'NG', [[162, 30, true]], bar), true);
});
test('폭 규칙: 큰길 120u 는 지킴 2명으로 못 막고 3명이면 막힌다', () => {
  const slots = S.COMMAND_NODES.find((n) => n.id === 'RA').slots;
  assert.equal(edgeBlockedWith('RA', 'PL', slots.slice(0, 2).map(([x, y]) => [x, y, true])), false);
  assert.equal(edgeBlockedWith('RA', 'PL', slots.map(([x, y]) => [x, y, true])), true);
});
test('폭 규칙: 결계 하나로 골목 하나가 닫힌다', () => {
  const bar = [{ x1: 330, y1: 400, x2: 362, y2: 400, t: 12 }];
  assert.equal(edgeBlockedWith('E1', 'EA', [], bar), true);
});
test('한 몸으로 두 성문을 동시에 끊는 지점은 없다: 명령 매듭 어디에 한 명을 세워도 성문 길이 남는다', () => {
  for (const def of S.COMMAND_NODES) {
    const st = chase();
    isolate(st, 'yoon', def.slots[0][0], def.slots[0][1]);
    C.unit(st, 'yoon').state = 'guard';
    const obs = C.obstacles(st);
    const best = C.bestGateRoute(st, st.runner, { obs, blocked: C.blockedEdges(st, obs) });
    assert.ok(best && Number.isFinite(best.cost), `${def.label} 한 명으로 모든 성문 길이 막힘`);
  }
});

// ── 운반자 AI (8-2) ───────────────────────────────────────
test('규칙 2: 새 길이 3초 이상 낫지 않으면 바꾸지 않는다 (S1 을 가는 중엔 0.7초 나은 N1 로 안 바꾼다)', () => {
  const st = chase();
  isolate(st, 'yoon', 15, 1400);
  st.runner.route = ['MK', 'MS', 'ED2', 'EC', 'E5', 'SYE', 'SGm', 'SG', 'SX'].map(N);
  st.runner.routeName = 'S1';
  C.replan(st, false);
  assert.equal(st.runner.pending, null);
  runUntil(st, () => false, 5);
  assert.equal(st.runner.routeName, 'S1');
});
test('규칙 3: 길을 바꾸기 0.8초 전에 예고("!")하고, 그 뒤에 바꾼다', () => {
  const st = chase();
  isolate(st, 'yoon', 15, 1400);
  st.runner.windup = 0;
  C.step(st, DT, {});
  // N1 한가운데에 한 명을 세워 길을 막는다
  place(st, 'yeoul', 345, 600);
  st.runner.recalcT = 0;
  let warnAt = null, switchAt = null;
  runUntil(st, (s) => {
    for (const ev of s.events) {
      if (ev.type === 'routeWarn' && warnAt === null) warnAt = s.t;
      if (ev.type === 'routeSwitch' && switchAt === null) switchAt = s.t;
    }
    s.events.length = 0;
    return switchAt !== null;
  }, 5);
  assert.ok(warnAt !== null && switchAt !== null);
  assert.ok(Math.abs(switchAt - warnAt - C.K.WARN) < 0.05, `예고 ${warnAt} → 전환 ${switchAt}`);
  assert.notEqual(st.runner.routeName, 'N1');
});
test('규칙 5: 아군이 72u 안에 오면 숨 −25, 숨 0 이면 3초 동안 22u/초로 걷는다', () => {
  const st = chase();
  isolate(st, 'yoon', 15, 1400);
  st.runner.windup = 0;
  const u = C.unit(st, 'yeoul'); u.down = false; u.state = 'guard';
  for (let k = 0; k < 4; k++) {
    u.x = 15; u.y = 1400; C.step(st, DT, {});
    u.x = st.runner.x - 60; u.y = st.runner.y; st.runner.nearCd = {};
    C.step(st, DT, {});
    assert.equal(st.runner.breath, Math.max(0, 100 - 25 * (k + 1)));
  }
  u.x = 15; u.y = 1400;
  assert.ok(st.runner.walkT > 2.9);
  const x0 = st.runner.x, y0 = st.runner.y;
  runUntil(st, () => false, 1);
  const moved = Math.hypot(st.runner.x - x0, st.runner.y - y0);
  const inMarket = C.inMarket(st.w, st.runner.x, st.runner.y);
  const want = C.K.WALK * (inMarket ? C.K.MARKET_SLOW : 1);
  assert.ok(moved <= want + 1.5, `걷는 동안 1초에 ${moved.toFixed(1)}u (≤ ${want})`);
  runUntil(st, () => st.runner.walkT <= 0, 3);
  assert.equal(st.runner.breath, 100);
});
test('규칙 6: 큰길 한 명은 옆으로 지나친다 (길이 막히지 않는다)', () => {
  const st = chase();
  isolate(st, 'yoon', 15, 1400);
  place(st, 'yeoul', 180, 700);
  const obs = C.obstacles(st);
  const set = C.blockedEdges(st, obs);
  const e = G.edges.find((ed) => (ed.a === N('RA') && ed.b === N('PL')) || (ed.b === N('RA') && ed.a === N('PL')));
  assert.equal(set.has(e.i), false);
});
test('규칙 7: 어느 성문으로도 길이 없으면 궁지 — 막다른 갈래로 가거나 그 자리에 웅크린다', () => {
  const st = chase();
  isolate(st, 'yoon', 15, 1400);
  C.unit(st, 'yoon').state = 'guard';
  // 시장 출구 세 곳(뒷골목·창고골목·시장 어귀)을 막는다
  place(st, 'yeoul', 345, 600);
  place(st, 'hangyeol', 345, 1300);
  place(st, 'soun', 250, 930);
  st.runner.recalcT = 0;
  runUntil(st, (s) => s.runner.cornered, 3);
  assert.equal(st.runner.cornered, true);
  assert.equal(st.runner.routeName, 'dead');
});

// ── 제압 (8-3): 혼자 뒤쫓기·견제사격만으로는 게이지가 줄지 않는다 ─────
function chaseInput(st) {
  const me = C.unit(st, st.control), r = st.runner;
  const path = C.planPath(st, me, r);
  const q = path[0];
  const d = Math.hypot(q.x - me.x, q.y - me.y);
  const k = Math.round(st.t / DT);
  return { mx: d > 1 ? (q.x - me.x) / d : 0, my: d > 1 ? (q.y - me.y) / d : 0, action: k % 10 === 0 };
}
test('혼자 뒤쫓기만: 여울(가장 빠름)이 쫓으며 붙잡기를 연타해도 제압 게이지는 28 그대로', () => {
  const st = chase();
  isolate(st, 'yeoul', 60, 1120);
  let maxGrabs = 0;
  runUntil(st, (s) => { maxGrabs = s.log.grabs.length; return false; }, 60, chaseInput);
  assert.ok(st.log.grabs.some((g) => g.type === 'solo'), '혼자 붙잡기가 한 번도 안 일어남 (시험이 뒤쫓지 못함)');
  assert.equal(st.log.grabs.filter((g) => g.type === 'restraint').length, 0);
  assert.equal(st.runner.gauge, C.K.GAUGE);
});
test('견제사격만: 한결이 재사용 때마다 쏴도 게이지는 28 그대로 (느려짐만)', () => {
  const st = chase();
  isolate(st, 'hangyeol', 180, 1000);
  let hits = 0;
  runUntil(st, (s) => {
    const me = C.unit(s, 'hangyeol'), r = s.runner;
    if (me.skillCd <= 0) { const ev = C.shoot(s, r.x - me.x, r.y - me.y); if (ev && ev.hit) hits++; }
    return false;
  }, 40, (s) => {
    // 사선을 잡으려고 운반자 쪽으로 따라가되 붙잡지는 않는다
    const me = C.unit(s, 'hangyeol'), r = s.runner;
    const path = C.planPath(s, me, r); const q = path[0]; const d = Math.hypot(q.x - me.x, q.y - me.y);
    return Math.hypot(r.x - me.x, r.y - me.y) < 90 || d < 1 ? {} : { mx: (q.x - me.x) / d, my: (q.y - me.y) / d };
  });
  assert.ok(hits >= 1, '한 번도 맞히지 못함');
  assert.equal(st.runner.gauge, C.K.GAUGE);
});
// 탁 트인 큰길 한가운데로 운반자를 옮긴다 (밀림이 좌판·벽에 걸리지 않게)
function openRoad(st) {
  st.runner.x = 180; st.runner.y = 700; st.runner.windup = 0;
  C.replan(st, true);
}
test('혼자 붙잡기: 0.4초 멈춤 → 뿌리침 (붙잡은 쪽 24u 밀림·0.6초 굳음, 숨 −25), 게이지 변화 없음', () => {
  const st = chase();
  const me = isolate(st, 'yoon', 15, 1400);
  openRoad(st);
  me.x = st.runner.x; me.y = st.runner.y - 30;
  C.step(st, DT, { action: true });
  assert.equal(st.runner.held, true);
  const before = { x: me.x, y: me.y };
  let shook = null;
  runUntil(st, (s) => { if (s.events.some((e) => e.type === 'shake')) shook = s.t; s.events.length = 0; return shook !== null; }, 1);
  assert.ok(shook !== null && Math.abs(shook - C.K.SOLO_HOLD) < 0.05);
  assert.ok(Math.hypot(me.x - before.x, me.y - before.y) > 20);
  assert.ok(me.stunT > 0.5);
  // 72u 안으로 들어올 때 −25 (규칙 5) + 뿌리칠 때 −25
  assert.equal(st.runner.breath, 50);
  assert.equal(st.runner.gauge, C.K.GAUGE);
});
test('구속: 팔 길이 안에 두 명이면 초당 −6 (연타하면 −9)', () => {
  const st = chase();
  isolate(st, 'yoon', 15, 1400);
  st.runner.windup = 0;
  const r = st.runner;
  place(st, 'yeoul', r.x - 28, r.y);
  place(st, 'soun', r.x + 28, r.y);
  runUntil(st, () => false, 1);
  assert.equal(r.restrained, true);
  assert.ok(Math.abs(r.gauge - (28 - 6)) < 0.2, `1초 뒤 게이지 ${r.gauge}`);
  // 조종 인물이 붙잡고 연타하면 −9
  const me = C.unit(st, 'yoon'); me.x = r.x; me.y = r.y - 28;
  const g0 = r.gauge;
  runUntil(st, () => false, 0.5, (s) => ({ action: Math.round(s.t / DT) % 6 === 0 }));
  assert.ok(Math.abs((g0 - r.gauge) - 4.5) < 0.3, `연타 0.5초 −${(g0 - r.gauge).toFixed(2)}`);
});
test('궁지에서는 한 명만 붙어도 구속된다', () => {
  const st = chase();
  isolate(st, 'yoon', 15, 1400);
  C.unit(st, 'yoon').state = 'guard';
  place(st, 'yeoul', 345, 600); place(st, 'hangyeol', 345, 1300); place(st, 'soun', 250, 930);
  st.runner.windup = 0; st.runner.recalcT = 0;
  runUntil(st, (s) => s.runner.cornered, 3);
  const r = st.runner;
  const me = C.unit(st, 'yoon'); me.x = r.x - 28; me.y = r.y; me.state = 'guard';
  const g0 = r.gauge;
  runUntil(st, () => false, 1);
  assert.ok(g0 - r.gauge > 5, `궁지 1명 1초 −${(g0 - r.gauge).toFixed(2)}`);
});

// ── 전환점 ③ · 귀화 (8-5) ─────────────────────────────────
test('게이지 14 이하에서 봉인 문서 — 강제 뿌리침 + 귀화 2마리 (문서 자리, 가장 가까운 서 있는 아군 옆)', () => {
  const st = chase();
  isolate(st, 'yoon', 15, 1400);
  st.runner.windup = 0;
  const r = st.runner;
  place(st, 'yeoul', r.x - 28, r.y); place(st, 'soun', r.x + 28, r.y);
  place(st, 'sol1', 180, 960);
  let sealAt = null;
  runUntil(st, (s) => { if (s.events.some((e) => e.type === 'seal')) sealAt = s.t; s.events.length = 0; return sealAt !== null; }, 5);
  assert.ok(sealAt !== null);
  assert.ok(r.gauge <= 14 && r.gauge > 13);
  assert.equal(st.gwihwa.length, 2);
  assert.equal(r.restrained, false);
  assert.ok(C.unit(st, 'yeoul').stunT > 0 && C.unit(st, 'soun').stunT > 0);
});
test('봉인 문서 보조: 추격 2분 30초가 지나도 안 나왔으면 그때 발생', () => {
  const st = chase();
  isolate(st, 'yoon', 15, 1400);
  st.runner.windup = 1e9;
  runUntil(st, () => st.sealDone, 151);
  assert.ok(st.sealDone && Math.abs(st.log.sealAt - 150) < 0.1);
});
test('귀화: 2초마다 피해 4 + 48u 밀어냄 + 1초 굳음. 관군은 반격 못 해 약 10초에 퇴장, 인물은 자동 반격으로 퇴송', () => {
  const st = chase();
  isolate(st, 'yoon', 15, 1400);
  st.runner.windup = 1e9;
  const sol = place(st, 'sol1', 180, 700);
  st.gwihwa.push({ id: 'gwA', x: 180, y: 676, hp: C.K.GW_HP, target: 'sol1', atkT: 0, facing: 0 });
  runUntil(st, () => sol.down, 12);
  assert.equal(sol.down, true);
  assert.ok(st.t >= 8 && st.t <= 11, `관군 퇴장 ${st.t.toFixed(1)}초`);
  const st2 = chase();
  isolate(st2, 'yoon', 15, 1400);
  st2.runner.windup = 1e9;
  const han = place(st2, 'hangyeol', 180, 700);
  st2.gwihwa.push({ id: 'gwB', x: 180, y: 676, hp: C.K.GW_HP, target: 'hangyeol', atkT: 0, facing: 0 });
  const t = runUntil(st2, (s) => s.gwihwa.length === 0, 15);
  assert.ok(t !== null && t <= 9, `인물 자동 반격 퇴송 ${t}`);
  assert.equal(han.down, false);
});

// ── 패배 3종 (9장) ─────────────────────────────────────────
test('패배: 탈출 · 시간 초과 · 전원 퇴장', () => {
  const a = chase(); isolate(a, 'yoon', 15, 1400);
  runUntil(a, () => false, 40);
  assert.equal(a.over.result, 'escape');

  const b = chase(); isolate(b, 'yoon', 15, 1400);
  C.unit(b, 'yoon').state = 'guard';
  b.sealDone = true; // 2분 30초 봉인 문서 보조(귀화가 길목을 흔듦)는 따로 시험한다
  place(b, 'yeoul', 345, 600); place(b, 'hangyeol', 345, 1300); place(b, 'soun', 250, 930);
  runUntil(b, () => false, 185);
  assert.equal(b.over.result, 'timeout');

  const c = chase();
  for (const u of c.units) if (u.kind === 'hero') C.damage(c, u, 99);
  C.step(c, DT, {});
  assert.equal(c.over.result, 'wipe');
});

test('제압하면 승리 (귀화가 남아 있어도)', () => {
  const st = chase();
  isolate(st, 'yoon', 15, 1400);
  st.runner.windup = 0;
  const r = st.runner;
  place(st, 'yeoul', r.x - 28, r.y); place(st, 'soun', r.x + 28, r.y);
  st.sealDone = true; // 봉인 문서 연출은 따로 시험
  runUntil(st, () => false, 6);
  assert.equal(st.over.result, 'win');
  assert.equal(r.subdued, true);
});

// ── 규칙 파일 위생 ─────────────────────────────────────────
test('core.js 는 화면과 Math.random 을 직접 쓰지 않는다', () => {
  const code = readFileSync(new URL('./core.js', import.meta.url), 'utf8');
  for (const word of ['document', 'window', 'Math.random']) assert.equal(code.includes(word), false, word);
});
test('2d/index.html 은 외부 주소를 불러오지 않는다', () => {
  const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
  const bad = html.match(/\b(?:src|href)\s*=\s*["']?\s*(?:https?:)?\/\//gi) || [];
  assert.deepEqual(bad, []);
});
test('대사는 specs/chapter5.md 글자 그대로', () => {
  const spec = readFileSync(new URL('../specs/chapter5.md', import.meta.url), 'utf8');
  for (const [key, lines] of Object.entries(S.LINES)) {
    for (const [who, text] of lines) {
      if (who === 'pause') { assert.ok(spec.includes('(잠깐)')); continue; }
      assert.ok(spec.includes(`"${text}"`), `${key}: "${text}" 가 원본에 없다`);
    }
  }
  assert.ok(spec.includes(S.TEXT.chapter6));
});

// ── 구현 검수 E-1: 추격 시작 자리에서 대각선 입력이 모서리에 걸리지 않는다 ─────
test('E-1: 추격 시작 네 자리에서 북동·북북동 2초 → 60u 이상, 옛 갈래 ① 마당 모서리에서도 북동·동·북북동 60u 이상', () => {
  const W = C.makeWorld(S.WALK, S.BLOCKS, S.MARKET);
  const push = (x, y, deg) => {
    let p = { x, y };
    const a = deg * Math.PI / 180;
    for (let i = 0; i < 2 / DT; i++) p = C.moveCircle(W, p, Math.cos(a) * 44 * DT, Math.sin(a) * 44 * DT, C.K.R_BODY);
    return Math.hypot(p.x - x, p.y - y);
  };
  for (const id of ['yeoul', 'yoon', 'hangyeol', 'soun']) {
    const [x, y] = S.CHASE_START[id];
    for (const deg of [-45, -70]) assert.ok(push(x, y, deg) >= 60, `${id} (${x},${y}) ${deg}°: ${push(x, y, deg).toFixed(0)}u`);
  }
  // 동쪽은 큰길 바로 옆이 시장 담(평평한 벽)이라 벽에 닿으면 멈추는 게 맞다 — 대신 1차 검수에서 걸렸던 마당 자리로 확인
  for (const [x, y] of [[80, 1096], [100, 1072]]) {
    for (const deg of [-45, 0, -70]) assert.ok(push(x, y, deg) >= 60, `(${x},${y}) ${deg}°: ${push(x, y, deg).toFixed(0)}u`);
  }
});

// ── 구현 검수 E-2: 결계는 귀화도 막는다 (8-4) ─────────────────────
test('E-2: 결계 선을 사이에 두면 12초 동안 귀화가 선을 넘지 못한다', () => {
  const st = chase();
  isolate(st, 'yoon', 15, 1400);
  st.runner.windup = 1e9;
  const tgt = place(st, 'yeoul', 180, 640);
  st.barriers.push({ x1: 120, y1: 600, x2: 240, y2: 600, t: C.K.BARRIER_T }); // 큰길을 가로지르는 선 (시험용 길이)
  const gw = { id: 'gwT', x: 180, y: 560, hp: C.K.GW_HP, target: 'yeoul', atkT: 0, facing: 0, riseT: 0 };
  st.gwihwa.push(gw);
  let maxY = gw.y;
  runUntil(st, () => { maxY = Math.max(maxY, gw.y); return false; }, 11.9);
  assert.ok(maxY < 600 - C.K.R_BODY + 0.5, `귀화가 선을 넘음 (y ${maxY.toFixed(1)})`);
  assert.equal(tgt.hp, 34, '선 너머에서 공격하지 못함');
  // 결계가 사라지면 다시 다가간다
  runUntil(st, () => false, 3);
  assert.ok(gw.y > 600, '결계가 사라진 뒤에는 지나간다');
});

// ── 구현 검수 E-3 / [2차 수정] 규칙 7: 지나친 몸은 막힘에서 뺀다 ─────────
test('E-3: 성문 지킴 두 명을 이미 지나친 운반자는 궁지가 아니라 성문으로 나간다', () => {
  for (const ry of [30, 20, 14, 5]) {
    const st = chase();
    for (const u of st.units) u.down = true;
    place(st, 'yeoul', 162, 30); place(st, 'hangyeol', 198, 30);
    st.runner.x = 169; st.runner.y = ry; st.runner.windup = 0; st.runner.lastDir = { x: 0, y: -1 };
    const obs = C.obstacles(st);
    const best = C.bestGateRoute(st, st.runner, { obs, blocked: C.blockedEdges(st, obs) });
    assert.ok(best && best.exit === 'N', `y=${ry}: ${best ? best.name : '궁지'}`);
  }
  // 아직 지나치지 않았으면 (성문 앞 y=60) 북문은 막혀 있다
  const st = chase();
  for (const u of st.units) u.down = true;
  place(st, 'yeoul', 162, 30); place(st, 'hangyeol', 198, 30);
  st.runner.x = 169; st.runner.y = 60; st.runner.windup = 0;
  const obs = C.obstacles(st);
  const best = C.bestGateRoute(st, st.runner, { obs, blocked: C.blockedEdges(st, obs) });
  assert.ok(!best || best.exit === 'S');
});

// ── [2차 수정] 8-5 성문 구역 · 귀화 피어오름 ─────────────────────
test('[2차 수정] 8-5: 성문 선 200u 안에서 게이지 14 → 문서·귀화는 나오지만 뿌리치지 못하고 구속이 이어진다', () => {
  const st = chase();
  isolate(st, 'yoon', 15, 1400);
  const r = st.runner;
  r.x = 180; r.y = 150; r.windup = 0; C.replan(st, true);
  place(st, 'yeoul', r.x - 28, r.y); place(st, 'soun', r.x + 28, r.y);
  runUntil(st, () => st.sealDone, 5);
  assert.equal(st.gwihwa.length, 2);
  assert.equal(r.restrained, true);
  runUntil(st, () => false, 3);
  assert.equal(st.over && st.over.result, 'win');
});
test('[2차 수정] 8-5: 성문에서 먼 곳이면 여전히 강제 뿌리침', () => {
  const st = chase();
  isolate(st, 'yoon', 15, 1400);
  const r = st.runner;
  r.x = 180; r.y = 700; r.windup = 0; C.replan(st, true);
  place(st, 'yeoul', r.x - 28, r.y); place(st, 'soun', r.x + 28, r.y);
  runUntil(st, () => st.sealDone, 5);
  assert.equal(r.restrained, false);
  assert.ok(C.unit(st, 'yeoul').stunT > 0);
});
test('[2차 수정] 8-5: 귀화는 나타난 뒤 2.5초 동안 움직이지도 치지도 않는다', () => {
  const st = chase();
  isolate(st, 'yoon', 15, 1400);
  const r = st.runner;
  r.x = 180; r.y = 700; r.windup = 0; C.replan(st, true);
  place(st, 'yeoul', r.x - 28, r.y); place(st, 'soun', r.x + 28, r.y);
  runUntil(st, () => st.sealDone, 5);
  const snap = st.gwihwa.map((g) => [g.x, g.y]);
  const hp = st.units.map((u) => u.hp);
  runUntil(st, () => false, 2.4);
  st.gwihwa.forEach((g, i) => assert.deepEqual([g.x, g.y], snap[i]));
  assert.deepEqual(st.units.map((u) => u.hp), hp);
});

// ── [2차 수정] 6-2 시뮬레이션 (브리프 부록 D 와 같은 봇) ──────────────────
// 조종 인물(윤무겸)은 궁지·봉인 문서 전까지 서 있다가, 그 뒤 운반자에게 달려가 0.2초마다 붙잡는다.
function scenario(commands, control) {
  const st = chase();
  const cmds = commands.map((c) => ({ ...c }));
  for (let i = 0; i < 185 / DT && !st.over; i++) {
    for (const c of cmds) if (!c.done && st.t >= c.t) { c.done = true; C.command(st, c.unit, c.node); }
    const me = C.unit(st, st.control), r = st.runner;
    const input = { mx: 0, my: 0, action: false };
    const go = control === 'chase' || (control === 'wait' && (r.cornered || st.sealDone));
    if (go) {
      const gw = st.gwihwa.find((g) => Math.hypot(g.x - me.x, g.y - me.y) < 70);
      const tgt = gw || r;
      const path = C.planPath(st, me, tgt);
      while (path.length > 1 && Math.hypot(path[0].x - me.x, path[0].y - me.y) < 6) path.shift();
      const q = path[0], d = Math.hypot(q.x - me.x, q.y - me.y);
      if (d > 1 && Math.hypot(tgt.x - me.x, tgt.y - me.y) > 26) { input.mx = (q.x - me.x) / d; input.my = (q.y - me.y) / d; }
      input.action = Math.round(st.t / DT) % 12 === 0;
    }
    C.step(st, DT, input);
    st.events.length = 0;
  }
  return st;
}
const southPair = (t) => [{ t, unit: 'sol1', node: 'NG' }, { t, unit: 'sol2', node: 'NG' }, { t: t + 0.4, unit: 'yeoul', node: 'SG' }, { t: t + 0.4, unit: 'hangyeol', node: 'SG' }];
const northPair = (t) => [{ t, unit: 'yeoul', node: 'NG' }, { t, unit: 'hangyeol', node: 'NG' }, { t: t + 0.4, unit: 'sol1', node: 'SG' }, { t: t + 0.4, unit: 'sol2', node: 'SG' }];
test('6-2: 관군2→북문 + 여울·한결→남문 — 첫 명령 3초 안이면 제압, 6초 뒤면 탈출', () => {
  for (const t of [0.3, 3]) assert.equal(scenario(southPair(t), 'wait').over.result, 'win', `t=${t}`);
  assert.equal(scenario(southPair(6), 'wait').over.result, 'escape');
});
test('6-2: 여울·한결→북문 + 관군2→남문 — 첫 명령 3초 안이면 제압, 6초 뒤면 탈출', () => {
  for (const t of [0.3, 3]) assert.equal(scenario(northPair(t), 'wait').over.result, 'win', `t=${t}`);
  assert.equal(scenario(northPair(6), 'wait').over.result, 'escape');
});
test('6-2: 아무것도 안 하기 · 혼자 뒤쫓기는 탈출로 진다', () => {
  assert.equal(scenario([], 'idle').over.result, 'escape');
  const solo = scenario([], 'chase');
  assert.equal(solo.over.result, 'escape');
  assert.equal(solo.log.grabs.filter((g) => g.type === 'restraint').length, 0);
});
test('6-2: 골목 끊기 — 여울을 시장뒷골목에 세우면 운반자가 N1 에서 다른 길로 바꾼다', () => {
  const st = scenario([{ t: 0.3, unit: 'yeoul', node: 'E1' }], 'idle');
  const change = st.log.routeChanges.find((c) => c.from === 'N1');
  assert.ok(change, JSON.stringify(st.log.routeChanges));
  assert.ok(change.t > 15 && change.t < 19, `길 바뀜 ${change.t}초 (설계 약 17초)`);
});

// ── 구현 검수 N-1: 막힌 성문 앞에서 1초마다 길을 뒤집지 않는다 (규칙 2·3 이 읽히게) ─────
const switches = (st) => st.log.routeChanges.length - 1; // 첫 줄은 처음 고른 길
const seq = (list) => (t) => list.map(([u, n], k) => ({ t: t + 0.4 * k, unit: u, node: n }));
test('N-1: 두 성문 배치(차례로 0.4초 간격) — 모든 첫 명령 시각에서 한 추격당 길 전환 ≤ 3회, 승패 그대로', () => {
  const A = seq([['sol1', 'NG'], ['sol2', 'NG'], ['yeoul', 'SG'], ['hangyeol', 'SG']]);
  const B = seq([['yeoul', 'NG'], ['hangyeol', 'NG'], ['sol1', 'SG'], ['sol2', 'SG']]);
  for (const [name, mk] of [['A', A], ['B', B]]) {
    for (const t of [0.3, 1, 2, 3, 4, 5, 6, 8]) {
      const st = scenario(mk(t), 'wait');
      assert.ok(switches(st) <= 3, `${name} t=${t}: 전환 ${switches(st)}회`);
      assert.equal(st.over.result, t <= 5 ? 'win' : 'escape', `${name} t=${t}`);
    }
  }
  for (const t of [1, 3]) {
    const st = scenario(B(t), 'chase');
    assert.ok(switches(st) <= 3, `B+뒤쫓기 t=${t}: 전환 ${switches(st)}회`);
  }
});
test('N-1: 여울·한결→북문 + 관군→남문을 한꺼번에, 윤무겸 처음부터 뒤쫓기 — 전환 ≤ 3회', () => {
  for (const t of [1, 2, 3, 4]) {
    const st = scenario([{ t, unit: 'yeoul', node: 'NG' }, { t, unit: 'hangyeol', node: 'NG' }, { t, unit: 'sol1', node: 'SG' }, { t, unit: 'sol2', node: 'SG' }], 'chase');
    assert.ok(switches(st) <= 3, `t=${t}: 전환 ${switches(st)}회`);
    assert.equal(st.over.result, 'win');
  }
});
