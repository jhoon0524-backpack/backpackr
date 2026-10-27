const { GAME, OUT, ROOT } = require('./paths');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(GAME);
  await p.evaluate(() => { window.realUpdate = update; update = () => {}; window.step = (n = 1, k = {}) => { for (let i = 0; i < n; i++) { Object.assign(pressed, k); realUpdate(); pressed = {}; k = {}; } }; });
  console.log(await p.evaluate(() => {
    const mk = x => ({ type: 'thug', ...ENEMY_TYPES.thug, maxHp: 999, hp: 999, x, y: 420, z: 0, vz: 0, dir: -1, hitstun: 0, down: 0, attack: 0, cooldown: 9999, dead: 0, flash: 0, entered: true, frozenUntil: 0, vx: 0, kbFriction: 0, invuln: 0, stomped: false });
    reset(); state = 'play'; waveState = 'fight'; cam = 0;
    enemies = [mk(930), mk(938)]; player.x = 900; player.dir = 1; player.combo = 2; player.lastHit = true; player.comboTimer = 5;
    step(1, { KeyZ: true });
    let maxX = 0, framesOut = 0;
    // 화면에 그려지는 위치 = draw 시점 = update 직후
    for (let i = 0; i < 120; i++) { step(); for (const e of enemies) { maxX = Math.max(maxX, e.x); if (e.x > W - 20) framesOut++; } }
    return `벽 앞 적 2명 3타: 최대 x ${maxX.toFixed(1)} (벽 ${W - 20}), 벽 밖에 그려진 적-프레임 ${framesOut}`;
  }));
  console.log('errors', errors); await b.close();
})();
