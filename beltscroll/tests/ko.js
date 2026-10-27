const { GAME, OUT, ROOT } = require('./paths');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const errors = [];
  const p = await b.newPage(); p.on('pageerror', e => errors.push(e.message));
  await p.goto(GAME); await p.waitForTimeout(200); await p.keyboard.press('Enter');
  const r = await p.evaluate(() => { window.realUpdate = update; update = () => {}; const step = (n = 1, k = {}) => { for (let i = 0; i < n; i++) { Object.assign(pressed, k); realUpdate(); pressed = {}; k = {}; } };
    const heard = []; const orig = synth; synth = (kind) => { heard.push({ kind, t: time }); return orig(kind); };
    const mk = (x, extra = {}) => Object.assign({ type: 'thug', ...ENEMY_TYPES.thug, maxHp: 999, hp: 999, x, y: 420, z: 0, vz: 0, dir: -1, hitstun: 0, down: 0, attack: 0, cooldown: 9999, dead: 0, flash: 0, entered: true, frozenUntil: 0, vx: 0, kbFriction: 0, invuln: 0, stomped: false, grabbed: false, thrown: null }, extra);
    const fresh = () => { reset(); state = 'play'; waveState = 'fight'; cam = 0; time = 5; player.x = 480; player.y = 420; player.dir = 1; player.hp = 9999; heard.length = 0; };
    const seq = () => { const t0 = heard[0] ? heard[0].t : 0; return heard.map(h => `${h.kind}@${h.t - t0}`).join(' '); };
    const out = {};
    fresh(); { const e = mk(518, { hp: 5 }); enemies = [e, mk(900)]; step(1, { KeyZ: true }); let f = 0; while (!e.dead && f < 120) { step(); f++; } step(2); out['1타 처치'] = seq(); }
    fresh(); { const e = mk(518, { hp: 5 }); enemies = [e, mk(900)]; player.combo = 2; player.lastHit = true; player.comboTimer = 5; step(1, { KeyZ: true }); let f = 0; while (!e.dead && f < 120) { step(); f++; } out['3타 처치'] = seq(); }
    fresh(); { const e = mk(514, { hp: 15 }); enemies = [e, mk(900)]; keys.ArrowRight = true; while (!player.grab) step(); keys.ArrowRight = false; step(1, { KeyX: true }); let f = 0; while (!e.dead && f < 200) { step(); f++; } out['던져 처치'] = seq(); }
    fresh(); { const e = mk(518, { hp: 999 }); enemies = [e, mk(900)]; player.combo = 2; player.lastHit = true; player.comboTimer = 5; step(1, { KeyZ: true }); while (e.down === 0) step(); while (e.z > 0 || frozen(e)) step(); while (player.attack > 0) step();
      e.hp = 5; heard.length = 0; player.x = e.x - 30; keys.ArrowDown = true; step(1, { KeyZ: true }); keys.ArrowDown = false; let f = 0; while (!e.dead && f < 120) { step(); f++; } out['누운 적 추가타 처치'] = seq(); }
    fresh(); { const e = mk(518, { hp: 999 }); enemies = [e]; player.combo = 2; player.lastHit = true; player.comboTimer = 5; step(1, { KeyZ: true }); step(80); out['안 죽는 3타 (쓰러짐 없어야)'] = seq(); }
    return out; });
  for (const [k, v] of Object.entries(r)) console.log(k.padEnd(24), v);
  console.log(`경우 ${Object.keys(r).length} / 기대 5`, 'errors', errors); await b.close();
})();
