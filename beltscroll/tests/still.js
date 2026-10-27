const { GAME, OUT, ROOT } = require('./paths');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto(GAME);
  await p.evaluate(() => { window.realUpdate = update; update = () => {}; window.step = (n = 1, k = {}) => { for (let i = 0; i < n; i++) { Object.assign(pressed, k); realUpdate(); pressed = {}; k = {}; } }; });
  for (const heavy of [false, true]) console.log(await p.evaluate((heavy) => {
    reset(); state = 'play'; waveState = 'fight';
    enemies = [{ type: 'thug', ...ENEMY_TYPES.thug, maxHp: 999, hp: 999, x: 517, y: 420, z: 0, vz: 0, dir: -1, hitstun: 0, down: 0, attack: 0, cooldown: 9999, dead: 0, flash: 0, entered: true, frozenUntil: 0, vx: 0, kbFriction: 0, invuln: 0, stomped: false }];
    player.x = 480; player.dir = 1; cam = 0;
    if (heavy) { player.combo = 2; player.lastHit = true; player.comboTimer = 5; }
    const e = enemies[0]; const h = e.hp; step(1, { KeyZ: true }); while (e.hp === h) step();
    const T = time; const pa = player.attack, ex = e.x;
    let pRes = null, eRes = null;
    for (let i = 1; i < 30 && (pRes === null || eRes === null); i++) { step(); if (pRes === null && player.attack !== pa) pRes = i; if (eRes === null && e.x !== ex) eRes = i; }
    return `${heavy ? 'heavy' : 'normal'}: 맞은 뒤 주인공은 ${pRes - 1}프레임, 적은 ${eRes - 1}프레임 멈춘 뒤 ${pRes}번째 / ${eRes}번째 프레임에 다시 움직임`;
  }, heavy));
  await b.close();
})();
