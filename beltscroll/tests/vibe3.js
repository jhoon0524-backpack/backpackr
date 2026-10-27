const { GAME, OUT, ROOT } = require('./paths');
const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errors = [];
  const ctx = await b.newContext({ ...devices['Pixel 7'], viewport: { width: 915, height: 412 } });
  await ctx.addInitScript(() => { window.__vib = []; navigator.vibrate = (ms) => { window.__vib.push(ms); return true; }; });
  const m = await ctx.newPage(); m.on('pageerror', e => errors.push(e.message));
  await m.goto(GAME); await m.waitForTimeout(300);
  const r = await m.evaluate(() => { window.realUpdate = update; update = () => {}; const step = (n = 1, k = {}) => { for (let i = 0; i < n; i++) { Object.assign(pressed, k); realUpdate(); pressed = {}; k = {}; } };
    const mk = (x, extra = {}) => Object.assign({ type: 'thug', ...ENEMY_TYPES.thug, maxHp: 999, hp: 999, x, y: 420, z: 0, vz: 0, dir: -1, hitstun: 0, down: 0, attack: 0, cooldown: 9999, dead: 0, flash: 0, entered: true, frozenUntil: 0, vx: 0, kbFriction: 0, invuln: 0, stomped: false, grabbed: false, thrown: null }, extra);
    debug.vibe = true; const fresh = () => { reset(); state = 'play'; waveState = 'fight'; cam = 0; time = 5; player.x = 480; player.y = 420; player.dir = 1; player.hp = 9999; __vib.length = 0; };
    const out = {};
    fresh(); enemies = [mk(515, { attack: 9 })]; step(2); out['thug 에게 맞음'] = __vib.join(',');
    fresh(); enemies = [Object.assign(mk(515, { attack: 9 }), { type: 'brute', ...ENEMY_TYPES.brute, maxHp: 999, hp: 999 })]; step(2); out['brute 에게 넘어짐'] = __vib.join(',');
    fresh(); enemies = [mk(518)]; step(1, { KeyZ: true }); step(10); out['1타 때림'] = __vib.join(',');
    // 같은 프레임: 주인공 1타 명중 + 다른 적에게 맞음
    fresh(); const a = mk(518), c = mk(445, { dir: 1 }); enemies = [a, c]; step(1, { KeyZ: true }); step(3); c.x = player.x - 30; c.attack = 9; step(1); step(1); out['같은 프레임 때림+맞음'] = __vib.join(',');
    return out; });
  console.log(JSON.stringify(r), '경우', Object.keys(r).length, '/ 기대 4', 'errors', errors); await b.close();
})();
