const { GAME, OUT, ROOT } = require('./paths');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage(); const errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.goto(GAME); await p.waitForTimeout(200);
  await p.keyboard.press('Enter');
  console.log(JSON.stringify(await p.evaluate(() => {
    window.realUpdate = update; update = () => {}; const step = (n = 1, k = {}) => { for (let i = 0; i < n; i++) { Object.assign(pressed, k); realUpdate(); pressed = {}; k = {}; } };
    const made = []; const orig = audio.createOscillator.bind(audio); audio.createOscillator = () => { const o = orig(); const f = o.frequency.setValueAtTime.bind(o.frequency); o.frequency.setValueAtTime = (v, t) => { made.push({ t: time, freq: v }); return f(v, t); }; return o; };
    const mk = (x, y) => Object.assign({ type: 'thug', ...ENEMY_TYPES.thug, maxHp: 999, hp: 999, x, y, z: 0, vz: 0, dir: -1, hitstun: 0, down: 0, attack: 0, cooldown: 9999, dead: 0, flash: 0, entered: true, frozenUntil: 0, vx: 0, kbFriction: 0, invuln: 0, stomped: false, grabbed: false, thrown: null });
    reset(); state = 'play'; waveState = 'fight'; cam = 0; time = 5; player.x = 480; player.y = 420; player.dir = 1;
    const a = mk(518, 420), c = mk(522, 425); enemies = [a, c]; player.combo = 2; player.lastHit = true; player.comboTimer = 5;
    step(1, { KeyZ: true }); step(14);
    const byFrame = {}; for (const x of made) byFrame[x.t] = (byFrame[x.t] || 0) + 1;
    return { enemiesHit: [a, c].filter(e => e.hp < 999).length, soundsMadePerFrame: Object.values(byFrame), freqs: made.map(x => x.freq) };
  })), 'errors', errors);
  await b.close();
})();
