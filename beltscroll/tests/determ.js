// 같은 입력이면 같은 판인지: 프레임 단위 자동 플레이(벽시계 안 씀)를 여러 번 돌려 기록을 비교
const { GAME, OUT, ROOT } = require('./paths');
const { chromium } = require('playwright');
const url = process.argv[2] || GAME;   // 다른 버전과 비교: node determ.js file:///.../index.html
async function run(b, sameRuns) {
  const p = await b.newPage(); const errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.goto(url); await p.waitForTimeout(200); await p.keyboard.press('Enter');
  const r = await p.evaluate((n) => {
    window.realUpdate = update; update = () => {};
    const one = () => {
      reset(); state = 'play';
      const trace = []; let f = 0;
      while (state === 'play' && f < 30000) {
        for (const k in keys) keys[k] = false;
        const live = enemies.filter(e => !e.dead && e.down === 0);
        let pr = {};
        if (!live.length) keys.ArrowRight = true;
        else {
          live.sort((a, b) => Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y));
          const e = live[0], dx = e.x - player.x, dy = e.y - player.y;
          if (Math.abs(dy) > 8) keys[dy > 0 ? 'ArrowDown' : 'ArrowUp'] = true;
          if (Math.abs(dx) > 44) keys[dx > 0 ? 'ArrowRight' : 'ArrowLeft'] = true;
          else if (f % 7 === 0) { if ((dx > 0) !== (player.dir > 0)) keys[dx > 0 ? 'ArrowRight' : 'ArrowLeft'] = true; else pr = { KeyZ: true }; }
        }
        Object.assign(pressed, pr); realUpdate(); pressed = {}; f++;
        if (f % 30 === 0) trace.push([Math.round(player.x * 10), Math.round(player.y * 10), player.hp, score, particles.length, ...enemies.map(e => [e.type, Math.round(e.x * 10), Math.round(e.y * 10), e.hp, Math.round(e.cooldown)].join(':'))].join(','));
      }
      for (const k in keys) keys[k] = false;
      return { end: state, frames: f, hp: player.hp, score, wave: waveIndex, spawnY: null, trace: trace.join('|') };
    };
    const runs = []; for (let i = 0; i < n; i++) runs.push(one());
    return runs;
  }, sameRuns);
  await p.close(); return { runs: r, errors };
}
(async () => {
  const b = await chromium.launch();
  const a = await run(b, 2), c = await run(b, 1);   // 같은 페이지에서 2판(재시작), 새 페이지에서 1판
  const all = [...a.runs, ...c.runs];
  const crypto = require('crypto'); const h = s => crypto.createHash('md5').update(s).digest('hex').slice(0, 10);
  all.forEach((r, i) => console.log(`판 ${i + 1}`, r.end, `프레임 ${r.frames} 체력 ${r.hp} 점수 ${r.score} 웨이브 ${r.wave}`, '기록', h(r.trace)));
  const same = all.every(r => r.trace === all[0].trace);
  console.log(same ? '세 판 기록 완전히 같음' : '판마다 기록이 다름', 'errors', [...a.errors, ...c.errors]);
  await b.close();
})();
