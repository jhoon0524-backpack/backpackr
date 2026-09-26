// 2장 고정 시뮬레이션 리포트 (specs/playtest.md 4장). node --test 대상이 아니다: `node tests/sim-report.mjs [판 수]`
// 밸런스 이상 탐지용이다. 자동 플레이의 승률로 재미를 판정하지 않는다.
// 자동 플레이 2종: greedy = 달래를 쫓는다 / nearest = 가까운 적만 친다 (tests/sim.mjs)
import { Core, playBattle } from './sim.mjs';

const N = Number(process.argv[2]) || 100;
const CONDITIONS = [
  { label: 'A 종9품', merit: 0 },
  { label: 'B 정9품', merit: 3 },
  { label: 'C 종8품', merit: 6 }
];
const MODES = [
  { key: 'greedy', label: '달래 추격' },
  { key: 'nearest', label: '가까운 적' }
];

const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
function median(xs) {
  if (!xs.length) return 0;
  const a = [...xs].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}
const f1 = (x) => x.toFixed(1);

const rows = [];
for (const c of CONDITIONS) {
  for (const m of MODES) {
    const logs = [];
    for (let seed = 1; seed <= N; seed++) {
      logs.push(playBattle({ seed, mode: m.key, stage: Core.STAGES.ch2, merit: c.merit, chapter: 'ch2' }).log);
    }
    const turns = logs.map((l) => l.totalTurns);
    const wins = logs.filter((l) => l.result === 'win');
    const escapes = logs.filter((l) => l.result === 'lose' && l.dalraeEscapeDistance === 0);
    const retreats = logs.map((l) => l.defeatedUnits.filter((d) => d.how === '퇴각').length);
    const munyeoDown = logs.map((l) => l.defeatedUnits.filter((d) => d.id.startsWith('munyeo')).length);
    const healAgain = logs.flatMap((l) => l.healFollowUps.filter((h) => h.target !== 'dallae_boss'));
    rows.push({
      조건: c.label, 자동: m.label, 관군: logs[0].soldierCount,
      승률: Math.round((wins.length / N) * 100) + '%',
      평균턴: f1(avg(turns)), 중앙턴: median(turns),
      평균퇴각: f1(avg(retreats)),
      달래정화수: f1(avg(logs.map((l) => l.dalraeHealCount))),
      '탈출패배': escapes.length, '그밖패배': N - wins.length - escapes.length,
      '무녀제압(평균)': f1(avg(munyeoDown)),
      '회복된적재공격': healAgain.length ? Math.round((healAgain.filter((h) => h.attackedAgain).length / healAgain.length) * 100) + '%' : '-'
    });
  }
}

console.log(`2장 시뮬레이션 — 조건마다 ${N}판 (날씨 seed 1~${N})`);
console.table(rows);
