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

// ── 3장 서낭고개: 섬멸형(가까운 적을 계속 침) vs 목표형(조사 → 봉인) (specs/chapter3.md 11장) ──
// 성공 조건: 섬멸형은 15턴 안에 이기기 어렵고, 목표형은 이긴다
const rows3 = [];
for (const c of CONDITIONS) {
  for (const m of [{ key: 'nearest', label: 'A 섬멸형' }, { key: 'objective', label: 'B 목표형' }]) {
    const logs = [];
    for (let seed = 1; seed <= N; seed++) logs.push(playBattle({ seed, mode: m.key, stage: Core.STAGES.ch3, merit: c.merit, chapter: 'ch3' }));
    const wins = logs.filter((s) => s.result === 'win');
    const reasons = {};
    logs.filter((s) => s.result === 'lose').forEach((s) => { reasons[s.loseReason] = (reasons[s.loseReason] || 0) + 1; });
    rows3.push({
      조건: c.label, 자동: m.label, 승률: Math.round((wins.length / N) * 100) + '%',
      '평균턴(승)': wins.length ? f1(avg(wins.map((s) => s.turn))) : '-',
      패배이유: JSON.stringify(reasons),
      원귀물리침: f1(avg(logs.map((s) => s.log.wongwiDefeated))), 재등장: f1(avg(logs.map((s) => s.log.wongwiRespawns))),
      조사: f1(avg(logs.map((s) => s.log.investigations.length))), 봉인: f1(avg(logs.map((s) => s.log.sealRepairs.length))),
      서낭신피해: f1(avg(logs.map((s) => s.log.seonangDamageTaken)))
    });
  }
}
console.log(`\n3장 시뮬레이션 — 조건마다 ${N}판`);
console.table(rows3);

// ── 4장 폐사찰: 섬멸형 / 목표형 / 수련 활용형 × 수련 조합 (specs/chapter4.md 12장) ──
// 성공 조건: 섬멸형은 승률이 낮고, 목표형은 모든 합법 조합(2명 × 방향)과 수련 없음으로 이긴다 (수련 없음은 더 어려워도 된다)
// 수련 활용형은 목표형보다 턴·받은 피해·소등 횟수 중 무엇이든 나아야 한다
const PEOPLE = Core.TRAINING_ORDER;
const COMBOS = [{ label: '수련 없음', training: {} }];
for (let i = 0; i < PEOPLE.length; i++) {
  for (let j = i + 1; j < PEOPLE.length; j++) {
    for (const a of Core.TRAININGS[PEOPLE[i]]) {
      for (const b of Core.TRAININGS[PEOPLE[j]]) {
        COMBOS.push({ label: a.name + '+' + b.name, training: { [PEOPLE[i]]: a.id, [PEOPLE[j]]: b.id } });
      }
    }
  }
}
const N4 = Math.min(N, 20); // 4장 랜덤은 날씨뿐이라 판 수를 줄인다
function run4(mode, training, merit) {
  const logs = [];
  for (let seed = 1; seed <= N4; seed++) logs.push(playBattle({ seed, mode, stage: Core.STAGES.ch4, merit, chapter: 'ch4', training }));
  const wins = logs.filter((s) => s.result === 'win');
  const reasons = {};
  logs.filter((s) => s.result === 'lose').forEach((s) => { reasons[s.loseReason] = (reasons[s.loseReason] || 0) + 1; });
  const taken = (s) => Object.entries(s.log.damageTaken).filter(([id]) => Core.getUnit(s, id).side === 'ally').reduce((n, [, v]) => n + v, 0);
  return {
    승률: Math.round((wins.length / N4) * 100) + '%',
    '평균턴(승)': wins.length ? f1(avg(wins.map((s) => s.turn))) : '-',
    패배: JSON.stringify(reasons),
    소등: f1(avg(logs.map((s) => s.log.sealLampsExtinguished.length))),
    받은피해: f1(avg(logs.map(taken))),
    퇴각: f1(avg(logs.map((s) => s.log.defeatedUnits.filter((d) => d.how === '퇴각').length))),
    귀화처치: f1(avg(logs.map((s) => s.log.gwihwaDefeated))),
    수련발동: f1(avg(logs.map((s) => Object.values(s.log.trainingActivations).reduce((a, b) => a + b, 0))))
  };
}
const rows4 = [];
for (const merit of [0, 13]) {
  const rank = Core.rankFor(merit).name;
  rows4.push({ 품계: rank, 자동: 'A 섬멸형', 수련: '수련 없음', ...run4('nearest', {}, merit) });
  for (const c of COMBOS) {
    if (merit === 0 && c.label !== '수련 없음') continue; // 종9품은 수련 없음만 (가장 어려운 경우)
    rows4.push({ 품계: rank, 자동: 'B 목표형', 수련: c.label, ...run4('objective', c.training, merit) });
    rows4.push({ 품계: rank, 자동: 'C 수련 활용형', 수련: c.label, ...run4('training', c.training, merit) });
  }
}
console.log(`\n4장 시뮬레이션 — 조건마다 ${N4}판 (섬멸형·목표형·수련 활용형, 합법 수련 조합 ${COMBOS.length - 1}개 + 수련 없음)`);
console.table(rows4);
