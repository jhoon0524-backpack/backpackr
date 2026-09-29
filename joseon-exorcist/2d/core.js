// 「조선 퇴마전」 2D 파일럿 v2 — 규칙만 (이동·충돌·전투·운반자·귀화·패배).
// 화면(DOM)과 난수를 쓰지 않는다 → Node 에서 그대로 시험할 수 있다.
// 수치 출처: 2d/DESIGN-BRIEF.md (v2, [v2-수정1]) 6-1 · 8장 · 9장. 설계값은 K 와 stage-ch5.js 에 모았다.
(function (root) {
  'use strict';

  const K = {
    R_BODY: 16,          // 충돌 지름 32u
    R_RUNNER: 16,
    RUN: 150,            // 운반자 150 u/초
    MARKET_SLOW: 1,      // v2 는 시장 감속 없음
    PREP: 1.0,           // 출발 준비
    LATCH_T: 7.0,        // 빗장 다 풀기 (성문마다 진행이 남는다)
    LATCH_HIT: 2.0,      // 빗장 푸는 운반자를 한 번 칠 때 진행 −2초 (옆·뒤 타격만)
    PUSH_SOLDIER_T: 2.5, // 관군 한 명 밀쳐 내기
    SOLDIER_DOWN_T: 6,   // 밀쳐진 관군 쓰러짐
    GATE_HITS: 2,        // 성문에서 옆·뒤로 2번 맞으면 그 성문 포기 (봉인 뒤 1번)
    ABANDON_R: 56, ABANDON_PUSH: 48, ABANDON_STUN: 0.4,
    SHOVE_REACH: 44, SHOVE_WIND: 0.4, SHOVE_PUSH: 48, SHOVE_DMG: 2, SHOVE_STUN: 0.5, SHOVE_CD: 2,
    FLINCH_T: 0.3, FLINCH_CD: 3,
    GAUGE: 28, SEAL_AT: 14, SEAL_FALLBACK_T: 100, TIME_LIMIT: 150,
    BACK_MULT: 1, SEG_CAP: 2,
    SEAL_R: 56, SEAL_PUSH: 48, SEAL_STUN: 0.5,
    GW_HP: 12, GW_SPEED: 130, GW_ATK_T: 1.2, GW_DMG: 4, GW_PUSH: 24, GW_RISE: 1.5, GW_RESPAWN: 6, GW_MAX: 2,
    DOC_PICK_T: 1.0, DOC_PICK_T_SOUN: 0.5, DOC_R: 44,
    SKILL_CD: 6, DODGE_T: 0.25, DODGE_DIST: 90, DODGE_CD: 1, SWITCH_CD: 0.5,
    ALLY_AUTO_R: 60, ALLY_AUTO_T: 1.5, ALLY_AUTO_DMG: 1,
    FOLLOW_FAR: 80, FOLLOW_NEAR: 48,
    COMBO_RESET: 0.8, ATK_BUFFER: 0.25, AUTO_FACE_R: 120,
    // [v2-수정2] 성문 경계·정면 막기 (브리프 8-2 규칙 2·2-1·2-2·3, 8-5). 값은 설계 재현 설정 simv2/D.json 과 같다.
    TURN: 95 * Math.PI / 180, TURN_SEAL: 2.4, // 경계 회전 초당 95° [기획자 결정 90°/초 → 우회 경계값 때문에 마스터 조정 95°/초] / 봉인 문서 뒤 ≈140° (그대로)
    ALERT_R: 110, ARRIVE_FACE: true,  // 조종 인물이 110u 안이면 그쪽을 본다 (도착 때 이미 안이면 처음부터)
    ALERT_LATCH: 0.5,                 // 경계하는 동안 빗장 절반 속도
    FRONT_ZERO: true, BACK_COS: -0.5, // 바라보는 방향 ±60° 안에서 친 것은 막힘
    GATE_SHOVE: true,                 // 성문에서도 정면 76u 안이면 밀치기
    GATE_HITS_SEAL: 1,                // 봉인 문서 뒤에는 옆·뒤 1타로 포기
    GW2_ON_ARRIVE: true, GW2_GUARD_R: 140, // 귀화 ② 는 운반자가 그 성문에 닿을 때, 성문 140u 를 지킨다
    DOC_BANISH: true,                 // 문서를 수습하면 문서 귀화가 사그라든다
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


  // ── 길 찾기 (막힌 간선 제외 가능) ──────────────────────────
  function attachNodes(st, p, maxD) {
    const g = st.g, out = [];
    for (let i = 0; i < g.pos.length; i++) {
      const q = g.pos[i];
      const d = hyp(q.x - p.x, q.y - p.y);
      if (d > maxD) continue;
      if (d > 1 && !los(g.w, p, q)) continue;
      out.push({ i, d });
    }
    for (const e of g.edges) {
      const A = g.pos[e.a], B = g.pos[e.b];
      if (distPointSeg(p.x, p.y, A.x, A.y, B.x, B.y) > 24) continue;
      for (const i of [e.a, e.b]) {
        if (out.some((o) => o.i === i)) continue;
        const q = g.pos[i];
        if (!los(g.w, p, q)) continue;
        out.push({ i, d: hyp(q.x - p.x, q.y - p.y) });
      }
    }
    return out;
  }

  // avoid: 곧게 질러가는 선이 이 몸들 곁(몸 두 개 폭)을 지나면 질러가지 않는다 (운반자용)
  function clearOf(avoid, a, b) {
    if (!avoid) return true;
    for (const o of avoid) if (distPointSeg(o.x, o.y, a.x, a.y, b.x, b.y) < K.R_BODY * 2 + 4) return false;
    return true;
  }
  function planPath(st, from, to, blocked, avoid) {
    const g = st.g;
    if (los(g.w, from, to) && segValid(g.w, from, to, K.R_BODY - 2, 4) && clearOf(avoid, from, to)) return [{ x: to.x, y: to.y }];
    const n = g.pos.length;
    const dist = new Array(n).fill(Infinity), prev = new Array(n).fill(-1), done = new Array(n).fill(false);
    for (const s of attachNodes(st, from, 260)) dist[s.i] = Math.min(dist[s.i], s.d);
    const ends = attachNodes(st, to, 260);
    for (;;) {
      let u = -1;
      for (let i = 0; i < n; i++) if (!done[i] && dist[i] < Infinity && (u < 0 || dist[i] < dist[u])) u = i;
      if (u < 0) break;
      done[u] = true;
      for (const e of g.adj[u]) {
        if (blocked && blocked.has(e.i)) continue;
        const v = e.a === u ? e.b : e.a;
        if (dist[u] + e.len < dist[v]) { dist[v] = dist[u] + e.len; prev[v] = u; }
      }
    }
    let bestEnd = null, bestD = Infinity;
    for (const e of ends) if (dist[e.i] + e.d < bestD) { bestD = dist[e.i] + e.d; bestEnd = e.i; }
    if (bestEnd === null) return blocked ? null : [{ x: to.x, y: to.y }];
    const pts = [];
    for (let v = bestEnd; v >= 0; v = prev[v]) pts.unshift({ x: g.pos[v].x, y: g.pos[v].y });
    pts.push({ x: to.x, y: to.y });
    return smoothPath(g.w, from, pts, avoid);
  }

  // 줄 당기기: 몸(반지름 16)이 곧게 갈 수 있는 가장 먼 점으로 건너뛴다 → 모서리를 깎아 도는 길
  function smoothPath(w, from, pts, avoid) {
    const out = [];
    let cur = { x: from.x, y: from.y }, i = 0;
    while (i < pts.length) {
      let j = pts.length - 1;
      while (j > i && !(segValid(w, cur, pts[j], K.R_BODY - 1, 4) && clearOf(avoid, cur, pts[j]))) j--;
      out.push(pts[j]); cur = pts[j]; i = j + 1;
    }
    return out;
  }

  function pathLength(from, pts) {
    let L = 0, c = from;
    for (const p of pts) { L += hyp(p.x - c.x, p.y - c.y); c = p; }
    return L;
  }

  // ── 상태 ───────────────────────────────────────────────
  function makeHero(def, x, y) {
    return {
      id: def.id, name: def.name, short: def.short, kind: 'hero', def, speed: def.speed, hp: def.hp, maxHp: def.hp,
      x, y, facing: { x: 0, y: -1 }, down: false, moving: false,
      atkT: 0, combo: 0, comboT: 0, atkQueue: 0, skillCd: 0, dodgeCd: 0, dodgeT: 0, dodgeDir: null,
      stunT: 0, invulnT: 0, hitFlash: 0, autoT: 0, path: [], pathT: 0, pickT: 0, lungeT: 0,
    };
  }
  function makeSoldier(def, x, y) {
    return {
      id: def.id, name: def.name, short: def.short, kind: 'soldier', def, speed: def.speed, hp: def.hp, maxHp: def.hp,
      x, y, facing: { x: 0, y: 1 }, down: false, moving: false, order: 'idle', post: null, gate: null, slot: -1,
      path: [], pathT: 0, downT: 0, stunT: 0, hitFlash: 0, home: { x, y },
    };
  }

  function createChase(stage, opts) {
    opts = opts || {};
    const g = opts.graph || buildGraph(stage);
    const S0 = stage.CHASE_START;
    const st = {
      stage, g, w: g.w, t: 0, over: null, events: [], control: S0.control, switchCd: 0,
      units: [], runner: null, gwihwa: [], doc: null, sealDone: false, projectiles: [], respawns: [],
      log: null, gwSeq: 0,
    };
    for (const h of stage.HEROES) st.units.push(makeHero(h, S0[h.id][0], S0[h.id][1]));
    for (const s of stage.SOLDIERS) st.units.push(makeSoldier(s, S0[s.id][0], S0[s.id][1]));
    st.runner = {
      x: S0.runner[0], y: S0.runner[1], state: 'prep', prepT: K.PREP, target: 'N', path: [], pathT: 0,
      latch: { N: 0, S: 0 }, gateHits: 0, pushQueue: [], pushT: 0, pushing: null,
      shoveCd: 0, shoveWind: 0, flinchT: 0, flinchCd: 0, slowT: 0,
      gauge: K.GAUGE, segSum: 0, facing: { x: -1, y: 0 }, lastDir: { x: -1, y: 0 }, subdued: false, trailT: 0, trail: [],
      hitFlash: 0, engagement: null,
    };
    st.log = {
      engagements: [], hits: { back: 0, front: 0, running: 0, capped: 0, ranged: 0 }, subdueTotal: 0,
      firstAttackT: null, firstHitT: null, sealAt: null, docPickedAt: null, docSkipped: null,
      gwihwaDown: 0, gwihwaSpawned: 0, alliesDown: [], damageTaken: 0, switches: 0, soldierOrders: [], skills: [], dodges: 0,
      attacks: 0, result: null, endT: null, latchAtEnd: null,
    };
    return st;
  }

  function unit(st, id) { return st.units.find((u) => u.id === id); }
  function ctlUnit(st) { return unit(st, st.control); }
  function heroes(st) { return st.units.filter((u) => u.kind === 'hero'); }
  function norm(x, y) { const d = hyp(x, y); return d > 1e-9 ? { x: x / d, y: y / d } : { x: 0, y: 0 }; }

  // ── 조종 · 명령 ─────────────────────────────────────────
  function switchControl(st, id) {
    const u = unit(st, id);
    if (!u || u.down || u.kind !== 'hero' || st.control === id || st.switchCd > 0) return false;
    const prev = ctlUnit(st);
    if (prev) { prev.atkQueue = 0; prev.pickT = 0; }
    st.control = id; st.switchCd = K.SWITCH_CD; u.path = [];
    st.log.switches++;
    st.events.push({ type: 'switch', id });
    return true;
  }

  // 관군 [북문] [남문] [따라와]
  function commandSoldier(st, id, order) {
    const u = unit(st, id);
    if (!u || u.kind !== 'soldier' || u.down) return false;
    st.log.soldierOrders.push({ t: round(st.t), id, order });
    if (order === 'follow') { u.order = 'follow'; u.gate = null; u.post = null; u.path = []; return true; }
    const gate = st.stage.GATES[order];
    const other = st.units.find((o) => o !== u && o.kind === 'soldier' && !o.down && o.gate === order);
    const slot = other ? 1 - other.slot : 0;
    u.order = 'post'; u.gate = order; u.slot = slot;
    u.post = { x: gate.posts[slot][0], y: gate.posts[slot][1] };
    u.path = planPath(st, u, u.post);
    return true;
  }

  // ── 한 걸음 ──────────────────────────────────────────────
  // input: { mx, my (−1..1), attack (이번 틱에 눌림), attackHeld, skill, dodge }
  function step(st, dt, input) {
    if (st.over) return;
    input = input || {};
    st.t += dt;
    st.switchCd = Math.max(0, st.switchCd - dt);
    const r = st.runner;

    // 조종 인물이 퇴장했으면 다음 인물로
    let me = ctlUnit(st);
    if (!me || me.down) {
      const next = heroes(st).find((u) => !u.down);
      if (next) { st.control = next.id; me = next; st.events.push({ type: 'switch', id: next.id, forced: true }); }
    }

    for (const u of st.units) {
      u.hitFlash = Math.max(0, u.hitFlash - dt);
      u.invulnT = Math.max(0, (u.invulnT || 0) - dt);
      if (u.down) continue;
      if (u.kind === 'hero') {
        u.skillCd = Math.max(0, u.skillCd - dt); u.dodgeCd = Math.max(0, u.dodgeCd - dt);
        u.atkT = Math.max(0, u.atkT - dt); u.comboT = Math.max(0, u.comboT - dt);
        if (u.comboT <= 0) u.combo = 0;
        u.lungeT = Math.max(0, u.lungeT - dt);
      }
      u.moving = false;
      if (u.stunT > 0) { u.stunT -= dt; continue; }
      if (u === me) stepControlled(st, u, dt, input);
      else if (u.kind === 'hero') stepCompanion(st, u, dt);
      else stepSoldier(st, u, dt);
    }

    stepProjectiles(st, dt);
    stepRunner(st, dt);
    stepGwihwa(st, dt);
    stepRespawn(st, dt);

    if (!st.sealDone && !r.subdued && st.t >= K.SEAL_FALLBACK_T) seal(st, false);

    if (!st.over) {
      if (r.latch.N >= K.LATCH_T) end(st, 'escape', 'N');
      else if (r.latch.S >= K.LATCH_T) end(st, 'escape', 'S');
      else if (heroes(st).every((u) => u.down)) end(st, 'wipe');
      else if (st.t >= K.TIME_LIMIT) end(st, 'timeout');
    }
    r.trailT -= dt;
    if (r.trailT <= 0) { r.trailT = 0.25; r.trail.push([round(st.t), Math.round(r.x), Math.round(r.y)]); }
  }

  function end(st, result, gate) {
    const r = st.runner;
    closeEngagement(st, result);
    st.over = { result, gate: gate || null, t: st.t };
    st.log.result = result + (gate ? ':' + gate : '');
    st.log.endT = round(st.t);
    st.log.latchAtEnd = { N: round(r.latch.N / K.LATCH_T * 100), S: round(r.latch.S / K.LATCH_T * 100) };
    st.log.gaugeAtEnd = round(r.gauge);
    if (result === 'win') st.gwihwa = [];
    st.events.push({ type: result === 'win' ? 'subdued' : 'defeat', result, gate });
  }

  // ── 조종 인물 ───────────────────────────────────────────
  function stepControlled(st, u, dt, input) {
    const m = Math.min(1, hyp(input.mx || 0, input.my || 0));
    const stick = m > 0.05 ? { x: input.mx / m, y: input.my / m } : null;
    // 회피: 0.25초 대시 90u, 무적
    if (input.dodge && u.dodgeCd <= 0 && u.dodgeT <= 0) {
      u.dodgeT = K.DODGE_T; u.dodgeCd = K.DODGE_CD; u.invulnT = K.DODGE_T;
      u.dodgeDir = stick || u.facing; u.pickT = 0;
      st.log.dodges++;
      st.events.push({ type: 'dodge', id: u.id });
    }
    if (u.dodgeT > 0) {
      const sp = K.DODGE_DIST / K.DODGE_T * Math.min(dt, u.dodgeT);
      u.dodgeT -= dt;
      moveUnit(st, u, u.dodgeDir.x * sp, u.dodgeDir.y * sp, true);
      u.moving = true;
      return;
    }
    if (stick) {
      const sp = u.speed * m * dt;
      moveUnit(st, u, stick.x * sp, stick.y * sp, false);
      u.facing = stick; u.moving = true;
    }
    // 문서 수습: 문서 옆에서 공격 버튼을 누르고 있기
    const doc = st.doc;
    const nearDoc = doc && !doc.picked && hyp(doc.x - u.x, doc.y - u.y) <= K.DOC_R;
    if (nearDoc && input.attackHeld) {
      u.pickT += dt;
      const need = u.id === 'soun' ? K.DOC_PICK_T_SOUN : K.DOC_PICK_T;
      if (u.pickT >= need) {
        doc.picked = true; u.pickT = 0;
        if (K.DOC_BANISH) { const n0 = st.gwihwa.length; st.gwihwa = st.gwihwa.filter((g) => g.from !== 'doc'); st.log.gwihwaBanished = n0 - st.gwihwa.length; }
        st.log.docPickedAt = round(st.t);
        st.events.push({ type: 'docPicked', by: u.id });
      }
    } else u.pickT = 0;
    if (input.attack && !nearDoc) u.atkQueue = K.ATK_BUFFER;
    else u.atkQueue = Math.max(0, u.atkQueue - dt);
    if (u.atkQueue > 0 && u.atkT <= 0) { u.atkQueue = 0; attack(st, u); }
    if (input.skill && u.skillCd <= 0) useSkill(st, u, stick || u.facing);
  }

  function moveUnit(st, u, dx, dy, dodging) {
    const q = moveCircle(st.w, u, dx, dy, K.R_BODY);
    // 운반자·귀화 몸은 뚫지 못한다 (회피 중에는 귀화를 빠져나갈 수 있다)
    const r = st.runner;
    const blockers = [];
    if (!r.subdued) blockers.push({ x: r.x, y: r.y });
    if (!dodging) for (const gw of st.gwihwa) if (gw.riseT <= 0) blockers.push(gw);
    for (const b of blockers) {
      const d0 = hyp(u.x - b.x, u.y - b.y), d1 = hyp(q.x - b.x, q.y - b.y);
      if (d1 < K.R_BODY * 2 && d1 < d0) {
        // 몸 둘레를 따라 미끄러지게: 접선 방향 성분만 남긴다
        const n = norm(u.x - b.x, u.y - b.y);
        const along = dx * -n.y + dy * n.x;
        const q2 = moveCircle(st.w, u, -n.y * along, n.x * along, K.R_BODY);
        if (hyp(q2.x - b.x, q2.y - b.y) >= K.R_BODY * 2 - 0.5) { u.x = q2.x; u.y = q2.y; }
        return;
      }
    }
    u.x = q.x; u.y = q.y;
  }

  // 가까운 적 (운반자·피어오른 귀화)
  function nearestEnemy(st, u, within) {
    let best = null, bd = within;
    const r = st.runner;
    if (!r.subdued) { const d = hyp(r.x - u.x, r.y - u.y); if (d <= bd) { bd = d; best = { kind: 'runner', ref: r, d }; } }
    for (const gw of st.gwihwa) {
      if (gw.riseT > 0) continue;
      const d = hyp(gw.x - u.x, gw.y - u.y);
      if (d <= bd) { bd = d; best = { kind: 'gw', ref: gw, d }; }
    }
    return best;
  }

  // ── 기본 공격 (연타 콤보) ─────────────────────────────────
  function attack(st, u) {
    const a = u.def.atk;
    const idx = u.combo % a.waits.length;
    const tgt = nearestEnemy(st, u, a.kind === 'melee' ? K.AUTO_FACE_R : a.range + 16);
    if (tgt) u.facing = norm(tgt.ref.x - u.x, tgt.ref.y - u.y);
    u.atkT = a.waits[idx];
    u.combo = idx + 1; u.comboT = a.waits[idx] + K.COMBO_RESET;
    if (u.combo >= a.waits.length) u.combo = 0;
    st.log.attacks++;
    if (st.log.firstAttackT === null) st.log.firstAttackT = round(st.t);
    const last = idx === a.waits.length - 1;
    st.events.push({ type: 'swing', id: u.id, kind: a.kind, idx, last });
    if (a.kind === 'melee') {
      u.lungeT = 0.12;
      const reach = a.reach + K.R_BODY;
      for (const gw of st.gwihwa.slice()) {
        if (gw.riseT > 0) continue;
        if (inFan(u, gw, reach, a.arc)) hitGwihwa(st, gw, a.dmg[idx], u, 10);
      }
      const r = st.runner;
      if (!r.subdued && inFan(u, r, reach, a.arc)) hitRunner(st, u, { subdue: a.subdue[idx], ranged: false, kind: 'melee' });
    } else if (a.kind === 'arrow') {
      // 자동 조준 · 즉시 명중 (건물에 가리면 못 쏨)
      if (tgt && tgt.d <= a.range + 16 && los(st.w, u, tgt.ref)) {
        st.events.push({ type: 'arrow', x1: u.x, y1: u.y, x2: tgt.ref.x, y2: tgt.ref.y });
        if (tgt.kind === 'gw') hitGwihwa(st, tgt.ref, a.dmg[0], u, 6);
        else hitRunner(st, u, { subdue: 0, ranged: true, kind: 'arrow' });
      } else st.events.push({ type: 'arrow', x1: u.x, y1: u.y, x2: u.x + u.facing.x * a.range, y2: u.y + u.facing.y * a.range, miss: true });
    } else if (a.kind === 'charm') {
      const dir = tgt && tgt.d <= a.range + 16 ? norm(tgt.ref.x - u.x, tgt.ref.y - u.y) : u.facing;
      st.projectiles.push({ x: u.x, y: u.y, vx: dir.x * a.speed, vy: dir.y * a.speed, left: a.range, dmg: a.dmg[0], owner: u.id });
    }
  }

  function inFan(u, t, reach, arc) {
    const dx = t.x - u.x, dy = t.y - u.y, d = hyp(dx, dy);
    if (d > reach + K.R_BODY) return false;
    if (d < K.R_BODY * 2 + 2) return true; // 몸이 닿아 있으면 방향과 상관없이
    const c = (dx * u.facing.x + dy * u.facing.y) / d;
    return c >= Math.cos(arc);
  }

  function stepProjectiles(st, dt) {
    for (const p of st.projectiles) {
      const s = hyp(p.vx, p.vy) * dt;
      const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt;
      p.left -= s;
      if (!valid(st.w, nx, ny, 0)) { p.dead = true; continue; }
      p.x = nx; p.y = ny;
      const owner = unit(st, p.owner);
      for (const gw of st.gwihwa) {
        if (gw.riseT > 0) continue;
        if (hyp(gw.x - p.x, gw.y - p.y) <= K.R_BODY + 6) { hitGwihwa(st, gw, p.dmg, owner, 4); p.dead = true; break; }
      }
      const r = st.runner;
      if (!p.dead && !r.subdued && hyp(r.x - p.x, r.y - p.y) <= K.R_BODY + 6) {
        // 조종 인물이 던진 부적만 운반자에 "맞음" (제압치 0)
        if (owner && owner.id === st.control) hitRunner(st, owner, { subdue: 0, ranged: true, kind: 'charm' });
        p.dead = true;
      }
      if (p.left <= 0) p.dead = true;
    }
    st.projectiles = st.projectiles.filter((p) => !p.dead);
  }

  // ── 기술 (재사용 6초, 조종 인물만) ──────────────────────────
  function useSkill(st, u, dir) {
    const sk = u.def.skill;
    dir = norm(dir.x, dir.y);
    if (!dir.x && !dir.y) dir = u.facing;
    const tgt = nearestEnemy(st, u, 160);
    if (tgt && sk.id !== 'chukji' && sk.id !== 'byeoksa') dir = norm(tgt.ref.x - u.x, tgt.ref.y - u.y);
    u.facing = dir; u.skillCd = K.SKILL_CD;
    st.log.skills.push({ t: round(st.t), who: u.id, skill: sk.id });
    if (st.log.firstAttackT === null) st.log.firstAttackT = round(st.t);
    const r = st.runner;
    const ev = { type: 'skill', id: u.id, skill: sk.id, x1: u.x, y1: u.y };
    if (sk.id === 'byeoksa') {
      // 앞으로 100u 돌진 베기. 경로의 귀화를 밀쳐 내며 피해 10
      const from = { x: u.x, y: u.y };
      const hitSet = new Set();
      const n = 10;
      for (let i = 0; i < n; i++) {
        moveUnit(st, u, dir.x * sk.dash / n, dir.y * sk.dash / n, true);
        for (const gw of st.gwihwa) {
          if (gw.riseT > 0 || hitSet.has(gw)) continue;
          if (hyp(gw.x - u.x, gw.y - u.y) <= K.R_BODY * 2 + 12) { hitSet.add(gw); hitGwihwa(st, gw, sk.dmg, u, 36); }
        }
        if (!r.subdued && !hitSet.has(r) && hyp(r.x - u.x, r.y - u.y) <= K.R_BODY * 2 + 14) { hitSet.add(r); hitRunner(st, u, { subdue: sk.subdue, ranged: false, kind: 'skill' }); }
      }
      ev.x1 = from.x; ev.y1 = from.y; ev.x2 = u.x; ev.y2 = u.y;
    } else if (sk.id === 'gyeonje') {
      // 관통 화살 300u: 운반자 2.5초 −40%, 귀화 피해 8 (제압치 0)
      let ex = u.x, ey = u.y;
      const hitSet = new Set();
      for (let s = 0; s <= sk.range; s += 4) {
        const x = u.x + dir.x * s, y = u.y + dir.y * s;
        if (!valid(st.w, x, y, 0)) break;
        ex = x; ey = y;
        for (const gw of st.gwihwa) if (gw.riseT <= 0 && !hitSet.has(gw) && hyp(gw.x - x, gw.y - y) <= K.R_BODY + 4) { hitSet.add(gw); hitGwihwa(st, gw, sk.dmg, u, 8); }
        if (!r.subdued && !hitSet.has(r) && hyp(r.x - x, r.y - y) <= K.R_BODY + 4) { hitSet.add(r); r.slowT = sk.slowT; hitRunner(st, u, { subdue: 0, ranged: true, kind: 'skill' }); }
      }
      ev.x2 = ex; ev.y2 = ey;
    } else if (sk.id === 'chukji') {
      // 바라보는 쪽 140u 순간 이동 (벽 통과 불가) + 도착 지점 치기
      let bx = u.x, by = u.y;
      for (let s = 4; s <= sk.dist; s += 4) {
        const x = u.x + dir.x * s, y = u.y + dir.y * s;
        if (!valid(st.w, x, y, K.R_BODY)) break;
        const blockedBody = (!r.subdued && hyp(r.x - x, r.y - y) < K.R_BODY * 2) || st.gwihwa.some((gw) => gw.riseT <= 0 && hyp(gw.x - x, gw.y - y) < K.R_BODY * 2);
        if (blockedBody) break;
        bx = x; by = y;
      }
      u.x = bx; u.y = by;
      for (const gw of st.gwihwa.slice()) if (gw.riseT <= 0 && hyp(gw.x - u.x, gw.y - u.y) <= sk.reach + K.R_BODY * 2) hitGwihwa(st, gw, sk.dmg, u, 12);
      if (!r.subdued && hyp(r.x - u.x, r.y - u.y) <= sk.reach + K.R_BODY * 2) {
        u.facing = norm(r.x - u.x, r.y - u.y);
        hitRunner(st, u, { subdue: sk.subdue, ranged: false, kind: 'skill' });
      }
      ev.x2 = u.x; ev.y2 = u.y;
    } else if (sk.id === 'hwayeom') {
      // 앞쪽 원형 불 (반지름 45, 중심은 45u 앞) — 귀화 피해 12 = 한 번에 퇴송
      const cx = u.x + dir.x * sk.ahead, cy = u.y + dir.y * sk.ahead;
      for (const gw of st.gwihwa.slice()) if (gw.riseT <= 0 && hyp(gw.x - cx, gw.y - cy) <= sk.radius + K.R_BODY) hitGwihwa(st, gw, sk.dmg, u, 20);
      if (!r.subdued && hyp(r.x - cx, r.y - cy) <= sk.radius + K.R_BODY) hitRunner(st, u, { subdue: sk.subdue, ranged: false, kind: 'skill' });
      ev.x2 = cx; ev.y2 = cy; ev.radius = sk.radius;
    }
    st.events.push(ev);
  }

  // ── 운반자가 맞았을 때 (8-2 규칙 3·5, 8-3) ─────────────────
  function runnerWorking(r) { return r.state === 'push' || r.state === 'work'; }

  function hitRunner(st, u, h) {
    const r = st.runner;
    if (r.subdued) return;
    const isCtl = u && u.id === st.control;
    let amount = 0, back = false, capped = false;
    r.hitFlash = 0.12;
    if (st.log.firstHitT === null) st.log.firstHitT = round(st.t);
    if (runnerWorking(r)) {
      // 성문에서 일하는 중 [v2-수정2]: 바라보는 쪽 ±60° 는 막힘(0), 옆·뒤 ×1, 빗장 진행 −2초, 옆·뒤 2타(봉인 뒤 1타)에 포기
      const f = K.TURN ? r.facing : st.stage.GATES[r.target].face;
      { const v = norm(u.x - r.x, u.y - r.y); back = (v.x * f.x + v.y * f.y) < -K.BACK_COS; }
      if (K.FRONT_ZERO && !back) {
        st.log.hits.blocked = (st.log.hits.blocked || 0) + 1;
        st.events.push({ type: 'hitRunner', by: u ? u.id : null, amount: 0, back: false, blocked: true, working: true });
        return;
      }
      if (isCtl && !h.ranged) amount = h.subdue * (back ? K.BACK_MULT : 1);
      r.latch[r.target] = Math.max(0, r.latch[r.target] - K.LATCH_HIT);
      r.gateHits++;
      const eg = r.engagement || openEngagement(st);
      eg.hits++; if (back) eg.back++; eg.subdue += amount;
      if (h.ranged) st.log.hits.ranged++; else if (back) st.log.hits.back++; else st.log.hits.front++;
    } else {
      // 달리는 중: 한 구간 제압치 합 ≤ 2, 비틀은 3초에 한 번
      if (isCtl && !h.ranged) {
        const room = Math.max(0, K.SEG_CAP - r.segSum);
        amount = Math.min(h.subdue, room);
        capped = h.subdue > room;
        r.segSum += amount;
      }
      if (r.flinchCd <= 0 && r.state === 'run') { r.flinchT = K.FLINCH_T; r.flinchCd = K.FLINCH_CD; }
      st.log.hits.running++;
      if (capped) st.log.hits.capped++;
      if (h.ranged) st.log.hits.ranged++;
    }
    if (amount > 0) { r.gauge = Math.max(0, r.gauge - amount); st.log.subdueTotal = round(st.log.subdueTotal + amount); }
    st.events.push({ type: 'hitRunner', by: u ? u.id : null, amount, back, capped, ranged: !!h.ranged, working: runnerWorking(r) });
    if (r.gauge <= 0) { r.subdued = true; r.state = 'subdued'; end(st, 'win'); return; }
    if (!st.sealDone && r.gauge <= K.SEAL_AT) { seal(st, true); return; }
    if (runnerWorking(r) && r.gateHits >= (st.sealDone && K.GATE_HITS_SEAL ? K.GATE_HITS_SEAL : K.GATE_HITS)) abandonGate(st);
  }

  function openEngagement(st) {
    const r = st.runner;
    r.engagement = { gate: r.target, t: round(st.t), hits: 0, back: 0, subdue: 0, end: null };
    st.log.engagements.push(r.engagement);
    return r.engagement;
  }
  function closeEngagement(st, why) {
    const r = st.runner;
    if (r.engagement) { r.engagement.end = why; r.engagement.subdue = round(r.engagement.subdue); r.engagement.endT = round(st.t); r.engagement = null; }
  }

  // 규칙 3 [v2-수정2]: 성문에서 옆·뒤로 2번(봉인 뒤 1번) 맞으면 주변 아군을 밀쳐 내고 반대 성문으로
  function abandonGate(st) {
    const r = st.runner;
    pushAround(st, K.ABANDON_R, K.ABANDON_PUSH, K.ABANDON_STUN);
    closeEngagement(st, 'abandon');
    const other = r.target === 'N' ? 'S' : 'N';
    startRun(st, other);
    st.events.push({ type: 'abandon', to: other });
  }

  function pushAround(st, radius, dist, stun) {
    const r = st.runner;
    for (const u of st.units) {
      if (u.down || (u.kind === 'soldier' && u.downT > 0)) continue;
      const d = hyp(u.x - r.x, u.y - r.y);
      if (d > radius + K.R_BODY) continue;
      if (u.invulnT > 0) continue;
      const n = d > 1e-6 ? norm(u.x - r.x, u.y - r.y) : { x: 0, y: 1 };
      pushUnit(st, u, n.x, n.y, dist);
      u.stunT = Math.max(u.stunT, stun); u.atkQueue = 0; u.pickT = 0;
    }
  }

  function pushUnit(st, u, nx, ny, dist) {
    const n = 8;
    for (let i = 0; i < n; i++) { const q = moveCircle(st.w, u, nx * dist / n, ny * dist / n, K.R_BODY); u.x = q.x; u.y = q.y; }
  }

  function startRun(st, gate) {
    const r = st.runner;
    r.target = gate; r.state = 'run'; r.gateHits = 0; r.segSum = 0; r.pushQueue = []; r.pushing = null; r.pathT = 0; r.path = [];
  }

  // 먼 성문 = 조종 인물에게서 길이 먼 성문
  function farGate(st) {
    const me = ctlUnit(st);
    if (!me) return 'N';
    const dN = pathLength(me, planPath(st, me, pt(st.stage.GATES.N.latch)));
    const dS = pathLength(me, planPath(st, me, pt(st.stage.GATES.S.latch)));
    return dN >= dS ? 'N' : 'S';
  }
  function pt(a) { return { x: a[0], y: a[1] }; }

  // ── 운반자 (8-2) ───────────────────────────────────────
  function stepRunner(st, dt) {
    const r = st.runner;
    if (r.subdued) return;
    r.hitFlash = Math.max(0, r.hitFlash - dt);
    r.flinchCd = Math.max(0, r.flinchCd - dt);
    r.slowT = Math.max(0, r.slowT - dt);
    r.shoveCd = Math.max(0, r.shoveCd - dt);
    if (r.state === 'prep') { r.prepT -= dt; if (r.prepT <= 0) startRun(st, 'N'); return; }
    if (r.flinchT > 0) { r.flinchT -= dt; return; }
    const gate = st.stage.GATES[r.target];
    if (r.state === 'run') {
      stepShove(st, dt);
      const goal = pt(gate.latch);
      r.pathT -= dt;
      if (r.pathT <= 0 || !r.path.length) { r.pathT = 0.5; r.path = runnerPath(st, goal); }
      const sp = K.RUN * (r.slowT > 0 ? 1 - st.stage.HEROES.find((h) => h.id === 'hangyeol').skill.slow : 1) * dt;
      const x0 = r.x, y0 = r.y;
      runnerMove(st, sp);
      // 빗장 28u 안에서 몸에 막혀 못 다가가면 그 자리에서 일을 시작한다 (빗장 옆에 서서 영원히 못 붙게 하는 끼임 방지)
      const stuckNear = hyp(goal.x - r.x, goal.y - r.y) <= 28 && hyp(r.x - x0, r.y - y0) < sp * 0.2;
      // 성문 앞 관군이 있으면 밀쳐 내기부터
      const guards = st.units.filter((u) => u.kind === 'soldier' && !u.down && u.downT <= 0 && u.gate === r.target && u.order === 'post' && hyp(u.x - u.post.x, u.y - u.post.y) < 20);
      const nearGuard = guards.find((u) => hyp(u.x - r.x, u.y - r.y) <= K.R_BODY * 2 + 20);
      if (nearGuard) {
        r.state = 'push'; r.pushQueue = guards.slice(); r.pushT = K.PUSH_SOLDIER_T; r.pushing = r.pushQueue[0];
        r.facing = { x: gate.face.x, y: gate.face.y };
        arriveFace(st, r);
        st.events.push({ type: 'gateArrive', gate: r.target });
        pendingGw2(st);
        return;
      }
      if (hyp(goal.x - r.x, goal.y - r.y) <= 6 || stuckNear) {
        r.state = 'work'; r.facing = { x: gate.face.x, y: gate.face.y };
        arriveFace(st, r);
        st.events.push({ type: 'gateArrive', gate: r.target });
        pendingGw2(st);
      }
      return;
    }
    if (r.state === 'push' || r.state === 'work') { alertTurn(st, r, gate, dt); if (K.GATE_SHOVE) stepShove(st, dt, true); }
    if (r.state === 'push') {
      if (!K.TURN) r.facing = { x: gate.face.x, y: gate.face.y };
      const s = r.pushing;
      if (!s || s.down || s.downT > 0) { nextPush(st); return; }
      r.pushT -= dt;
      if (r.pushT <= 0) {
        // 관군 한 명 밀쳐 냄: 6초 동안 쓰러짐
        const n = norm(s.x - r.x, s.y - r.y);
        pushUnit(st, s, n.x || 0.3, n.y || 1, 24);
        s.downT = K.SOLDIER_DOWN_T; s.path = [];
        st.events.push({ type: 'soldierShoved', id: s.id });
        nextPush(st);
      }
      return;
    }
    if (r.state === 'work') {
      const goal = pt(gate.latch);
      if (hyp(goal.x - r.x, goal.y - r.y) > 4) { runnerMove(st, K.RUN * dt, [goal]); if (hyp(goal.x - r.x, goal.y - r.y) > 28) return; }
      if (!K.TURN) r.facing = { x: gate.face.x, y: gate.face.y };
      r.latch[r.target] = Math.min(K.LATCH_T, r.latch[r.target] + dt * (r.alert ? K.ALERT_LATCH : 1));
    }
  }

  // v2-수정2: 성문에서 일하는 중 조종 인물이 ALERT_R 안이면 그쪽으로 돌아선다 (초당 TURN 라디안)
  function alertTurn(st, r, gate, dt) {
    if (!K.TURN) return;
    const me = ctlUnit(st);
    let want = { x: gate.face.x, y: gate.face.y };
    r.alert = false;
    if (me && !me.down && hyp(me.x - r.x, me.y - r.y) <= K.ALERT_R) { want = norm(me.x - r.x, me.y - r.y); r.alert = true; }
    const a0 = Math.atan2(r.facing.y, r.facing.x), a1 = Math.atan2(want.y, want.x);
    let da = a1 - a0; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
    const stp = (st.sealDone && K.TURN_SEAL ? K.TURN_SEAL : K.TURN) * dt;
    const a = Math.abs(da) <= stp ? a1 : a0 + Math.sign(da) * stp;
    r.facing = { x: Math.cos(a), y: Math.sin(a) };
  }

  function nextPush(st) {
    const r = st.runner;
    r.pushQueue.shift();
    while (r.pushQueue.length && (r.pushQueue[0].down || r.pushQueue[0].downT > 0)) r.pushQueue.shift();
    if (r.pushQueue.length) { r.pushing = r.pushQueue[0]; r.pushT = K.PUSH_SOLDIER_T; }
    else { r.pushing = null; r.state = 'work'; }
  }

  // 운반자 길: 동료·관군 몸으로 막힌 골목은 피한다 (조종 인물은 밀치기로 상대)
  function runnerPath(st, goal) {
    const r = st.runner;
    const obs = st.units.filter((u) => !u.down && u.id !== st.control && !(u.kind === 'soldier' && (u.downT > 0 || (u.gate === r.target && u.order === 'post'))))
      .map((u) => ({ x: u.x, y: u.y, r: K.R_BODY }));
    const blocked = new Set();
    for (const e of st.g.edges) {
      const A = st.g.pos[e.a], B = st.g.pos[e.b];
      const near = obs.filter((o) => distPointSeg(o.x, o.y, A.x, A.y, B.x, B.y) < 100);
      if (near.length && samplesBlocked(e.samples, near)) blocked.add(e.i);
    }
    return planPath(st, r, goal, blocked, obs) || planPath(st, r, goal, null, obs);
  }

  function runnerMove(st, len, pathOverride) {
    const r = st.runner;
    const path = pathOverride || r.path;
    let budget = len, guard = 0;
    const x0 = r.x, y0 = r.y;
    while (budget > 1e-6 && path.length && guard++ < 4) {
      const q = path[0];
      const d = hyp(q.x - r.x, q.y - r.y);
      if (d < 3) { path.shift(); continue; }
      const stepLen = Math.min(budget, d);
      if (!steerStep(st, r, (q.x - r.x) / d, (q.y - r.y) / d, stepLen)) break;
      budget -= stepLen;
    }
    const mv = hyp(r.x - x0, r.y - y0);
    if (mv > 0.01) { r.lastDir = { x: (r.x - x0) / mv, y: (r.y - y0) / mv }; r.facing = r.lastDir; }
  }

  function bodyObstacles(st) {
    return st.units.filter((u) => !u.down && !(u.kind === 'soldier' && u.downT > 0)).map((u) => ({ x: u.x, y: u.y, r: K.R_BODY }));
  }

  // 가려는 방향을 조금씩 틀며 몸을 비켜 달린다 (8-2 규칙 5)
  function steerStep(st, r, ux, uy, len) {
    const obs = bodyObstacles(st);
    const base = Math.atan2(uy, ux);
    let side = 0;
    for (const o of obs) {
      const dx = o.x - r.x, dy = o.y - r.y, d = hyp(dx, dy);
      if (d > 90) continue;
      side += ((ux * dy - uy * dx) > 0 ? 1 : -1) / Math.max(10, d);
    }
    const tries = [0, 0.35, -0.35, 0.7, -0.7, 1.05, -1.05, 1.4, -1.4, 1.57, -1.57, 2.1, -2.1, 2.6, -2.6, 3.14];
    for (const a0 of tries) {
      const a = side > 0 ? -a0 : a0;
      const q = moveCircle(st.w, r, Math.cos(base + a) * len, Math.sin(base + a) * len, K.R_RUNNER);
      const moved = hyp(q.x - r.x, q.y - r.y);
      if (moved < len * 0.25) continue;
      // 정면이 막히면 옆걸음(±90°)까지 허용해 몸 사이 틈을 찾는다
      // 정면이 막히면 옆걸음·뒷걸음까지 허용해 몸 사이에서 빠져나온다
      if (Math.abs(a0) <= 1.5 && (q.x - r.x) * ux + (q.y - r.y) * uy < len * 0.1) continue;
      let ok = true;
      for (const o of obs) {
        const d1 = hyp(o.x - q.x, o.y - q.y);
        if (d1 < K.R_RUNNER + o.r - 0.01 && d1 <= hyp(o.x - r.x, o.y - r.y)) { ok = false; break; }
      }
      if (!ok) continue;
      r.x = q.x; r.y = q.y;
      return true;
    }
    return false;
  }

  // 규칙 4: 달리는 중 앞 44u 안에 조종 인물 → 0.4초 예고 후 밀치기
  function stepShove(st, dt, atGate) {
    const r = st.runner, me = ctlUnit(st);
    if (!me || me.down) { r.shoveWind = 0; return; }
    const dx = me.x - r.x, dy = me.y - r.y, d = hyp(dx, dy);
    const dir = atGate ? r.facing : r.lastDir;
    const ahead = d > 0 && (dx * dir.x + dy * dir.y) / d > (atGate ? 0.5 : 0.2);
    const inReach = d <= K.SHOVE_REACH + K.R_BODY * 2;
    if (r.shoveWind > 0) {
      r.shoveWind -= dt;
      if (r.shoveWind <= 0) {
        if (inReach && me.invulnT <= 0) {
          const n = norm(dx, dy);
          pushUnit(st, me, n.x, n.y, K.SHOVE_PUSH);
          me.stunT = Math.max(me.stunT, K.SHOVE_STUN); me.atkQueue = 0;
          damage(st, me, K.SHOVE_DMG, 'shove');
          st.events.push({ type: 'shove', hit: true });
        } else st.events.push({ type: 'shove', hit: false });
        r.shoveCd = K.SHOVE_CD;
      }
      return;
    }
    if (r.shoveCd <= 0 && ahead && inReach) { r.shoveWind = K.SHOVE_WIND; st.events.push({ type: 'shoveWarn' }); }
  }

  // ── 동료 · 관군 ────────────────────────────────────────
  function followPoint(st, u) {
    const me = ctlUnit(st);
    return me;
  }
  function walkPath(st, u, dt, target, speedMul) {
    u.pathT -= dt;
    if (u.pathT <= 0 || !u.path.length) { u.pathT = 0.4; u.path = planPath(st, u, target); }
    let budget = u.speed * (speedMul || 1) * dt, guard = 0;
    while (budget > 1e-6 && u.path.length && guard++ < 4) {
      const q = u.path[0];
      const d = hyp(q.x - u.x, q.y - u.y);
      if (d < 3) { u.path.shift(); continue; }
      const s = Math.min(budget, d);
      const x0 = u.x, y0 = u.y;
      moveUnit(st, u, (q.x - u.x) / d * s, (q.y - u.y) / d * s, false);
      const mv = hyp(u.x - x0, u.y - y0);
      if (mv < s * 0.2) { u.pathT = 0; break; }
      u.facing = norm(q.x - x0, q.y - y0);
      budget -= s; u.moving = true;
    }
  }

  function stepCompanion(st, u, dt) {
    const me = ctlUnit(st);
    // 귀화가 60u 안이면 자동으로 친다 (1.5초마다 1)
    u.autoT = Math.max(0, u.autoT - dt);
    const gw = st.gwihwa.find((g) => g.riseT <= 0 && hyp(g.x - u.x, g.y - u.y) <= K.ALLY_AUTO_R + K.R_BODY);
    if (gw && u.autoT <= 0) { u.autoT = K.ALLY_AUTO_T; u.facing = norm(gw.x - u.x, gw.y - u.y); hitGwihwa(st, gw, K.ALLY_AUTO_DMG, u, 2); st.events.push({ type: 'autoHit', id: u.id }); }
    if (!me) return;
    const d = hyp(me.x - u.x, me.y - u.y);
    if (d > K.FOLLOW_FAR || (u.path.length && d > K.FOLLOW_NEAR)) walkPath(st, u, dt, me, 1);
    else u.path = [];
  }

  function stepSoldier(st, u, dt) {
    if (u.downT > 0) {
      u.downT -= dt;
      if (u.downT <= 0) { u.path = []; st.events.push({ type: 'soldierUp', id: u.id }); }
      return;
    }
    if (u.order === 'post' && u.post) {
      if (hyp(u.post.x - u.x, u.post.y - u.y) > 3) walkPath(st, u, dt, u.post, 1);
      else { u.path = []; u.facing = { x: 0, y: u.gate === 'N' ? 1 : -1 }; }
    } else if (u.order === 'follow') {
      const me = ctlUnit(st);
      if (me) { const d = hyp(me.x - u.x, me.y - u.y); if (d > K.FOLLOW_FAR + 20) walkPath(st, u, dt, me, 1); else u.path = []; }
    }
  }

  function damage(st, u, n, why) {
    if (u.down || u.invulnT > 0) return false;
    u.hp = Math.max(0, u.hp - n);
    u.hitFlash = 0.15;
    if (u.kind === 'hero') st.log.damageTaken += n;
    st.events.push({ type: 'hurt', id: u.id, n, why });
    if (u.hp <= 0) {
      u.down = true; u.path = []; u.pickT = 0;
      st.log.alliesDown.push({ t: round(st.t), id: u.id });
      st.events.push({ type: 'allyDown', id: u.id });
    }
    return true;
  }

  // ── 전환점 ③ 봉인 문서 · 귀화 (8-5) ─────────────────────
  function seal(st, fromHit) {
    const r = st.runner;
    st.sealDone = true;
    st.log.sealAt = round(st.t);
    pushAround(st, K.SEAL_R, K.SEAL_PUSH, K.SEAL_STUN);
    closeEngagement(st, 'seal');
    st.doc = { x: r.x, y: r.y, picked: false };
    // 조종 인물에게서 먼 성문으로 (성문에서 일하던 중이면 그 성문이 아닌 쪽)
    let gate = farGate(st);
    if (runnerWorking(r) && gate === r.target) gate = r.target === 'N' ? 'S' : 'N';
    startRun(st, gate);
    const docSpot = placeNear(st, r.x, r.y - 30, r);
    spawnGwihwa(st, docSpot.x, docSpot.y, 'doc');
    const g = st.stage.GATES[gate];
    if (K.GW2_ON_ARRIVE) st.pendingGw2 = gate; else spawnGwihwa(st, g.front[0], g.front[1], 'gate', gate);
    st.events.push({ type: 'seal', gate, fromHit });
  }

  // v2-수정2: 성문에 닿을 때 조종 인물이 ALERT_R 안에 있으면 그쪽을 보며 붙는다 (뒷걸음으로 빗장에 붙음)
  function arriveFace(st, r) {
    if (!K.ARRIVE_FACE) return;
    const me = ctlUnit(st);
    if (me && !me.down && hyp(me.x - r.x, me.y - r.y) <= K.ALERT_R) r.facing = norm(me.x - r.x, me.y - r.y);
  }

  function pendingGw2(st) {
    if (!st.pendingGw2 || st.pendingGw2 !== st.runner.target) return;
    const g = st.stage.GATES[st.pendingGw2];
    spawnGwihwa(st, g.front[0], g.front[1], 'gate', st.pendingGw2);
    st.pendingGw2 = null;
  }

  function placeNear(st, x, y, fallback) {
    const tries = [[0, 0], [0, -30], [30, 0], [-30, 0], [0, 30], [24, -24], [-24, 24], [24, 24], [-24, -24]];
    for (const [dx, dy] of tries) if (valid(st.w, x + dx, y + dy, K.R_BODY)) return { x: x + dx, y: y + dy };
    return { x: fallback.x, y: fallback.y };
  }

  function spawnGwihwa(st, x, y, from, gate) {
    st.gwSeq++;
    const gw = { id: 'gw' + st.gwSeq, x, y, hp: K.GW_HP, riseT: K.GW_RISE, atkT: 0.4, from, gate: gate || null, target: null, path: [], pathT: 0, hitFlash: 0, facing: { x: 0, y: 1 } };
    st.gwihwa.push(gw);
    st.log.gwihwaSpawned++;
    st.events.push({ type: 'gwihwaSpawn', id: gw.id, from });
    return gw;
  }

  function hitGwihwa(st, gw, dmg, by, knock) {
    gw.hp -= dmg;
    gw.hitFlash = 0.12;
    if (by && knock) { const n = norm(gw.x - by.x, gw.y - by.y); const q = moveCircle(st.w, gw, n.x * knock, n.y * knock, K.R_BODY); gw.x = q.x; gw.y = q.y; }
    st.events.push({ type: 'hitGwihwa', id: gw.id, dmg, by: by ? by.id : null, x: gw.x, y: gw.y });
    if (gw.hp <= 0) {
      st.gwihwa = st.gwihwa.filter((g) => g !== gw);
      st.log.gwihwaDown++;
      st.events.push({ type: 'gwihwaDown', id: gw.id, x: gw.x, y: gw.y });
      // 문서가 땅에 있으면 6초 뒤 문서 자리에서 다시 피어난다
      if (st.doc && !st.doc.picked) st.respawns.push({ t: K.GW_RESPAWN });
    }
  }

  function stepRespawn(st, dt) {
    for (const s of st.respawns) s.t -= dt;
    const ready = st.respawns.filter((s) => s.t <= 0);
    st.respawns = st.respawns.filter((s) => s.t > 0);
    for (const s of ready) {
      void s;
      if (!st.doc || st.doc.picked || st.runner.subdued) continue;
      if (st.gwihwa.length >= K.GW_MAX) { st.respawns.push({ t: 0.5 }); continue; }
      const p = placeNear(st, st.doc.x, st.doc.y, st.doc);
      spawnGwihwa(st, p.x, p.y, 'doc');
    }
  }

  function gwTarget(st, gw) {
    const me = ctlUnit(st);
    if (gw.from === 'gate') {
      const sol = st.units.find((u) => u.kind === 'soldier' && !u.down && u.gate === gw.gate && u.order === 'post');
      if (sol) return sol;
    }
    return me && !me.down ? me : st.units.find((u) => u.kind === 'hero' && !u.down) || null;
  }

  function stepGwihwa(st, dt) {
    for (const gw of st.gwihwa) {
      gw.hitFlash = Math.max(0, gw.hitFlash - dt);
      if (gw.riseT > 0) { gw.riseT -= dt; continue; }
      let tgt = gwTarget(st, gw);
      if (!tgt) continue;
      if (K.GW2_ON_ARRIVE && gw.from === 'gate' && tgt.kind === 'hero') {
        const gl = st.stage.GATES[gw.gate].latch;
        if (hyp(tgt.x - gl[0], tgt.y - gl[1]) > K.GW2_GUARD_R) {
          const gf = st.stage.GATES[gw.gate].front; const dd = hyp(gf[0] - gw.x, gf[1] - gw.y);
          if (dd > 4) { const q = moveCircle(st.w, gw, (gf[0] - gw.x) / dd * Math.min(dd, K.GW_SPEED * dt), (gf[1] - gw.y) / dd * Math.min(dd, K.GW_SPEED * dt), K.R_BODY); gw.x = q.x; gw.y = q.y; }
          continue;
        }
      }
      gw.target = tgt.id;
      const d = hyp(tgt.x - gw.x, tgt.y - gw.y);
      if (d > K.R_BODY * 2 + 2) {
        const sp = K.GW_SPEED * dt;
        if (los(st.w, gw, tgt) && segValid(st.w, gw, tgt, K.R_BODY - 2, 6)) {
          const q = moveCircle(st.w, gw, (tgt.x - gw.x) / d * sp, (tgt.y - gw.y) / d * sp, K.R_BODY);
          gw.x = q.x; gw.y = q.y; gw.path = [];
        } else {
          gw.pathT -= dt;
          if (gw.pathT <= 0 || !gw.path.length) { gw.pathT = 0.5; gw.path = planPath(st, gw, tgt); }
          const q0 = gw.path[0];
          if (q0) {
            const dq = hyp(q0.x - gw.x, q0.y - gw.y);
            if (dq < 4) gw.path.shift();
            else { const q = moveCircle(st.w, gw, (q0.x - gw.x) / dq * sp, (q0.y - gw.y) / dq * sp, K.R_BODY); gw.x = q.x; gw.y = q.y; }
          }
        }
        gw.facing = norm(tgt.x - gw.x, tgt.y - gw.y);
      }
      gw.atkT -= dt;
      gw.warn = gw.atkT <= 0.3 && hyp(tgt.x - gw.x, tgt.y - gw.y) <= K.R_BODY * 2 + 8;
      if (gw.atkT <= 0) {
        if (hyp(tgt.x - gw.x, tgt.y - gw.y) <= K.R_BODY * 2 + 8) {
          gw.atkT = K.GW_ATK_T;
          if (damage(st, tgt, K.GW_DMG, 'gwihwa')) {
            const n = norm(tgt.x - gw.x, tgt.y - gw.y);
            pushUnit(st, tgt, n.x, n.y, K.GW_PUSH);
            if (tgt.kind === 'hero') { tgt.combo = 0; tgt.atkQueue = 0; tgt.pickT = 0; }
          }
          st.events.push({ type: 'gwihwaAttack', id: gw.id, target: tgt.id });
        } else gw.atkT = 0;
      }
    }
  }

  // 공격 버튼이 지금 무엇인가 (UI 표시용)
  function actionKind(st) {
    const me = ctlUnit(st);
    if (!me || me.down) return null;
    if (st.doc && !st.doc.picked && hyp(st.doc.x - me.x, st.doc.y - me.y) <= K.DOC_R) return 'pick';
    return 'attack';
  }

  function round(v) { return Math.round(v * 100) / 100; }

  const Core = {
    K, clamp, makeWorld, valid, segValid, moveCircle, los, section, distPointSeg,
    buildGraph, samplesBlocked, planPath, smoothPath, pathLength, attachNodes,
    createChase, step, switchControl, commandSoldier, unit, ctlUnit, heroes, makeHero,
    hitRunner, hitGwihwa, damage, seal, spawnGwihwa, actionKind, farGate, runnerWorking, useSkill, attack,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Core;
  else root.JC2D = Core;
})(typeof globalThis !== 'undefined' ? globalThis : this);
