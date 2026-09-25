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
// 없으면 가장 가까운 요괴 쪽으로 다가간다. 달래는 HP 가 12 이상 빠진 아군이 있으면 생명수.
function greedyAlly(s, u) {
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
    for (const t of Core.attackTargets(s, u, cell)) {
      const saved = [u.r, u.c];
      u.r = cell.r; u.c = cell.c; // 서낭당 판정은 대상 칸 기준이라 공격자 위치는 피해에 영향 없음
      const basic = Core.damage(s, u, t, false);
      const skill = u.skill !== Core.HEAL_SKILL && u.ki >= Core.SKILL_COST ? Core.damage(s, u, t, true) : 0;
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
  let goal = null;
  for (const e of Core.livingUnits(s, 'enemy')) {
    const map = Core.approachMap(s, u, e);
    for (const cell of cells) {
      const d = map[`${cell.r},${cell.c}`] ?? Infinity;
      if (!goal || d < goal.d) goal = { d, cell };
    }
  }
  Core.moveUnit(s, u.id, goal.cell.r, goal.cell.c);
  return Core.wait(s, u.id);
}

// 한 판을 끝까지. mode: 'greedy' | 'idle'(아군은 대기만). 결과 상태를 돌려준다.
export function playBattle({ seed = 1, mode = 'greedy' } = {}) {
  const rng = seeded(seed);
  const s = Core.newBattle();
  let guard = 0;
  while (s.result === null) {
    if (++guard > 50) throw new Error('전투가 끝나지 않는다');
    Core.startAllyPhase(s, rng);
    for (const u of Core.livingUnits(s, 'ally')) {
      if (s.result !== null) break;
      if (mode === 'idle') Core.wait(s, u.id);
      else greedyAlly(s, u);
    }
    if (s.result !== null) break;
    Core.endAllyPhase(s);
    Core.runEnemyPhase(s);
  }
  return s;
}
