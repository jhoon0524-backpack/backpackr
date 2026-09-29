// 「조선 퇴마전」 2D 파일럿 — 규칙만 (이동·충돌·운반자 AI·구속/제압·귀화·패배).
// 화면(DOM)과 난수를 쓰지 않는다 → Node 에서 그대로 시험할 수 있다.
// 수치 출처: DESIGN-BRIEF 6-1 · 8장 · 9장. 바꾸면 안 되는 설계값은 K 에 모았다.
(function (root) {
  'use strict';

  const K = {
    R_BODY: 12,        // 충돌 지름 24u
    R_GUARD: 18,       // 지킴 폭 36u
    R_RUNNER: 14,      // 통과 최소 틈 28u (운반자 ↔ 몸)
    ARM: 36,           // 팔 길이 (중심 거리)
    NEAR: 72,          // 아군 근처 벌점 반경
    PENALTY: 5.5,      // 아군 1명당 벌점 (초)
    SWITCH_GAIN: 3,    // 새 길이 3초 이상 나을 때만 바꾼다
    WARN: 0.8,         // 바꾸기 0.8초 전 "!" 예고
    RECALC: 1,         // 1초마다 다시 계산
    WINDUP: 1.5,       // 조작이 넘어온 뒤 장부를 추스르는 1.5초
    RUN: 44, WALK: 22,
    BREATH: 100, BREATH_HIT: 25, BREATH_WALK_T: 3, BREATH_CD: 1.5,
    GAUGE: 28, GAUGE_RATE: 6, GAUGE_RATE_MASH: 9, SEAL_AT: 14, SEAL_FALLBACK_T: 150,
    TIME_LIMIT: 180,
    SOLO_HOLD: 0.4, SHAKE_PUSH: 24, SHAKE_STUN: 0.6, GRAB_CD: 1.0, RUNNER_IMMUNE: 0.6,
    MASH_WINDOW: 0.35,
    SHOT_RANGE: 200, SHOT_SLOW: 0.4, SHOT_T: 4, SHOT_CD: 10, SHOT_HIT_R: 16,
    BARRIER_MAX: 45, BARRIER_MIN: 16, BARRIER_T: 12, BARRIER_CD: 15,
    GW_HP: 12, GW_SPEED: 32, GW_ATTACK_T: 2, GW_DMG: 4, GW_PUSH: 48, GW_STUN: 1, GW_LEASH: 220,
    HIT_DMG: 4, HIT_INTERVAL: 0.4, COUNTER_T: 1.2,
    MARKET_SLOW: 0.7,
    // [2차 수정] 8-5 성문 구역 예외: 게이지 14 에 닿은 곳이 성문 선 200u 안이면 뿌리치지 못한다
    GATE_ZONE: 200,
    // [2차 수정] 8-5 귀화 피어오름: 나타난 뒤 2.5초 동안 움직이지도 치지도 않는다
    GW_RISE: 2.5,
    // [2차 수정] 8-2 규칙 7: 이미 지나친 몸(진행 방향 뒤쪽·이 거리 안)은 막힘 계산에서 뺀다
    PASSED_R: 60,
  };

  // ── 기하 ───────────────────────────────────────────────
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const hyp = Math.hypot;

  function makeWorld(walk, blocks, market) {
    return { walk: walk || [], blocks: blocks || [], market: market || null };
  }

  function hitsBlock(w, x, y, r) {
    for (const b of w.blocks) {
      const dx = Math.max(b.x0 - x, 0, x - b.x1);
      const dy = Math.max(b.y0 - y, 0, y - b.y1);
      if (dx * dx + dy * dy < r * r || (r === 0 && dx === 0 && dy === 0)) return true;
    }
    return false;
  }

  // 반지름 r 인 원이 걸을 수 있는 땅 안에 온전히 들어가는가 (직사각형 하나에 들어가야 함)
  function valid(w, x, y, r) {
    if (hitsBlock(w, x, y, r)) return false;
    for (const R of w.walk) {
      if (x >= R.x0 + r && x <= R.x1 - r && y >= R.y0 + r && y <= R.y1 - r) return true;
    }
    return false;
  }

  function segValid(w, a, b, r, step) {
    const d = hyp(b.x - a.x, b.y - a.y);
    const n = Math.max(1, Math.ceil(d / (step || 3)));
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      if (!valid(w, a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, r)) return false;
    }
    return true;
  }

  function inMarket(w, x, y) {
    const m = w.market;
    return !!m && x >= m.x0 && x <= m.x1 && y >= m.y0 && y <= m.y1;
  }

  // 벽을 따라 미끄러지고, 골목 입구 가까이서는 입구 쪽으로 살짝 끌어당겨 들어가게 한다
  // (격자 모서리에 걸리지 않게 — 브리프 6장 "건물 모서리가 둥글어 미끄러지듯 돌아감")
  function moveCircle(w, p, dx, dy, r) {
    const len = hyp(dx, dy);
    if (len < 1e-9) return { x: p.x, y: p.y };
    const nx = p.x + dx, ny = p.y + dy;
    if (valid(w, nx, ny, r)) return { x: nx, y: ny };
    const ux = dx / len, uy = dy / len;
    let best = null, bestScore = 1e-6;
    const consider = (q, bonus) => {
      if (!q || !valid(w, q.x, q.y, r)) return;
      const moved = hyp(q.x - p.x, q.y - p.y);
      if (moved > len + 1e-6 || moved < 1e-9) return;
      const prog = (q.x - p.x) * ux + (q.y - p.y) * uy;
      const score = bonus ? bonus : prog;
      if (prog < -1e-6 && !bonus) return;
      if (score > bestScore) { best = q; bestScore = score; }
    };
    consider({ x: nx, y: p.y });
    consider({ x: p.x, y: ny });
    // 벽에 비스듬히 밀 때: 방향을 조금씩 틀어 가며 벽을 따라 미끄러진다 (모서리에 걸리지 않게)
    for (const a of [0.35, -0.35, 0.7, -0.7, 1.05, -1.05, 1.4, -1.4]) {
      const c = Math.cos(a), sn = Math.sin(a);
      consider({ x: p.x + (dx * c - dy * sn), y: p.y + (dx * sn + dy * c) });
    }
    for (const R of w.walk) {
      const ix0 = R.x0 + r, ix1 = R.x1 - r, iy0 = R.y0 + r, iy1 = R.y1 - r;
      if (ix0 > ix1 || iy0 > iy1) continue;
      if (p.x >= ix0 && p.x <= ix1 && p.y >= iy0 && p.y <= iy1) {
        // 지금 서 있는 길 안에서 벽을 따라 제 속도로 미끄러진다 (좁은 골목과 마당 사이를 오가며 튕기지 않게)
        let sx = clamp(nx, ix0, ix1) - p.x, sy = clamp(ny, iy0, iy1) - p.y;
        const sl = hyp(sx, sy);
        if (sl > 0.1 * len && sx * ux + sy * uy > 0.15 * sl) {
          sx = sx / sl * len; sy = sy / sl * len;
          consider({ x: clamp(p.x + sx, ix0, ix1), y: clamp(p.y + sy, iy0, iy1) }, 1.03 * len);
        }
        continue;
      }
      const cx = clamp(p.x, ix0, ix1), cy = clamp(p.y, iy0, iy1);
      const d = hyp(cx - p.x, cy - p.y);
      if (d < 1e-9 || d > len + 14) continue;
      // 이 사각형 안으로 들어가면 가려는 방향으로 20u 이상 더 갈 수 있을 때만 끌어당긴다
      const fx = clamp(cx + ux * 20, ix0, ix1), fy = clamp(cy + uy * 20, iy0, iy1);
      if (hyp(fx - cx, fy - cy) < 6 || (fx - cx) * ux + (fy - cy) * uy <= 0) continue;
      if (!segValid(w, p, { x: cx, y: cy }, r, 2)) continue;
      if (d <= len) {
        const rem = len - d;
        consider({ x: clamp(cx + ux * rem, ix0, ix1), y: clamp(cy + uy * rem, iy0, iy1) }, 1.02 * len + rem);
      } else {
        // 입구 쪽으로 옆걸음: 벽에 반쯤 미끄러지는 것보다 우선 (되돌아 튕기며 제자리걸음하지 않게)
        consider({ x: p.x + (cx - p.x) * (len / d), y: p.y + (cy - p.y) * (len / d) }, 1.01 * len);
      }
    }
    return best || { x: p.x, y: p.y };
  }

  function los(w, a, b) {
    return segValid(w, a, b, 0, 3);
  }

  // 한 점을 지나는 가로(axis='h') 또는 세로(axis='v') 단면에서 벽까지의 폭 [lo, hi]
  function section(w, x, y, axis) {
    const iv = [];
    for (const R of w.walk) {
      if (axis === 'h') { if (y >= R.y0 && y <= R.y1) iv.push([R.x0, R.x1]); }
      else if (x >= R.x0 && x <= R.x1) iv.push([R.y0, R.y1]);
    }
    iv.sort((a, b) => a[0] - b[0]);
    const merged = [];
    for (const [a, b] of iv) {
      const last = merged[merged.length - 1];
      if (last && a <= last[1]) last[1] = Math.max(last[1], b);
      else merged.push([a, b]);
    }
    const c = axis === 'h' ? x : y;
    const hit = merged.find(([a, b]) => a <= c && b >= c);
    if (!hit) return null;
    let lo = hit[0], hi = hit[1];
    for (const bl of w.blocks) {
      const inside = axis === 'h' ? (y >= bl.y0 && y <= bl.y1) : (x >= bl.x0 && x <= bl.x1);
      if (!inside) continue;
      const a = axis === 'h' ? bl.x0 : bl.y0, b = axis === 'h' ? bl.x1 : bl.y1;
      if (b <= c && b > lo) lo = b;
      if (a >= c && a < hi) hi = a;
    }
    return [lo, hi];
  }

  function distPointSeg(px, py, ax, ay, bx, by) {
    const vx = bx - ax, vy = by - ay;
    const l2 = vx * vx + vy * vy;
    let t = l2 > 0 ? ((px - ax) * vx + (py - ay) * vy) / l2 : 0;
    t = clamp(t, 0, 1);
    return hyp(px - (ax + vx * t), py - (ay + vy * t));
  }

  // ── 길 그래프 ────────────────────────────────────────────
  function buildGraph(stage) {
    const w = makeWorld(stage.WALK, stage.BLOCKS, stage.MARKET);
    const ids = Object.keys(stage.NODES);
    const idx = {};
    ids.forEach((id, i) => { idx[id] = i; });
    const pos = ids.map((id) => ({ x: stage.NODES[id][0], y: stage.NODES[id][1] }));
    const dead = new Set((stage.DEAD_ENDS || []).map((d) => d.node));
    const edges = stage.EDGES.map(([a, b], ei) => {
      const A = pos[idx[a]], B = pos[idx[b]];
      const len = hyp(B.x - A.x, B.y - A.y);
      return { i: ei, a: idx[a], b: idx[b], len, time: pathTime(w, A, B, K.RUN), samples: edgeSamples(w, A, B) };
    });
    const adj = ids.map(() => []);
    for (const e of edges) { adj[e.a].push(e); adj[e.b].push(e); }
    // 모든 쌍 최단 거리 (막힘 무시) — 휴리스틱·성문 거리 막대용
    const n = ids.length;
    const D = [], T = [];
    for (let i = 0; i < n; i++) { D.push(new Array(n).fill(Infinity)); T.push(new Array(n).fill(Infinity)); D[i][i] = 0; T[i][i] = 0; }
    for (const e of edges) {
      D[e.a][e.b] = D[e.b][e.a] = Math.min(D[e.a][e.b], e.len);
      T[e.a][e.b] = T[e.b][e.a] = Math.min(T[e.a][e.b], e.time);
    }
    for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      if (D[i][k] + D[k][j] < D[i][j]) D[i][j] = D[i][k] + D[k][j];
      if (T[i][k] + T[k][j] < T[i][j]) T[i][j] = T[i][k] + T[k][j];
    }
    const exitN = idx[stage.EXITS.N.node], exitS = idx[stage.EXITS.S.node];
    return { w, ids, idx, pos, edges, adj, D, T, dead, exitN, exitS };
  }

  // 시장 안은 −30% (브리프 6장). 조각마다 시간을 더한다.
  function pathTime(w, A, B, speed) {
    const len = hyp(B.x - A.x, B.y - A.y);
    const n = Math.max(1, Math.ceil(len / 2));
    let t = 0;
    for (let i = 0; i < n; i++) {
      const s = (i + 0.5) / n;
      const f = inMarket(w, A.x + (B.x - A.x) * s, A.y + (B.y - A.y) * s) ? K.MARKET_SLOW : 1;
      t += len / n / (speed * f);
    }
    return t;
  }

  // 간선 위 6u 마다 벽 사이 단면 폭을 미리 재 둔다 (막힘 판정에 사용)
  function edgeSamples(w, A, B) {
    const len = hyp(B.x - A.x, B.y - A.y);
    const vertical = Math.abs(B.y - A.y) >= Math.abs(B.x - A.x);
    const axis = vertical ? 'h' : 'v';
    const n = Math.max(1, Math.ceil(len / 6));
    const out = [];
    for (let i = 0; i <= n; i++) {
      const x = A.x + (B.x - A.x) * (i / n), y = A.y + (B.y - A.y) * (i / n);
      const sec = section(w, x, y, axis);
      if (sec) out.push({ x, y, axis, lo: sec[0], hi: sec[1] });
    }
    return out;
  }

  // 막힘 판정: 한 단면에서 운반자 중심이 설 수 있는 자리가 하나도 없으면 막힘.
  // 벽과는 12u, 몸과는 14u + 몸 반지름. → 골목 1명·성문 2명·큰길 3명·성문 1명+결계 = 막힘 (브리프 6장 폭 규칙)
  function samplesBlocked(samples, obstacles) {
    if (!obstacles.length) return false;
    for (const s of samples) {
      let lo = s.lo + K.R_BODY, hi = s.hi - K.R_BODY;
      if (lo > hi) continue; // 운반자가 들어갈 수 없는 단면(성문 밖 끝 등)은 벽 판정에 맡긴다
      const iv = [];
      for (const o of obstacles) {
        const along = s.axis === 'h' ? o.y - s.y : o.x - s.x;
        const reach = K.R_RUNNER + o.r;
        if (Math.abs(along) >= reach) continue;
        const half = Math.sqrt(reach * reach - along * along);
        const c = s.axis === 'h' ? o.x : o.y;
        iv.push([c - half, c + half]);
      }
      if (!iv.length) continue;
      iv.sort((a, b) => a[0] - b[0]);
      let cur = lo, free = false;
      for (const [a, b] of iv) {
        if (a > cur) { free = true; break; }
        cur = Math.max(cur, b);
        if (cur >= hi) break;
      }
      if (!free && cur < hi) free = true;
      if (!free) return true;
    }
    return false;
  }

  // 길 가운데 선에서 떨어진 몸도 폭을 좁힌다: 큰길 반폭 60u + 운반자 14u + 지킴 18u 보다 넉넉하게
  const NEAR_FILTER = 100;
  function segBlocked(w, A, B, obstacles) {
    if (!obstacles.length) return false;
    const near = obstacles.filter((o) => distPointSeg(o.x, o.y, A.x, A.y, B.x, B.y) < NEAR_FILTER);
    if (!near.length) return false;
    return samplesBlocked(edgeSamples(w, A, B), near);
  }

  // ── 상태 ───────────────────────────────────────────────
  function makeUnit(def, kind, x, y) {
    return {
      id: def.id, name: def.name, short: def.short, kind, speed: def.speed, hp: def.hp, maxHp: def.hp,
      skill: def.skill || null, x, y, state: 'guard', home: { x, y }, path: [], target: null, slot: -1,
      stunT: 0, grabCd: 0, holding: false, counterT: 0, hitT: 0, skillCd: 0, down: false, facing: 0, moving: false,
    };
  }

  function createChase(stage, opts) {
    opts = opts || {};
    const g = opts.graph || buildGraph(stage);
    const st = {
      stage, g, w: g.w, t: 0, over: null, events: [],
      units: [], control: stage.CHASE_START.control,
      runner: null, gwihwa: [], barriers: [], doc: null, sealDone: false,
      recalcT: 0, distT: 0, gateDist: { N: 0, S: 0 }, gateDist0: { N: 1, S: 1 },
      mashT: -99, log: null,
    };
    for (const h of stage.HEROES) {
      const p = stage.CHASE_START[h.id];
      st.units.push(makeUnit(h, 'hero', p[0], p[1]));
    }
    for (const s of stage.SOLDIERS) {
      const p = stage.CHASE_START[s.id];
      st.units.push(makeUnit(s, 'soldier', p[0], p[1]));
    }
    const ctl = unit(st, st.control);
    if (ctl) ctl.state = 'controlled';
    const rp = stage.CHASE_START.runner;
    st.runner = {
      x: rp[0], y: rp[1], windup: K.WINDUP, breath: K.BREATH, walkT: 0, slowT: 0,
      route: [], routeName: '', exit: null, cost: Infinity, pending: null, warnT: 0,
      cornered: false, crouch: false, gauge: K.GAUGE, held: false, soloT: 0, restrained: false,
      immuneT: 0, subdued: false, facing: -Math.PI / 2, lastDir: { x: 0, y: -1 }, stuckT: 0,
      nearCd: {}, path: [], trailT: 0,
    };
    st.log = {
      commands: [], switches: 0, skills: [], grabs: [], routeChanges: [], corneredAt: [],
      sealAt: null, gwihwaDown: 0, alliesDown: [], result: null, endT: null,
    };
    // 첫 길 고르기 (1.5초 추스르는 동안에도 계산은 한다)
    replan(st, true);
    updateGateDist(st);
    st.gateDist0 = { N: st.gateDist.N, S: st.gateDist.S };
    return st;
  }

  function unit(st, id) { return st.units.find((u) => u.id === id); }
  function alive(st) { return st.units.filter((u) => !u.down); }

  function bodyRadius(u) {
    return u.state === 'guard' && u.stunT <= 0 ? K.R_GUARD : K.R_BODY;
  }

  function obstacles(st) {
    const out = [];
    for (const u of st.units) if (!u.down) out.push({ x: u.x, y: u.y, r: bodyRadius(u), id: u.id });
    for (const b of st.barriers) {
      const L = hyp(b.x2 - b.x1, b.y2 - b.y1);
      const n = Math.max(1, Math.ceil(L / 4));
      for (let i = 0; i <= n; i++) out.push({ x: b.x1 + (b.x2 - b.x1) * i / n, y: b.y1 + (b.y2 - b.y1) * i / n, r: 3, barrier: true });
    }
    return out;
  }

  // [2차 수정] 규칙 7: 운반자가 이미 지나친 몸(진행 방향 뒤 또는 옆, PASSED_R 안)은 길 계산에서 뺀다.
  // "진행 방향"은 운반자의 순간 걸음 방향이 아니라 **따져 보는 경로의 방향**(북문 길 = 북쪽, 남문 길 = 남쪽)이다.
  // 순간 방향을 쓰면 막힌 성문 앞에서 한 걸음 물러설 때마다 앞/뒤 판정이 뒤집혀 1초마다 길을 바꿨다 (구현 검수 N-1).
  // 결계는 선이라 지나쳤는지 판단하지 않고 항상 센다.
  const EXIT_DIR = { N: { x: 0, y: -1 }, S: { x: 0, y: 1 } };
  function aheadObstacles(st, obs, exit) {
    const r = st.runner, d = EXIT_DIR[exit];
    return obs.filter((o) => o.barrier || !((o.x - r.x) * d.x + (o.y - r.y) * d.y <= 1e-6 && hyp(o.x - r.x, o.y - r.y) < K.PASSED_R));
  }

  // 길 계산용 문맥: 그 성문 방향으로 지나친 몸을 뺀 장애물과 그에 맞는 막힌 간선
  function aheadCtx(st, ctx, exit) {
    const key = 'ahead' + exit;
    if (ctx[key]) return ctx[key];
    const obs = aheadObstacles(st, ctx.obs, exit);
    ctx[key] = obs.length === ctx.obs.length ? { obs, blocked: ctx.blocked } : { obs, blocked: blockedEdges(st, obs) };
    return ctx[key];
  }

  // ── 운반자 길 고르기 (8-2 규칙 1·2·3·7) ───────────────────
  function attachNodes(st, p, maxD, allowDead) {
    const g = st.g, out = [];
    for (let i = 0; i < g.pos.length; i++) {
      if (!allowDead && g.dead.has(g.ids[i])) continue;
      const q = g.pos[i];
      const d = hyp(q.x - p.x, q.y - p.y);
      if (d > maxD) continue;
      if (d > 1 && !los(g.w, p, q)) continue;
      out.push({ i, d });
    }
    // 긴 골목 한가운데에 있을 때: 지금 서 있는 간선의 양 끝에 붙는다
    for (const e of g.edges) {
      const A = g.pos[e.a], B = g.pos[e.b];
      if (distPointSeg(p.x, p.y, A.x, A.y, B.x, B.y) > 16) continue;
      for (const i of [e.a, e.b]) {
        if (out.some((o) => o.i === i)) continue;
        if (!allowDead && g.dead.has(g.ids[i])) continue;
        const q = g.pos[i];
        if (!los(g.w, p, q)) continue;
        out.push({ i, d: hyp(q.x - p.x, q.y - p.y) });
      }
    }
    return out;
  }

  function blockedEdges(st, obs) {
    const set = new Set();
    for (const e of st.g.edges) {
      const A = st.g.pos[e.a], B = st.g.pos[e.b];
      const near = obs.filter((o) => distPointSeg(o.x, o.y, A.x, A.y, B.x, B.y) < NEAR_FILTER);
      if (near.length && samplesBlocked(e.samples, near)) set.add(e.i);
    }
    return set;
  }

  function routePenalty(st, p, nodes) {
    const g = st.g;
    const pts = [p].concat(nodes.map((i) => g.pos[i]));
    let n = 0;
    for (const u of st.units) {
      if (u.down) continue;
      let hit = false;
      for (let k = 0; k < pts.length - 1 && !hit; k++) {
        if (distPointSeg(u.x, u.y, pts[k].x, pts[k].y, pts[k + 1].x, pts[k + 1].y) <= K.NEAR) hit = true;
      }
      if (pts.length === 1 && hyp(u.x - p.x, u.y - p.y) <= K.NEAR) hit = true;
      if (hit) n++;
    }
    return n * K.PENALTY;
  }

  // 성문까지의 모든 단순 경로 중 (예상 도착 시간 + 벌점) 이 가장 낮은 길. 막힌 간선은 무한대.
  function bestGateRoute(st, p, ctx0) {
    let best = null;
    for (const exit of ['N', 'S']) {
      const b = bestGateRouteTo(st, p, aheadCtx(st, ctx0, exit), exit);
      if (b && (!best || b.cost < best.cost - 1e-9)) best = b;
    }
    return best;
  }
  function bestGateRouteTo(st, p, ctx, exitName) {
    const g = st.g;
    const target = exitName === 'N' ? g.exitN : g.exitS;
    const starts = attachNodes(st, p, 140, false).filter((s) => !segBlocked(g.w, p, g.pos[s.i], ctx.obs));
    const windup = Math.max(0, st.runner.windup);
    let best = null;
    const H = (i) => g.T[i][target];
    const visited = new Set();
    let budget = 20000;
    const dfs = (i, base, nodes) => {
      if (--budget < 0) return;
      if (best && base + H(i) >= best.cost) return;
      if (i === g.exitN || i === g.exitS) {
        if (i !== target) return;
        const cost = base + routePenalty(st, p, nodes);
        if (!best || cost < best.cost - 1e-9) best = { nodes: nodes.slice(), base, cost, exit: exitName };
        return;
      }
      for (const e of g.adj[i]) {
        if (ctx.blocked.has(e.i)) continue;
        const j = e.a === i ? e.b : e.a;
        if (visited.has(j) || g.dead.has(g.ids[j])) continue;
        visited.add(j); nodes.push(j);
        dfs(j, base + e.time, nodes);
        nodes.pop(); visited.delete(j);
      }
    };
    // 가까운 붙음점부터 (좋은 답을 먼저 찾아 가지치기가 잘 되게)
    starts.sort((a, b) => (a.d / K.RUN + H(a.i)) - (b.d / K.RUN + H(b.i)));
    for (const s of starts) {
      const t0 = windup + pathTime(g.w, p, g.pos[s.i], K.RUN);
      visited.clear(); visited.add(s.i);
      dfs(s.i, t0, [s.i]);
    }
    if (best) best.name = routeName(st, best.nodes, best.exit);
    return best;
  }

  function routeCost(st, p, nodes, ctx) {
    if (!nodes.length) return Infinity;
    const last = nodes[nodes.length - 1];
    if (last === st.g.exitN || last === st.g.exitS) ctx = aheadCtx(st, ctx, last === st.g.exitN ? 'N' : 'S');
    const g = st.g;
    if (segBlocked(g.w, p, g.pos[nodes[0]], ctx.obs)) return Infinity;
    let base = Math.max(0, st.runner.windup) + pathTime(g.w, p, g.pos[nodes[0]], K.RUN);
    for (let k = 0; k < nodes.length - 1; k++) {
      const e = g.adj[nodes[k]].find((ed) => (ed.a === nodes[k] && ed.b === nodes[k + 1]) || (ed.b === nodes[k] && ed.a === nodes[k + 1]));
      if (!e || ctx.blocked.has(e.i)) return Infinity;
      base += e.time;
    }
    return base + routePenalty(st, p, nodes);
  }

  function routeName(st, nodes, exit) {
    const ids = nodes.map((i) => st.g.ids[i]);
    const has = (s) => ids.includes(s);
    if (exit === 'N') return has('E1') ? 'N1' : has('W1') ? 'NW' : 'N2';
    return has('E5') ? 'S1' : has('W5') ? 'SW' : 'S2';
  }

  function nearestDeadEnd(st, p, ctx) {
    const g = st.g;
    // 막히지 않은 간선만으로 가장 가까운 막다른 갈래까지 (다익스트라)
    const n = g.pos.length;
    const dist = new Array(n).fill(Infinity), prev = new Array(n).fill(-1);
    const done = new Array(n).fill(false);
    for (const s of attachNodes(st, p, 140, true)) {
      if (segBlocked(g.w, p, g.pos[s.i], ctx.obs)) continue;
      dist[s.i] = Math.min(dist[s.i], s.d);
    }
    for (;;) {
      let u = -1;
      for (let i = 0; i < n; i++) if (!done[i] && dist[i] < Infinity && (u < 0 || dist[i] < dist[u])) u = i;
      if (u < 0) break;
      done[u] = true;
      if (g.dead.has(g.ids[u])) {
        const nodes = [];
        for (let v = u; v >= 0; v = prev[v]) nodes.unshift(v);
        return nodes;
      }
      for (const e of g.adj[u]) {
        if (ctx.blocked.has(e.i)) continue;
        const v = e.a === u ? e.b : e.a;
        if (dist[u] + e.len < dist[v]) { dist[v] = dist[u] + e.len; prev[v] = u; }
      }
    }
    return null;
  }

  function replan(st, initial) {
    const r = st.runner;
    if (r.subdued) return;
    const obs = obstacles(st);
    const ctx = { obs, blocked: blockedEdges(st, obs) };
    const p = { x: r.x, y: r.y };
    const best = bestGateRoute(st, p, ctx);
    const curCost = r.cornered ? Infinity : routeCost(st, p, r.route, ctx);
    r.cost = curCost;
    if (!best) {
      // 규칙 7: 어느 성문으로도 길이 없다 → 가장 가까운 막다른 갈래로 = 궁지
      if (!r.cornered) {
        r.cornered = true;
        r.pending = null; r.warnT = 0;
        const dn = nearestDeadEnd(st, p, ctx);
        r.route = dn || [];
        r.routeName = 'dead';
        r.crouch = !dn;
        st.log.corneredAt.push(round(st.t));
        st.events.push({ type: 'cornered' });
      } else if (!r.route.length) {
        r.crouch = true;
      }
      return;
    }
    if (initial) {
      setRoute(st, best);
      return;
    }
    if (r.cornered) {
      // 궁지에서 길이 다시 열리면 예고 후 달아난다
      r.cornered = false; r.crouch = false;
      r.pending = best; r.warnT = K.WARN;
      st.events.push({ type: 'routeWarn', name: best.name });
      return;
    }
    if (r.pending) return;
    const same = best.nodes.length === r.route.length && best.nodes.every((v, k) => v === r.route[k]);
    if (same) { r.cost = best.cost; return; }
    // 규칙 2: 새 길이 3초 이상 나을 때만 바꾼다
    if (best.cost <= curCost - K.SWITCH_GAIN || curCost === Infinity) {
      r.pending = best; r.warnT = K.WARN; // 규칙 3: 0.8초 전 예고
      st.events.push({ type: 'routeWarn', name: best.name });
    }
  }

  function setRoute(st, best) {
    const r = st.runner;
    const prevName = r.routeName;
    r.route = best.nodes.slice();
    r.routeName = best.name;
    r.exit = best.exit;
    r.cost = best.cost;
    if (prevName && prevName !== best.name) st.log.routeChanges.push({ t: round(st.t), from: prevName, to: best.name });
    else if (!prevName) st.log.routeChanges.push({ t: round(st.t), from: null, to: best.name });
  }

  // 성문 거리 막대 (막힘 무시한 최단 거리)
  function gateDistance(st, p) {
    const g = st.g;
    const NG = g.idx.NG, SG = g.idx.SG;
    let n = Infinity, s = Infinity;
    for (const a of attachNodes(st, p, 200, true)) {
      n = Math.min(n, a.d + g.D[a.i][NG]);
      s = Math.min(s, a.d + g.D[a.i][SG]);
    }
    return { N: n, S: s };
  }
  function updateGateDist(st) {
    st.gateDist = gateDistance(st, st.runner);
  }

  // ── 아군 이동 ────────────────────────────────────────────
  function planPath(st, from, to) {
    const g = st.g;
    const n = g.pos.length;
    const dist = new Array(n).fill(Infinity), prev = new Array(n).fill(-1), done = new Array(n).fill(false);
    if (hyp(to.x - from.x, to.y - from.y) < 150 && los(g.w, from, to)) return [{ x: to.x, y: to.y }];
    for (const s of attachNodes(st, from, 170, true)) dist[s.i] = s.d;
    const ends = attachNodes(st, to, 170, true);
    for (;;) {
      let u = -1;
      for (let i = 0; i < n; i++) if (!done[i] && dist[i] < Infinity && (u < 0 || dist[i] < dist[u])) u = i;
      if (u < 0) break;
      done[u] = true;
      for (const e of g.adj[u]) {
        const v = e.a === u ? e.b : e.a;
        if (dist[u] + e.len < dist[v]) { dist[v] = dist[u] + e.len; prev[v] = u; }
      }
    }
    let bestEnd = null, bestD = Infinity;
    for (const e of ends) if (dist[e.i] + e.d < bestD) { bestD = dist[e.i] + e.d; bestEnd = e.i; }
    if (bestEnd === null) return [{ x: to.x, y: to.y }];
    const pts = [];
    for (let v = bestEnd; v >= 0; v = prev[v]) pts.unshift({ x: g.pos[v].x, y: g.pos[v].y });
    pts.push({ x: to.x, y: to.y });
    return pts;
  }

  function commandNodeDef(st, nodeId) {
    const s = st.stage;
    return s.COMMAND_NODES.find((c) => c.id === nodeId) || (s.EXTRA_INVESTIGATION_NODE.id === nodeId ? s.EXTRA_INVESTIGATION_NODE : null);
  }

  function slotFor(st, u, nodeId) {
    const def = commandNodeDef(st, nodeId);
    const used = new Set(st.units.filter((o) => o !== u && !o.down && o.target === nodeId).map((o) => o.slot));
    let k = 0;
    while (used.has(k) && k < def.slots.length - 1) k++;
    return { k, x: def.slots[k][0], y: def.slots[k][1] };
  }

  // 명령판 매듭 탭 → 그 인물이 그 길목까지 알아서 가서 선다 (지킴)
  function command(st, id, nodeId) {
    const u = unit(st, id);
    if (!u || u.down || u.state === 'controlled') return false;
    const s = slotFor(st, u, nodeId);
    u.target = nodeId; u.slot = s.k;
    u.home = { x: s.x, y: s.y };
    u.path = planPath(st, u, u.home);
    u.state = 'moving';
    u.holding = false;
    if (st.log && st.runner) {
      st.log.commands.push({ t: round(st.t), unit: id, node: nodeId, runnerRoute: st.runner.routeName, ahead: isAhead(st, nodeId) });
    }
    return true;
  }

  // H1: 명령 매듭이 운반자가 가려는 성문 쪽(앞쪽)인가
  function isAhead(st, nodeId) {
    const r = st.runner;
    if (!r || !r.exit) return null;
    const g = st.g;
    const gate = r.exit === 'N' ? g.idx.NG : g.idx.SG;
    const nodePos = st.stage.NODES[nodeId];
    if (!nodePos) return null;
    const nodeToGate = g.D[g.idx[nodeId]][gate];
    const runnerToGate = r.exit === 'N' ? st.gateDist.N : st.gateDist.S;
    return nodeToGate < runnerToGate;
  }

  // [조종] → 그 인물로 갈아타기. 방금 조종하던 인물은 그 자리에 선다.
  function switchControl(st, id) {
    const u = unit(st, id);
    if (!u || u.down || u.kind !== 'hero' || st.control === id) return false;
    const prev = unit(st, st.control);
    if (prev && !prev.down) {
      prev.state = 'guard'; prev.home = { x: prev.x, y: prev.y }; prev.target = null; prev.path = []; prev.holding = false;
    }
    u.state = 'controlled'; u.path = []; u.target = null; u.holding = false;
    st.control = id;
    if (st.log) st.log.switches++;
    return true;
  }

  function follow(st, id) {
    const u = unit(st, id);
    if (!u || u.down || u.state === 'controlled') return false;
    u.state = 'follow'; u.target = null; u.path = [];
    return true;
  }

  function stepAlong(st, u, dt) {
    if (!u.path.length) return true;
    let budget = u.speed * dt * (inMarket(st.w, u.x, u.y) ? K.MARKET_SLOW : 1);
    while (budget > 0 && u.path.length) {
      const q = u.path[0];
      const d = hyp(q.x - u.x, q.y - u.y);
      if (d <= budget) {
        if (blockedByGwihwa(st, u, q.x, q.y)) return false;
        u.x = q.x; u.y = q.y; budget -= d; u.path.shift();
      } else {
        const nx = u.x + (q.x - u.x) / d * budget, ny = u.y + (q.y - u.y) / d * budget;
        if (blockedByGwihwa(st, u, nx, ny)) return false;
        u.facing = Math.atan2(q.y - u.y, q.x - u.x);
        u.x = nx; u.y = ny; budget = 0;
      }
    }
    u.moving = true;
    return !u.path.length;
  }

  // 귀화 몸: 아군은 못 지나간다
  function blockedByGwihwa(st, u, nx, ny) {
    // 운반자 몸도 뚫고 지나가지 않는다
    const r = st.runner;
    if (r && !r.subdued) {
      const d0 = hyp(u.x - r.x, u.y - r.y), d1 = hyp(nx - r.x, ny - r.y);
      if (d1 < K.R_BODY + K.R_RUNNER && d1 < d0) return true;
    }
    for (const gw of st.gwihwa) {
      const d0 = hyp(u.x - gw.x, u.y - gw.y), d1 = hyp(nx - gw.x, ny - gw.y);
      if (d1 < K.R_BODY * 2 && d1 < d0) return true;
    }
    return false;
  }

  // ── 한 걸음 ──────────────────────────────────────────────
  // input: { mx, my (−1..1 스틱), action (이번 틱에 눌림) }
  function step(st, dt, input) {
    if (st.over) return;
    input = input || {};
    st.t += dt;
    const r = st.runner;

    // 조종 인물
    const ctl = unit(st, st.control);
    for (const u of st.units) {
      u.moving = false;
      if (u.down) continue;
      u.grabCd = Math.max(0, u.grabCd - dt);
      u.skillCd = Math.max(0, u.skillCd - dt);
      u.hitT = Math.max(0, u.hitT - dt);
      if (u.stunT > 0) {
        u.stunT -= dt;
        if (u.stunT <= 0 && u.state !== 'controlled' && hyp(u.home.x - u.x, u.home.y - u.y) > 2) {
          // 밀린 아군은 굳음이 풀리면 제자리로 걸어 돌아간다 (8-5)
          u.path = planPath(st, u, u.home);
          u.state = u.state === 'follow' ? 'follow' : 'moving';
        }
        continue;
      }
      if (u.state === 'controlled') {
        const m = Math.min(1, hyp(input.mx || 0, input.my || 0));
        if (m > 0.05) {
          const sp = u.speed * m * (inMarket(st.w, u.x, u.y) ? K.MARKET_SLOW : 1) * dt;
          const ang = Math.atan2(input.my, input.mx);
          const q = moveCircle(st.w, u, Math.cos(ang) * sp, Math.sin(ang) * sp, K.R_BODY);
          if (!blockedByGwihwa(st, u, q.x, q.y) && !(hyp(q.x - r.x, q.y - r.y) < K.R_BODY + K.R_RUNNER && hyp(q.x - r.x, q.y - r.y) < hyp(u.x - r.x, u.y - r.y))) {
            u.x = q.x; u.y = q.y;
          }
          u.facing = ang; u.moving = true;
        }
      } else if (u.state === 'moving' && !u.holding) {
        // 붙잡고 있는 동안은 멈춰 선다
        if (stepAlong(st, u, dt)) { u.state = 'guard'; u.path = []; }
      }
    }

    // 행동 버튼 (조종 인물): 붙잡기 > 치기
    if (input.action && ctl && !ctl.down && ctl.stunT <= 0) {
      st.mashT = st.t;
      // 가까운 것에 맞춰: 운반자와 귀화가 둘 다 팔 길이 안이면 더 가까운 쪽 (붙잡는 중이면 계속 붙잡기)
      const kind = actionKind(st);
      if (kind === 'grab') {
        if (ctl.grabCd <= 0 && r.immuneT <= 0 && !ctl.holding) ctl.holding = true;
      } else if (kind === 'hit') {
        const gw = nearestGwihwa(st, ctl, K.ARM);
        if (gw && ctl.hitT <= 0) { hitGwihwa(st, gw, K.HIT_DMG); ctl.hitT = K.HIT_INTERVAL; }
      }
    }

    stepRunner(st, dt);
    stepGrab(st, dt);
    stepGwihwa(st, dt);
    for (const b of st.barriers) b.t -= dt;
    st.barriers = st.barriers.filter((b) => b.t > 0);

    // 조종 중이던 인물이 퇴장하면 다음 인물로
    if (ctl && ctl.down) {
      const next = st.units.find((u) => u.kind === 'hero' && !u.down);
      if (next) { next.state = 'controlled'; next.path = []; st.control = next.id; }
    }

    // 파일럿 보조: 2분 30초가 지나도 봉인 문서가 안 나왔으면 그때 발생
    if (!st.sealDone && st.t >= K.SEAL_FALLBACK_T && !r.subdued) seal(st, false);

    // 패배 (9장)
    if (!st.over) {
      if (r.y < st.stage.EXITS.N.lineY) end(st, 'escape', 'N');
      else if (r.y > st.stage.EXITS.S.lineY) end(st, 'escape', 'S');
      else if (st.units.filter((u) => u.kind === 'hero').every((u) => u.down)) end(st, 'wipe');
      else if (st.t >= K.TIME_LIMIT) end(st, 'timeout');
    }
    // 운반자 경로 기록 (결과 화면 경로선)
    r.trailT -= dt;
    if (r.trailT <= 0) { r.trailT = 0.25; r.path.push([round(st.t), Math.round(r.x), Math.round(r.y)]); }
  }

  function end(st, result, gate) {
    st.over = { result, gate: gate || null, t: st.t };
    st.log.result = result + (gate ? ':' + gate : '');
    st.log.endT = round(st.t);
    st.events.push({ type: result === 'win' ? 'subdued' : 'defeat', result, gate });
  }

  function stepRunner(st, dt) {
    const r = st.runner;
    if (r.subdued) return;
    r.immuneT = Math.max(0, r.immuneT - dt);
    r.slowT = Math.max(0, r.slowT - dt);
    for (const k of Object.keys(r.nearCd)) r.nearCd[k] = Math.max(0, r.nearCd[k] - dt);

    if (r.windup > 0) { r.windup -= dt; }

    // 1초마다 다시 계산 (규칙 2)
    r.recalcT = (r.recalcT || 0) - dt;
    if (r.recalcT <= 0 && !r.held) { r.recalcT = K.RECALC; replan(st, false); }
    st.distT -= dt;
    if (st.distT <= 0) { st.distT = 0.25; updateGateDist(st); }

    // 예고가 끝나면 길을 바꾼다
    if (r.pending) {
      r.warnT -= dt;
      if (r.warnT <= 0) { setRoute(st, r.pending); r.pending = null; st.events.push({ type: 'routeSwitch', name: r.routeName }); }
    }

    // 숨 (규칙 5): 아군이 72u 안에 오면 비켜 달림 = 숨 −25
    for (const u of st.units) {
      if (u.down) continue;
      const d = hyp(u.x - r.x, u.y - r.y);
      const was = r.nearCd[u.id + ':in'];
      if (d <= K.NEAR) {
        if (!was && !(r.nearCd[u.id] > 0) && r.windup <= 0 && !r.held) {
          loseBreath(st, K.BREATH_HIT, 'near');
          r.nearCd[u.id] = K.BREATH_CD;
        }
        r.nearCd[u.id + ':in'] = 1;
      } else if (d > K.NEAR + 8) {
        r.nearCd[u.id + ':in'] = 0;
      }
    }
    if (r.walkT > 0) { r.walkT -= dt; if (r.walkT <= 0) r.breath = K.BREATH; }

    if (r.windup > 0 || r.held || r.crouch) return;
    if (!r.route.length) {
      if (r.cornered) r.crouch = true;
      return;
    }
    const g = st.g;
    let sp = (r.walkT > 0 ? K.WALK : K.RUN) * (r.slowT > 0 ? 1 - K.SHOT_SLOW : 1) * (inMarket(st.w, r.x, r.y) ? K.MARKET_SLOW : 1);
    let budget = sp * dt;
    const obs = obstacles(st);
    let guard = 0;
    const startX = r.x, startY = r.y;
    while (budget > 1e-6 && r.route.length && guard++ < 4) {
      const q = g.pos[r.route[0]];
      const d = hyp(q.x - r.x, q.y - r.y);
      if (d < 4) {
        r.route.shift();
        if (!r.route.length && r.cornered) { r.crouch = true; break; }
        continue;
      }
      const stepLen = Math.min(budget, d);
      const moved = steerStep(st, r, (q.x - r.x) / d, (q.y - r.y) / d, stepLen, obs);
      budget -= stepLen;
      if (!moved) break;
    }
    const mv = hyp(r.x - startX, r.y - startY);
    if (mv > 0.01) { r.lastDir = { x: (r.x - startX) / mv, y: (r.y - startY) / mv }; r.facing = Math.atan2(r.lastDir.y, r.lastDir.x); r.stuckT = 0; }
    else if (r.route.length) {
      r.stuckT += dt;
      if (r.stuckT > 0.6) { r.stuckT = 0; r.recalcT = 0; }
    }
  }

  function loseBreath(st, n, why) {
    const r = st.runner;
    if (r.walkT > 0) return;
    r.breath = Math.max(0, r.breath - n);
    if (r.breath <= 0) { r.walkT = K.BREATH_WALK_T; st.events.push({ type: 'breathOut' }); }
    void why;
  }

  // 가려는 방향을 중심으로 조금씩 틀어 가며 몸·결계에 막히지 않는 쪽으로 한 걸음
  function steerStep(st, r, ux, uy, len, obs) {
    const base = Math.atan2(uy, ux);
    const tries = [0, 0.35, -0.35, 0.7, -0.7, 1.05, -1.05, 1.4, -1.4];
    // 막힌 쪽 반대로 먼저 틀도록: 가까운 몸이 왼쪽에 있으면 오른쪽부터
    let side = 0;
    for (const o of obs) {
      const dx = o.x - r.x, dy = o.y - r.y;
      const d = hyp(dx, dy);
      if (d > 70) continue;
      const cross = ux * dy - uy * dx;
      side += (cross > 0 ? 1 : -1) / Math.max(10, d);
    }
    const order = side > 0 ? tries.map((a) => -a) : tries;
    for (const a of order) {
      const ang = base + a;
      const q = moveCircle(st.w, r, Math.cos(ang) * len, Math.sin(ang) * len, K.R_BODY);
      const moved = hyp(q.x - r.x, q.y - r.y);
      if (moved < len * 0.25) continue;
      if ((q.x - r.x) * ux + (q.y - r.y) * uy < len * 0.1) continue;
      if (!runnerFreeMove(r, q, obs)) continue;
      r.x = q.x; r.y = q.y;
      return true;
    }
    return false;
  }

  // 이미 겹쳐 있던 몸에서 멀어지는 움직임은 허용 (밀려난 직후 갇히지 않게)
  function runnerFreeMove(r, q, obs) {
    for (const o of obs) {
      const need = K.R_RUNNER + o.r - 0.01;
      const d1 = hyp(o.x - q.x, o.y - q.y);
      if (d1 < need) {
        const d0 = hyp(o.x - r.x, o.y - r.y);
        if (d1 <= d0) return false;
      }
    }
    return true;
  }

  // ── 붙잡기 · 구속 · 제압 (8-3) ─────────────────────────────
  function stepGrab(st, dt) {
    const r = st.runner;
    if (r.subdued || r.windup > 0) return;
    const holders = [];
    for (const u of st.units) {
      if (u.down || u.stunT > 0) { u.holding = false; continue; }
      const d = hyp(u.x - r.x, u.y - r.y);
      if (d > K.ARM) { u.holding = false; continue; }
      if (u.state !== 'controlled') {
        // 조종하지 않는 인물·관군: 팔 길이 안에 오면 자동 붙잡기
        if (!u.holding && u.grabCd <= 0 && r.immuneT <= 0) u.holding = true;
      }
      if (u.holding) holders.push(u);
    }
    const restrain = holders.length >= 2 || (r.cornered && holders.length >= 1);
    if (restrain) {
      if (!r.restrained) {
        r.restrained = true; r.held = true; r.soloT = 0;
        st.log.grabs.push({ t: round(st.t), type: 'restraint', by: holders.map((u) => u.id) });
        st.events.push({ type: 'restraintStart' });
      }
      const ctl = unit(st, st.control);
      const mash = ctl && ctl.holding && st.t - st.mashT <= K.MASH_WINDOW;
      r.gauge = Math.max(0, r.gauge - (mash ? K.GAUGE_RATE_MASH : K.GAUGE_RATE) * dt);
      if (!st.sealDone && r.gauge <= K.SEAL_AT) {
        const ex = st.stage.EXITS;
        const nearGate = r.y < ex.N.lineY + K.GATE_ZONE || r.y > ex.S.lineY - K.GATE_ZONE;
        if (nearGate) seal(st, false); // 성문 구역: 문서·귀화는 나오지만 구속은 이어진다
        else { seal(st, true); return; }
      }
      if (r.gauge <= 0) {
        r.subdued = true; r.held = true;
        st.gwihwa = [];
        end(st, 'win');
      }
      return;
    }
    if (r.restrained) {
      // 구속 조건이 깨지면 즉시 뿌리치고 달아남 (게이지는 회복 안 됨)
      r.restrained = false; r.held = false; r.immuneT = K.RUNNER_IMMUNE;
      for (const u of holders) { u.holding = false; u.grabCd = K.GRAB_CD; }
      st.events.push({ type: 'restraintBreak' });
      return;
    }
    if (holders.length === 1) {
      if (!r.held) {
        r.held = true; r.soloT = K.SOLO_HOLD;
        st.log.grabs.push({ t: round(st.t), type: 'solo', by: [holders[0].id] });
        st.events.push({ type: 'soloGrab', by: holders[0].id });
      }
      r.soloT -= dt;
      if (r.soloT <= 0) shakeOff(st, holders, K.SHAKE_PUSH, K.SHAKE_STUN);
      return;
    }
    if (r.held && !r.restrained) { r.held = false; r.soloT = 0; }
  }

  // 뿌리침: 붙잡은 쪽이 24u 밀리고 0.6초 굳음. 운반자 숨 −25
  function shakeOff(st, list, push, stun) {
    const r = st.runner;
    for (const u of list) {
      pushUnit(st, u, u.x - r.x, u.y - r.y, push);
      u.stunT = stun; u.holding = false; u.grabCd = K.GRAB_CD;
    }
    r.held = false; r.soloT = 0; r.restrained = false; r.immuneT = K.RUNNER_IMMUNE;
    loseBreath(st, K.BREATH_HIT, 'shake');
    st.events.push({ type: 'shake' });
  }

  function pushUnit(st, u, dx, dy, dist) {
    const d = hyp(dx, dy) || 1;
    const n = 8;
    for (let i = 0; i < n; i++) {
      const q = moveCircle(st.w, u, dx / d * dist / n, dy / d * dist / n, K.R_BODY);
      u.x = q.x; u.y = q.y;
    }
  }

  // ── 전환점 ③ 봉인 문서 · 귀화 (8-5) ───────────────────────
  function seal(st, forced) {
    const r = st.runner;
    st.sealDone = true;
    st.log.sealAt = round(st.t);
    if (forced) {
      // 구속을 강제로 뿌리침 — 팔 길이 안 아군 전원 24u 밀림
      const near = st.units.filter((u) => !u.down && hyp(u.x - r.x, u.y - r.y) <= K.ARM + 2);
      shakeOff(st, near, K.SHAKE_PUSH, K.SHAKE_STUN);
    }
    st.doc = { x: r.x, y: r.y };
    // 귀화 ① 문서가 떨어진 자리, ② 운반자에게 가장 가까운 "서 있는" 아군 옆
    const standing = st.units.filter((u) => !u.down && u.state === 'guard');
    const pool = standing.length ? standing : st.units.filter((u) => !u.down);
    pool.sort((a, b) => hyp(a.x - r.x, a.y - r.y) - hyp(b.x - r.x, b.y - r.y));
    const t2 = pool[0];
    const p1 = placeNear(st, r.x, r.y - 28, r);
    const nearest1 = st.units.filter((u) => !u.down).sort((a, b) => hyp(a.x - p1.x, a.y - p1.y) - hyp(b.x - p1.x, b.y - p1.y))[0];
    st.gwihwa.push(makeGwihwa(1, p1.x, p1.y, nearest1 ? nearest1.id : null));
    if (t2) {
      const p2 = placeNear(st, t2.x + (r.x - t2.x) * 0.2, t2.y + (r.y - t2.y) * 0.2, t2);
      st.gwihwa.push(makeGwihwa(2, p2.x, p2.y, t2.id));
    }
    st.events.push({ type: 'seal', forced });
  }

  function placeNear(st, x, y, fallback) {
    const tries = [[0, 0], [0, -24], [24, 0], [-24, 0], [0, 24], [18, -18], [-18, 18], [18, 18], [-18, -18]];
    for (const [dx, dy] of tries) if (valid(st.w, x + dx, y + dy, K.R_BODY)) return { x: x + dx, y: y + dy };
    return { x: fallback.x, y: fallback.y };
  }

  function segCross(a, b, c, d) {
    const o = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
    return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
  }
  // 몸(반지름 12)이 결계 선을 넘거나 선에 닿게 되는 걸음인가
  function crossesBarrier(st, from, to) {
    for (const b of st.barriers) {
      const P = { x: b.x1, y: b.y1 }, Q = { x: b.x2, y: b.y2 };
      if (segCross(from, to, P, Q)) return true;
      const d1 = distPointSeg(to.x, to.y, P.x, P.y, Q.x, Q.y), d0 = distPointSeg(from.x, from.y, P.x, P.y, Q.x, Q.y);
      if (d1 < K.R_BODY + 3 && d1 < d0) return true;
    }
    return false;
  }

  function makeGwihwa(n, x, y, target) {
    return { id: 'gw' + n, x, y, hp: K.GW_HP, target, atkT: K.GW_ATTACK_T * 0.5, facing: 0, riseT: K.GW_RISE };
  }

  function nearestGwihwa(st, u, within) {
    let best = null, bd = within;
    for (const gw of st.gwihwa) {
      const d = hyp(gw.x - u.x, gw.y - u.y);
      if (d <= bd) { bd = d; best = gw; }
    }
    return best;
  }

  function hitGwihwa(st, gw, dmg) {
    gw.hp -= dmg;
    st.events.push({ type: 'gwihwaHit', id: gw.id });
    if (gw.hp <= 0) {
      st.gwihwa = st.gwihwa.filter((x) => x !== gw);
      st.log.gwihwaDown++;
      st.events.push({ type: 'gwihwaDown', id: gw.id });
    }
  }

  // 표적 유지 (REVIEW-2 선택 5, 브리프가 비워 둔 한 줄): 귀화는 표적을 속도 32 로 따라간다.
  // 표적이 퇴장하거나 220u 넘게 멀어지면 가장 가까운 아군으로 바꾼다.
  function stepGwihwa(st, dt) {
    for (const gw of st.gwihwa.slice()) {
      if (gw.riseT > 0) { gw.riseT -= dt; continue; } // 피어오르는 중
      let tgt = gw.target ? unit(st, gw.target) : null;
      if (!tgt || tgt.down || hyp(tgt.x - gw.x, tgt.y - gw.y) > K.GW_LEASH) {
        const cand = st.units.filter((u) => !u.down).sort((a, b) => hyp(a.x - gw.x, a.y - gw.y) - hyp(b.x - gw.x, b.y - gw.y));
        tgt = cand[0] || null;
        gw.target = tgt ? tgt.id : null;
      }
      if (!tgt) continue;
      const d = hyp(tgt.x - gw.x, tgt.y - gw.y);
      if (d > K.R_BODY * 2 + 2) {
        const sp = K.GW_SPEED * dt;
        const q = moveCircle(st.w, gw, (tgt.x - gw.x) / d * sp, (tgt.y - gw.y) / d * sp, K.R_BODY);
        // 결계: 12초 동안 귀화도 통과 불가 (8-4)
        if (!crossesBarrier(st, gw, q)) { gw.x = q.x; gw.y = q.y; }
        gw.facing = Math.atan2(tgt.y - gw.y, tgt.x - gw.x);
      }
      gw.atkT -= dt;
      if (gw.atkT <= 0 && hyp(tgt.x - gw.x, tgt.y - gw.y) <= K.R_BODY * 2 + 8) {
        gw.atkT = K.GW_ATTACK_T;
        damage(st, tgt, K.GW_DMG);
        if (!tgt.down) {
          pushUnit(st, tgt, tgt.x - gw.x, tgt.y - gw.y, K.GW_PUSH);
          tgt.stunT = K.GW_STUN; tgt.holding = false;
          if (tgt.state === 'moving') tgt.state = 'guard';
        }
        st.events.push({ type: 'gwihwaAttack', id: gw.id, target: tgt.id });
      } else if (gw.atkT < 0) gw.atkT = 0;
    }
    // 조종하지 않는 인물의 자동 반격 (관군은 반격 못 함)
    for (const u of st.units) {
      if (u.down || u.kind !== 'hero' || u.state === 'controlled' || u.stunT > 0) continue;
      u.counterT = Math.max(0, u.counterT - dt);
      const gw = nearestGwihwa(st, u, K.ARM);
      if (gw && u.counterT <= 0) { hitGwihwa(st, gw, K.HIT_DMG); u.counterT = K.COUNTER_T; }
    }
  }

  function damage(st, u, n) {
    u.hp = Math.max(0, u.hp - n);
    if (u.hp <= 0 && !u.down) {
      u.down = true; u.holding = false; u.path = [];
      st.log.alliesDown.push({ t: round(st.t), id: u.id });
      st.events.push({ type: 'allyDown', id: u.id });
    }
  }

  // ── 기술 (조종 중인 인물만, 8-4) ───────────────────────────
  // 한결 견제사격: 직선 200u, 건물·좌판에 가리면 멈춤. 맞으면 4초 −40%. 재사용 10초. 게이지 효과 0.
  function shoot(st, dx, dy) {
    const u = unit(st, st.control);
    if (!u || u.skill !== 'shot' || u.skillCd > 0 || u.down || u.stunT > 0) return null;
    const d = hyp(dx, dy);
    if (d < 1e-6) return null;
    const ux = dx / d, uy = dy / d;
    const r = st.runner;
    let hit = false, endX = u.x, endY = u.y;
    for (let s = 0; s <= K.SHOT_RANGE; s += 3) {
      const x = u.x + ux * s, y = u.y + uy * s;
      if (!valid(st.w, x, y, 0)) break;
      endX = x; endY = y;
      if (!r.subdued && hyp(r.x - x, r.y - y) <= K.SHOT_HIT_R) { hit = true; break; }
    }
    u.skillCd = K.SHOT_CD;
    if (hit) { r.slowT = K.SHOT_T; }
    st.log.skills.push({ t: round(st.t), who: u.id, kind: 'shot', hit });
    const ev = { type: 'shot', hit, x1: u.x, y1: u.y, x2: endX, y2: endY };
    st.events.push(ev);
    return ev;
  }

  function shotPreview(st, dx, dy) {
    const u = unit(st, st.control);
    const d = hyp(dx, dy);
    if (!u || d < 1e-6) return null;
    const ux = dx / d, uy = dy / d, r = st.runner;
    let endX = u.x, endY = u.y, hit = false;
    for (let s = 0; s <= K.SHOT_RANGE; s += 3) {
      const x = u.x + ux * s, y = u.y + uy * s;
      if (!valid(st.w, x, y, 0)) break;
      endX = x; endY = y;
      if (hyp(r.x - x, r.y - y) <= K.SHOT_HIT_R) { hit = true; break; }
    }
    return { x1: u.x, y1: u.y, x2: endX, y2: endY, hit };
  }

  // 소운 결계: 소운 자리에서 끈 방향으로 선 (최대 45u). 12초 동안 운반자·귀화 통과 불가. 재사용 15초.
  function barrierLine(st, dx, dy, len) {
    const u = unit(st, st.control);
    const d = hyp(dx, dy);
    if (!u || d < 1e-6) return null;
    const L = clamp(len || K.BARRIER_MAX, K.BARRIER_MIN, K.BARRIER_MAX);
    return { x1: u.x, y1: u.y, x2: u.x + dx / d * L, y2: u.y + dy / d * L };
  }
  function barrier(st, dx, dy, len) {
    const u = unit(st, st.control);
    if (!u || u.skill !== 'barrier' || u.skillCd > 0 || u.down || u.stunT > 0) return null;
    const b = barrierLine(st, dx, dy, len);
    if (!b) return null;
    b.t = K.BARRIER_T;
    st.barriers.push(b);
    u.skillCd = K.BARRIER_CD;
    st.log.skills.push({ t: round(st.t), who: u.id, kind: 'barrier', len: round(hyp(b.x2 - b.x1, b.y2 - b.y1)) });
    st.events.push({ type: 'barrier' });
    // 결계가 운반자 몸을 가로지르면 운반자는 그 선 밖으로 밀려난다
    return b;
  }

  // 행동 버튼이 지금 무엇인가 (UI 표시용)
  function actionKind(st) {
    const u = unit(st, st.control);
    if (!u || u.down) return null;
    const r = st.runner;
    const dR = !r.subdued && r.windup <= 0 ? hyp(u.x - r.x, u.y - r.y) : Infinity;
    const gw = nearestGwihwa(st, u, K.ARM);
    const dG = gw ? hyp(u.x - gw.x, u.y - gw.y) : Infinity;
    if (dR <= K.ARM && (u.holding || dR <= dG)) return 'grab';
    if (gw) return 'hit';
    return null;
  }

  function round(v) { return Math.round(v * 100) / 100; }

  const Core = {
    K, clamp, makeWorld, valid, segValid, moveCircle, los, section, distPointSeg, inMarket,
    buildGraph, pathTime, samplesBlocked, segBlocked, blockedEdges, obstacles,
    createChase, step, command, switchControl, follow, planPath, unit, alive, makeUnit, stepAlong,
    replan, bestGateRoute, routeCost, gateDistance, attachNodes, aheadObstacles, crossesBarrier,
    shoot, shotPreview, barrier, barrierLine, actionKind, seal, hitGwihwa, damage, isAhead,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Core;
  else root.JC2D = Core;
})(typeof globalThis !== 'undefined' ? globalThis : this);
