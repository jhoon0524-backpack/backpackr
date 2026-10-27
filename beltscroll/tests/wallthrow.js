const { GAME, OUT, ROOT } = require('./paths');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(GAME);
  await p.evaluate(() => { window.realUpdate = update; update = () => {}; window.step = (n = 1, k = {}) => { for (let i = 0; i < n; i++) { Object.assign(pressed, k); realUpdate(); pressed = {}; k = {}; } }; });
  const r = await p.evaluate(() => {
    const out = { cases: 0, playerOut: [], enemyOut: [], maxJump: 0 };
    for (const side of [-1, 1]) for (let d = 20; d <= 70; d++) {   // side -1: 왼쪽 벽 쪽으로 뒤로 던짐, 1: 오른쪽 벽
      reset(); state = 'play'; waveState = 'fight'; cam = 0; time = 5; player.hp = 9999; player.y = 420;
      player.dir = -side; player.x = side < 0 ? d : W - d;
      const e = Object.assign({ type: 'thug', ...ENEMY_TYPES.thug, maxHp: 999, hp: 999, x: player.x + player.dir * 24, y: 420, z: 0, vz: 0, dir: side, hitstun: 0, down: 0, attack: 0, cooldown: 9999, dead: 0, flash: 0, entered: true, frozenUntil: 0, vx: 0, kbFriction: 0, invuln: 0, stomped: false, grabbed: false, thrown: null });
      enemies = [e]; startGrab(player, e); out.cases++;
      const back = side < 0 ? 'ArrowLeft' : 'ArrowRight';
      keys[back] = true; step(1, { KeyX: true }); keys[back] = false;
      let px = player.x;
      for (let f = 0; f < 60; f++) { step(); if (player.x < 20 || player.x > W - 20) out.playerOut.push(`${side}:${d}`); if (e.x < 20 || e.x > W - 20) out.enemyOut.push(`${side}:${d}`); out.maxJump = Math.max(out.maxJump, Math.abs(player.x - px)); px = player.x; }
    }
    out.playerOut = [...new Set(out.playerOut)]; out.enemyOut = [...new Set(out.enemyOut)];
    return out;
  });
  console.log(`경우 ${r.cases} / 기대 102`, '주인공 화면 밖', r.playerOut.length, r.playerOut.slice(0, 6).join(','), '| 적 화면 밖', r.enemyOut.length, '| 주인공 한 프레임 최대 이동', r.maxJump.toFixed(1), '| errors', errors.length);
  await b.close();
})();
