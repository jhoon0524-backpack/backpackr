// 주인공 위치를 양쪽 벽에서 1px씩 옮기며: 적이 결국 화면 안에서 공격하는가, 화면 밖 피격 0인가
const { GAME, OUT, ROOT } = require('./paths');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(GAME);
  await p.evaluate(() => { window.realUpdate = update; update = () => {}; window.step = (n = 1, k = {}) => { for (let i = 0; i < n; i++) { Object.assign(pressed, k); realUpdate(); pressed = {}; k = {}; } }; });
  const r = await p.evaluate(() => {
    const out = { cases: 0, noAttack: [], offHit: [], maxStart: 0 };
    for (const side of [1, -1]) for (let d = 20; d <= 100; d++) for (const type of ['thug', 'brute']) {
      reset(); state = 'play'; waveState = 'fight'; cam = 0; player.hp = 99999; player.y = 420;
      player.x = side > 0 ? W - d : d;
      const e = Object.assign({ type, ...ENEMY_TYPES[type], maxHp: 999, hp: 999, x: side > 0 ? W + 40 : -60, y: 420, z: 0, vz: 0, dir: -side, hitstun: 0, down: 0, attack: 0, cooldown: 0, dead: 0, flash: 0, entered: false, frozenUntil: 0, vx: 0, kbFriction: 0, invuln: 0, stomped: false });
      enemies = [e]; out.cases++;
      let started = null;
      for (let f = 0; f < 400; f++) { const hp = player.hp, inScreen = e.x >= 20 && e.x <= W - 20; step(); player.x = side > 0 ? W - d : d; if (player.hp < hp && !inScreen) out.offHit.push(`${side > 0 ? 'R' : 'L'}${d}${type[0]}`); if (e.attack > 0 && started === null) started = f; }
      if (started === null) out.noAttack.push(`${side > 0 ? 'R' : 'L'}${d}${type[0]}`); else out.maxStart = Math.max(out.maxStart, started);
    }
    return out;
  });
  console.log(`경우 ${r.cases} / 기대 ${2 * 81 * 2}`, '공격 못한 경우', r.noAttack.length, r.noAttack.slice(0, 10).join(','), '| 화면 밖 피격', r.offHit.length, '| 준비까지 최대 프레임', r.maxStart, '| errors', errors.length);
  await b.close();
})();
