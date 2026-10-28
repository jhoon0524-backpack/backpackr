// 물러나 피하기: 적이 공격 예고를 시작한 뒤 몇 프레임 안에 뒤로 물러나기 시작하면 피하는지 (원귀·도깨비, 0~40프레임)
// 예전 버전과 비교: BEFORE_URL=file:///.../index.html node dodge.js
const { GAME } = require('./paths');
const { chromium } = require('playwright');
const BEFORE = process.env.BEFORE_URL;
(async () => {
  const b = await chromium.launch();
  for (const [label, url] of [...(BEFORE ? [['예전', BEFORE]] : []), ['지금', GAME]]) {
    const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(url); await p.waitForTimeout(300);
    const r = await p.evaluate(() => {
      window.realUpdate = update; update = () => {};
      const step = (n = 1) => { for (let i = 0; i < n; i++) realUpdate(); };
      const mk = (type, x) => Object.assign({ type, ...ENEMY_TYPES[type], maxHp: 999, hp: 999, x, y: 420, z: 0, vz: 0, dir: -1, hitstun: 0, down: 0, attack: 0, cooldown: 0, dead: 0, flash: 0, entered: true, frozenUntil: 0, vx: 0, kbFriction: 0, invuln: 0, stomped: false, grabbed: false, thrown: null });
      const out = {};
      for (const type of ['thug', 'brute']) {
        let lastDodge = -1, startDist = null; const res = [];
        for (let d = 0; d <= 40; d++) {
          reset(); state = 'play'; waveState = 'fight'; cam = 0; time = 5; player.x = 480; player.y = 420; player.dir = 1; player.hp = 999;
          const e = mk(type, 700); enemies = [e];
          let g = 0; while (e.attack === 0 && g < 600) { step(); g++; }
          startDist = Math.round(Math.abs(e.x - player.x));
          step(d); const hp0 = player.hp;
          for (let i = 0; i < 60; i++) { keys.ArrowLeft = true; step(); } keys.ArrowLeft = false;
          const hit = player.hp < hp0; res.push(hit ? 'X' : 'o');
        }
        lastDodge = res.indexOf('X') - 1;   // 처음 맞는 프레임 바로 앞 (그 뒤 o 는 이미 맞은 다음이라 셈 안 함)
        out[type] = { 예고_시작_거리: startDist, 예고_길이: ENEMY_TYPES[type].windup, 피할_수_있는_마지막_프레임: lastDodge, '0~40': res.join('') };
      }
      return out;
    });
    console.log(`[${label}]`, JSON.stringify(r), errs.length ? errs : ''); await p.close();
  }
  await b.close();
})();
