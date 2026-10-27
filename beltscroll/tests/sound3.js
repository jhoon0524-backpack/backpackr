const { GAME, OUT, ROOT } = require('./paths');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage(); const errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.goto(GAME); await p.waitForTimeout(200);
  await p.keyboard.press('Enter');
  const r = await p.evaluate(() => {
    window.realUpdate = update; update = () => {}; const step = (n = 1, k = {}) => { for (let i = 0; i < n; i++) { Object.assign(pressed, k); realUpdate(); pressed = {}; k = {}; } };
    const made = []; const orig = audio.createOscillator.bind(audio); audio.createOscillator = () => { const o = orig(); const f = o.frequency.setValueAtTime.bind(o.frequency); o.frequency.setValueAtTime = (v, t) => { made.push({ t: time, freq: v }); return f(v, t); }; return o; };
    const mk = (x, y, hp) => Object.assign({ type: 'thug', ...ENEMY_TYPES.thug, maxHp: 999, hp, x, y, z: 0, vz: 0, dir: -1, hitstun: 0, down: 0, attack: 0, cooldown: 9999, dead: 0, flash: 0, entered: true, frozenUntil: 0, vx: 0, kbFriction: 0, invuln: 0, stomped: false, grabbed: false, thrown: null });
    const out = {};
    for (const killFirst of [true, false]) {   // 1타로 2명 동시 명중, 처치되는 적이 배열 앞/뒤
      reset(); state = 'play'; waveState = 'fight'; cam = 0; time = 5; player.x = 480; player.y = 420; player.dir = 1;
      const a = mk(518, 420, killFirst ? 5 : 999), c = mk(522, 425, killFirst ? 999 : 5); enemies = [a, c];
      made.length = 0; step(1, { KeyZ: true }); step(10);
      out[killFirst ? '처치 적이 앞' : '처치 적이 뒤'] = made.map(x => x.freq).join(',');
    }
    // 재시작 직후 같은 프레임 번호에서 타격
    reset(); state = 'play'; waveState = 'fight'; cam = 0; player.x = 480; player.y = 420; player.dir = 1;
    enemies = [mk(518, 420, 999)]; made.length = 0; step(1, { KeyZ: true }); step(10); out['재시작 뒤 첫 타격'] = made.map(x => x.freq).join(',');
    reset(); state = 'play'; waveState = 'fight'; cam = 0; player.x = 480; player.y = 420; player.dir = 1;
    enemies = [mk(518, 420, 999)]; made.length = 0; step(1, { KeyZ: true }); step(10); out['한 번 더 재시작 (같은 프레임 번호)'] = made.map(x => x.freq).join(',');
    return out;
  });
  console.log(JSON.stringify(r), '경우', Object.keys(r).length, '/ 기대 4', 'errors', errors);
  await b.close();
})();
