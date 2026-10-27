const { GAME, OUT, ROOT } = require('./paths');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto(GAME);
  await p.evaluate(() => { window.realUpdate = update; update = () => {}; window.step = (n = 1, k = {}) => { for (let i = 0; i < n; i++) { Object.assign(pressed, k); realUpdate(); pressed = {}; k = {}; } }; });
  const r = await p.evaluate(() => {
    reset(); state = 'play'; waveState = 'fight'; enemies = [];
    step(1, { KeyZ: true, KeyX: true });             // 공격 + 점프 동시
    while (player.attack > 8) step();
    step(1, { KeyZ: true });                          // 공중에서 마지막 8프레임 안에 Z
    let ended = null, restarted = null, landed = null;
    for (let i = 0; i < 80; i++) { const a0 = player.attack, z0 = player.z; step();
      if (a0 > 0 && player.attack === 0 && ended === null) ended = i;
      if (ended !== null && a0 === 0 && player.attack > 0 && restarted === null) restarted = i;
      if (z0 > 0 && player.z === 0 && landed === null) landed = i; }
    return { attackEndedAt: ended, landedAt: landed, autoAttackAt: restarted };
  });
  console.log(JSON.stringify(r));
  await b.close();
})();
