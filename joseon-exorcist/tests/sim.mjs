// 전투를 끝까지 돌리는 도우미. 아군 조작은 단순한 욕심쟁이 규칙이다 (최선의 플레이가 아니다).
import { loadCore } from './load.mjs';

export const Core = loadCore();

// 재현 가능한 랜덤 (날씨용)
export function seeded(seed) {
  let x = seed >>> 0 || 1;
  return () => {
    x ^= x << 13; x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5; x >>>= 0;
    return x / 4294967296;
  };
}

// 아군 한 명: 칠 수 있는 칸 중 (흑린 격파 > 요괴 격파 > 큰 피해) 를 고르고,
// 없으면 가장 가까운 요괴 쪽으로 다가간다. 달래는 HP 가 12 이상 빠진 아군이 있으면 정화수.
function greedyAlly(s, u, chase = true) {
  const cells = Core.moveTargets(s, u);
  let best = null;
  for (const cell of cells) {
    const options = [];
    if (u.skill === Core.HEAL_SKILL && u.ki >= Core.SKILL_COST) {
      for (const t of Core.skillTargets(s, u, cell)) {
        const missing = t.maxHp - t.hp;
        if (missing >= 12) options.push({ kind: 'skill', t, score: 50 + missing });
      }
    }
    for (const t of Core.attackTargets(s, u, cell).filter((x) => x.side === 'enemy')) { // 중립(서낭신)은 치지 않는다
      const saved = [u.r, u.c];
      u.r = cell.r; u.c = cell.c; // 서낭당 판정은 대상 칸 기준이라 공격자 위치는 피해에 영향 없음
      const basic = Core.damage(s, u, t, false);
      const skill = u.skill && u.skill !== Core.HEAL_SKILL && u.ki >= Core.SKILL_COST ? Core.damage(s, u, t, true) : 0;
      [u.r, u.c] = saved;
      for (const [kind, dmg] of [['attack', basic], ['skill', skill]]) {
        if (!dmg) continue;
        const kill = dmg >= t.hp;
        const score = (kill && t.boss ? 1000 : 0) + (kill ? 100 : 0) + dmg + (t.boss ? 5 : 0) - (kind === 'skill' ? 1 : 0);
        options.push({ kind, t, score });
      }
    }
    for (const o of options) if (!best || o.score > best.score) best = { ...o, cell };
  }
  if (best) {
    Core.moveUnit(s, u.id, best.cell.r, best.cell.c);
    return best.kind === 'attack' ? Core.attack(s, u.id, best.t.id) : Core.useSkill(s, u.id, best.t.id);
  }
  // 칠 적이 없으면 다가간다. 도망 보스(2장 달래)가 있으면 보스를 쫓는다
  let goal = null;
  const runner = chase && Core.livingUnits(s, 'enemy').find((e) => e.ai === 'flee');
  for (const e of runner ? [runner] : Core.livingUnits(s, 'enemy')) {
    const map = Core.approachMap(s, u, e);
    for (const cell of cells) {
      const d = map[`${cell.r},${cell.c}`] ?? Infinity;
      if (!goal || d < goal.d) goal = { d, cell };
    }
  }
  if (!goal) return Core.wait(s, u.id); // 칠 적이 하나도 없음 (3장: 원귀가 모두 잠시 사라짐)
  Core.moveUnit(s, u.id, goal.cell.r, goal.cell.c);
  return Core.wait(s, u.id);
}

// 3장 목표형: 조사 단계면 가장 가까운 안 한 조사 지점, 봉인 단계면 복구 안 된 봉인 지점으로 간다.
// 그 칸에 닿으면 조사(자동)·복구하고, 못 닿으면 가다가 칠 수 있는 원귀를 친다 (서낭신은 치지 않는다)
function goalCells(s) {
  const o = s.objective;
  if (o.phase === 'investigate') return s.points.filter((p) => p.investigate && !o.investigated.includes(p.id));
  return Core.openSeals(s);
}
function bfsFrom(s, u, goals) {
  const dist = {}, q = [];
  const free = (r, c) => Core.isPassable(s, r, c) && (!Core.unitAt(s, r, c) || Core.unitAt(s, r, c) === u);
  for (const g of goals) if (free(g.r, g.c)) { dist[`${g.r},${g.c}`] = 0; q.push([g.r, g.c]); }
  while (q.length) {
    const [r, c] = q.shift();
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const k = `${r + dr},${c + dc}`;
      if (dist[k] !== undefined || !free(r + dr, c + dc)) continue;
      dist[k] = dist[`${r},${c}`] + 1; q.push([r + dr, c + dc]);
    }
  }
  return dist;
}
function objectiveAlly(s, u, log) {
  const cells = Core.moveTargets(s, u);
  const goals = goalCells(s);
  const onGoal = cells.find((c) => goals.some((g) => g.r === c.r && g.c === c.c));
  // 목표 칸을 원귀가 막고 있으면 그 원귀를 먼저 친다
  const blockers = goals.map((g) => Core.unitAt(s, g.r, g.c)).filter((x) => x && x.side === 'enemy');
  const hitFrom = (cell) => Core.attackTargets(s, u, cell).filter((t) => t.side === 'enemy')
    .sort((a, b) => (blockers.includes(b) ? 1 : 0) - (blockers.includes(a) ? 1 : 0) || a.hp - b.hp)[0];
  let cell = onGoal;
  if (!cell) {
    const ring = goals.flatMap((g) => (Core.unitAt(s, g.r, g.c) && Core.unitAt(s, g.r, g.c) !== u)
      ? [[-1, 0], [1, 0], [0, -1], [0, 1]].map(([dr, dc]) => ({ r: g.r + dr, c: g.c + dc })) : [g]);
    const map = bfsFrom(s, u, ring);
    cell = cells.slice().sort((a, b) => (map[`${a.r},${a.c}`] ?? 99) - (map[`${b.r},${b.c}`] ?? 99) || a.cost - b.cost)[0];
  }
  Core.moveUnit(s, u.id, cell.r, cell.c);
  const arrived = Core.arrive(s, u.id);
  if (log) Core.logEvents(log, s, arrived);
  if (Core.repairablePoint(s, u)) return Core.repairSeal(s, u.id);
  const t = hitFrom(null);
  if (t) return Core.attack(s, u.id, t.id);
  return Core.wait(s, u.id);
}

// ── 4장 폐사찰 (specs/chapter4.md 12장) ──
// 목표형: 조사 → 꺼진 봉인등 밝히기 → 등 위에 서서 지킨다 → 남는 인원은 귀화를 먼저 친다. 수련은 자동으로 붙는 효과만
// 수련 활용형(active): 목표형 + 결계로 길목 막기, 사수는 제자리에서 쏘기, 기습은 멀리 달려와 치기, 재이동으로 빈 등 쪽으로
const K = (c) => `${c.r},${c.c}`;
// 귀화가 등(켜진 등 칸 또는 상하좌우) 옆까지 몇 칸 남았나. block 칸은 막혔다고 본다 (결계 시험용)
function fireDistance(s, f, block) {
  const goals = [];
  for (const l of Core.litLamps(s)) for (const [dr, dc] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]) goals.push({ r: l.r + dr, c: l.c + dc });
  const free = (r, c) => Core.isPassable(s, r, c) && !Core.barrierAt(s, r, c) && !(block && block.r === r && block.c === c)
    && (!Core.unitAt(s, r, c) || Core.unitAt(s, r, c) === f);
  const dist = {}, q = [];
  for (const g of goals) if (free(g.r, g.c) && dist[K(g)] === undefined) { dist[K(g)] = 0; q.push(g); }
  while (q.length) {
    const g = q.shift();
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const n = { r: g.r + dr, c: g.c + dc };
      if (dist[K(n)] !== undefined || !free(n.r, n.c)) continue;
      dist[K(n)] = dist[K(g)] + 1; q.push(n);
    }
  }
  return dist[K(f)] ?? 99;
}
// 견제사격·밀어내기를 쓰면 그 귀화가 다음 적 차례에 등까지 못 오게 되는 자리·대상 (자동 검증 전용)
function reachAfter(s, f, u) {
  const mov = (f.slow ? Math.max(1, f.mov - Core.CHUJEOK_SLOW) : f.mov);
  if (u.training === 'chujeok') return fireDistance(s, f) <= Math.max(1, f.mov - Core.CHUJEOK_SLOW);
  const to = { r: f.r + Math.sign(f.r - u.r), c: f.c + Math.sign(f.c - u.c) };
  if (!Core.isPassable(s, to.r, to.c) || Core.unitAt(s, to.r, to.c) || Core.barrierAt(s, to.r, to.c)) return fireDistance(s, f) <= mov;
  const at = [f.r, f.c];
  [f.r, f.c] = [to.r, to.c];
  const d = fireDistance(s, f);
  [f.r, f.c] = at;
  return d <= mov;
}
function controlFor(s, u, cells, targets) {
  let best = null;
  for (const c of cells) {
    const saved = [u.r, u.c]; u.r = c.r; u.c = c.c;
    for (const t of Core.controlTargets(s, u).filter((x) => targets.includes(x))) {
      if (!reachAfter(s, t, u) && (!best || c.cost < best.cell.cost)) best = { cell: c, t };
    }
    [u.r, u.c] = saved;
  }
  return best;
}
function fires(s) { return Core.livingUnits(s, 'enemy').filter((e) => e.ai === 'lamp'); }
function afterReMove(s, u, active, log) {
  if (!u.reMove) return;
  const opts = Core.reMoveTargets(s, u);
  let pick = { r: u.r, c: u.c };
  if (active) {
    const fs = fires(s);
    if (fs.length) pick = opts.slice().sort((a, b) => Math.min(...fs.map((f) => Math.abs(f.r - a.r) + Math.abs(f.c - a.c)))
      - Math.min(...fs.map((f) => Math.abs(f.r - b.r) + Math.abs(f.c - b.c))))[0];
  }
  const ev = Core.reMove(s, u.id, pick.r, pick.c) || [];
  if (log) Core.logEvents(log, s, ev);
}
function lampAlly(s, u, log, active) {
  const o = s.objective;
  const finish = (ev) => { if (log) Core.logEvents(log, s, ev || []); afterReMove(s, u, active, log); return []; };
  if (o.phase === 'investigate') return finish(objectiveAlly(s, u, log));
  const cells = Core.moveTargets(s, u);
  // 1. 꺼진 등 위 → 밝힌다
  const here = Core.lampAt(s, u.r, u.c);
  if (here && !here.lit) { Core.moveUnit(s, u.id, u.r, u.c); return finish(Core.lightLamp(s, u.id)); }
  const fs = fires(s);
  const imminent = fs.filter((f) => Core.lampInReach(s, f));
  const incoming = fs.filter((f) => !Core.lampInReach(s, f) && fireDistance(s, f) <= f.mov);
  // 사수(활용형): 움직이지 않고 사거리 3 으로 귀화를 칠 수 있으면 제자리에서
  if (active && u.training === 'sasu' && u.ki >= Core.SKILL_COST) {
    const t = Core.skillTargets(s, u).filter((x) => x.ai === 'lamp').sort((a, b) => (imminent.includes(b) ? 1 : 0) - (imminent.includes(a) ? 1 : 0) || a.hp - b.hp)[0];
    if (t) { Core.moveUnit(s, u.id, u.r, u.c); return finish(Core.useSkill(s, u.id, t.id)); }
  }
  // 칠 수 있는 가장 좋은 일격 (priority: 곧 끌 귀화 > 다가오는 귀화 > 다른 귀화 > 원귀)
  const strikeFor = (targets) => {
    let best = null;
    for (const c of cells) {
      const saved = [u.r, u.c]; u.r = c.r; u.c = c.c;
      const opts = [];
      for (const t of Core.attackTargets(s, u).filter((x) => targets.includes(x))) opts.push({ kind: 'attack', t, dmg: Core.damage(s, u, t, false) });
      if (u.skill && u.ki >= Core.SKILL_COST) {
        const moved = !(c.r === (u.from || { r: saved[0] }).r && c.c === (u.from || { c: saved[1] }).c);
        for (const t of Core.skillTargets(s, u).filter((x) => targets.includes(x))) opts.push({ kind: 'skill', t, dmg: Core.damage(s, u, t, true) });
      }
      [u.r, u.c] = saved;
      for (const x of opts) {
        let score = (x.dmg >= x.t.hp ? 100 : 0) + x.dmg - x.t.hp * 0.1 - c.cost * 0.2;
        if (active && u.training === 'gisup' && x.kind === 'skill' && c.cost >= 3) score += 20;
        if (!best || score > best.score) best = { ...x, cell: c, score };
      }
    }
    return best;
  };
  const doIt = (b) => {
    Core.moveUnit(s, u.id, b.cell.r, b.cell.c);
    if (b.kind === 'attack') return finish(Core.attack(s, u.id, b.t.id));
    const near = Core.spreadTargets(s, b.t).sort((a, c) => a.hp - c.hp);
    return finish(Core.useSkill(s, u.id, b.t.id, { spreadId: near[0] && near[0].id }));
  };
  // 2. 이번 차례에 닿는 꺼진 등 → 가서 밝힌다 (등을 켜야 이긴다 — 곧 끌 귀화는 다른 사람이 맡는다)
  const dark = cells.filter((c) => s.lamps.some((l) => !l.lit && l.r === c.r && l.c === c.c));
  if (dark.length) { Core.moveUnit(s, u.id, dark[0].r, dark[0].c); return finish(Core.lightLamp(s, u.id)); }
  // 3. 곧 끌 귀화를 친다
  if (imminent.length) { const b = strikeFor(imminent); if (b) return doIt(b); }
  // v0.9.3 활용형 (기획자 지시 8장): 견제사격(이동 −2)·밀어내기(1칸)로 다가오는 귀화가 다음 적 차례에
  // 등(칸 또는 옆 칸)까지 못 오게 만들 수 있으면 그것을 먼저 쓴다 (기력을 아끼고 기술은 다른 곳에).
  // 못 막으면 쓰지 않고 평소대로 친다 — 발동 횟수를 늘리려고 억지로 쓰지 않는다
  if (active && Core.controlAction(u) && incoming.length) {
    const plan = controlFor(s, u, cells, incoming);
    if (plan) {
      Core.moveUnit(s, u.id, plan.cell.r, plan.cell.c);
      if (log) log.controlPrevented = (log.controlPrevented || 0) + 1;
      return finish(Core.control(s, u.id, plan.t.id));
    }
  }
  // 진법(활용형): 다가오는 귀화의 길을 가장 길게 만드는 칸에 결계
  if (active && u.training === 'jinbeop' && u.ki >= Core.SKILL_COST && incoming.length) {
    let plan = null;
    for (const c of cells) {
      const saved = [u.r, u.c]; u.r = c.r; u.c = c.c;
      const bc = Core.barrierCells(s, u);
      [u.r, u.c] = saved;
      for (const b of bc) {
        const gain = incoming.reduce((n, f) => n + Math.min(fireDistance(s, f, b), 12) - fireDistance(s, f), 0);
        if (gain > 0 && (!plan || gain > plan.gain || (gain === plan.gain && c.cost < plan.c.cost))) plan = { c, b, gain };
      }
    }
    if (plan) {
      Core.moveUnit(s, u.id, plan.c.r, plan.c.c);
      const ev = Core.placeBarrier(s, u.id, plan.b.r, plan.b.c);
      if (ev) return finish(ev);
      Core.cancelMove(s, u.id);
    }
  }
  // 3. 다가오는 귀화 → 다른 귀화 → 원귀 순으로 친다
  for (const group of [incoming, fs, Core.livingUnits(s, 'enemy')]) {
    if (!group.length) continue;
    const b = strikeFor(group);
    if (b) return doIt(b);
  }
  // 활용형: 귀기(증원 징조)가 보이면, 아직 아무도 막지 않은 증원 자리의 옆 칸으로 (자리 위에 서면 옆 빈 칸에 나온다)
  if (active && s.omens && s.omens.length) {
    const guard = [];
    for (const id of s.omens) {
      const sp = s.spawns.find((p) => p.id === id);
      const side = [[-1, 0], [1, 0], [0, -1], [0, 1]].map(([dr, dc]) => ({ r: sp.r + dr, c: sp.c + dc })).filter((c) => Core.isPassable(s, c.r, c.c));
      if (!side.some((c) => { const o = Core.unitAt(s, c.r, c.c); return o && o.side === 'ally' && o !== u; })) guard.push(...side);
    }
    if (guard.length) {
      const map = bfsFrom(s, u, guard);
      const dest = cells.filter((c) => !(s.spawns.some((p) => p.r === c.r && p.c === c.c)))
        .sort((a, b) => (map[K(a)] ?? 99) - (map[K(b)] ?? 99) || a.cost - b.cost)[0];
      if (dest && (map[K(dest)] ?? 99) < 99) {
        Core.moveUnit(s, u.id, dest.r, dest.c);
        return finish(Core.wait(s, u.id));
      }
    }
  }
  // 4. 칠 것이 없으면: 꺼진 등 → 가장 가까운 귀화 → 켜진 등 쪽으로
  const goals = s.lamps.filter((l) => !l.lit).concat(fs).concat(s.lamps);
  const map = bfsFrom(s, u, goals.slice(0, Math.max(1, goals.length)).map((g) => ({ r: g.r, c: g.c })));
  const dest = cells.slice().sort((a, b) => (map[K(a)] ?? 99) - (map[K(b)] ?? 99) || a.cost - b.cost)[0];
  Core.moveUnit(s, u.id, dest.r, dest.c);
  return finish(Core.wait(s, u.id));
}

// 한 판을 끝까지. mode: 'greedy'(도망 보스를 쫓음) | 'nearest'(가까운 적만 침 — 3장 섬멸형) | 'idle'(아군은 대기만) | 'objective'(3장 목표형). stage·merit(누계)로 장·품계를 고른다.
// 플레이 로그(Core.newPlayLog …)도 화면과 같은 방식으로 채워 s.log 에 둔다 (specs/playtest.md)
export function playBattle({ seed = 1, mode = 'greedy', stage, merit, chapter = 'ch1', training } = {}) {
  const rng = seeded(seed);
  const s = Core.newBattle(stage, merit === undefined && !training ? undefined : { merit: merit || 0, training });
  const log = Core.newPlayLog(s, chapter, 0);
  let guard = 0;
  while (s.result === null) {
    if (++guard > 60) throw new Error('전투가 끝나지 않는다');
    Core.logEvents(log, s, Core.startAllyPhase(s, rng));
    // 4장: 이번 적 차례에 등(칸 또는 옆 칸)까지 올 수 있는 귀화 수 = 귀화 접근 (자동 검증 전용 지표)
    if (s.lamps && s.objective.phase === 'lamps') {
      log.gwihwaApproaches = (log.gwihwaApproaches || 0)
        + fires(s).filter((f) => fireDistance(s, f) <= (f.slow ? Math.max(1, f.mov - Core.CHUJEOK_SLOW) : f.mov)).length;
    }
    for (const u of Core.livingUnits(s, 'ally')) {
      if (s.result !== null) break;
      const from = { r: u.r, c: u.c };
      const lampMode = s.lamps && (mode === 'objective' || mode === 'training');
      const events = mode === 'idle' ? Core.wait(s, u.id)
        : lampMode ? lampAlly(s, u, log, mode === 'training')
          : mode === 'objective' ? objectiveAlly(s, u, log) : greedyAlly(s, u, mode !== 'nearest');
      Core.logMove(log, s, u.id, from, { r: u.r, c: u.c });
      if (mode !== 'objective' && mode !== 'training' && s.objective) Core.logEvents(log, s, Core.arrive(s, u.id)); // 섬멸형도 지나다 서면 조사는 된다
      Core.logEvents(log, s, events);
    }
    if (s.result !== null) break;
    Core.logEvents(log, s, Core.endAllyPhase(s));
    for (const id of Core.enemyOrder(s)) {
      if (s.result !== null) break;
      Core.logEvents(log, s, Core.enemyAct(s, id));
    }
    Core.logEvents(log, s, Core.endEnemyPhase(s));
  }
  s.log = Core.finishPlayLog(log, s);
  return s;
}
