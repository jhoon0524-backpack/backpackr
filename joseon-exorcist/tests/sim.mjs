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

// 한 판을 끝까지. mode: 'greedy'(도망 보스를 쫓음) | 'nearest'(가까운 적만 침 — 3장 섬멸형) | 'idle'(아군은 대기만) | 'objective'(3장 목표형). stage·merit(누계)로 장·품계를 고른다.
// 플레이 로그(Core.newPlayLog …)도 화면과 같은 방식으로 채워 s.log 에 둔다 (specs/playtest.md)
export function playBattle({ seed = 1, mode = 'greedy', stage, merit, chapter = 'ch1' } = {}) {
  const rng = seeded(seed);
  const s = Core.newBattle(stage, merit === undefined ? undefined : { merit });
  const log = Core.newPlayLog(s, chapter, 0);
  let guard = 0;
  while (s.result === null) {
    if (++guard > 50) throw new Error('전투가 끝나지 않는다');
    Core.logEvents(log, s, Core.startAllyPhase(s, rng));
    for (const u of Core.livingUnits(s, 'ally')) {
      if (s.result !== null) break;
      const from = { r: u.r, c: u.c };
      const events = mode === 'idle' ? Core.wait(s, u.id)
        : mode === 'objective' ? objectiveAlly(s, u, log) : greedyAlly(s, u, mode !== 'nearest');
      Core.logMove(log, s, u.id, from, { r: u.r, c: u.c });
      if (mode !== 'objective' && s.objective) Core.logEvents(log, s, Core.arrive(s, u.id)); // 섬멸형도 지나다 서면 조사는 된다
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
