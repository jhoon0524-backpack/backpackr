const { GAME, OUT, ROOT } = require('./paths');
const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  const errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.goto(GAME);
  await p.evaluate(() => { window.realUpdate = update; update = () => {}; window.step = (n = 1, k = {}) => { for (let i = 0; i < n; i++) { Object.assign(pressed, k); realUpdate(); pressed = {}; k = {}; } }; });
  // rhythm: 다음 Z 를 누르는 시점. 'early' = 공격 끝나기 8프레임 전, 'end' = 끝난 직후, 'late' = 끝나고 10프레임 뒤
  for (const type of ['thug', 'brute']) for (const cd of ['still', 'counter']) for (const rhythm of ['hitstop', 'early', 'end', 'late']) for (const side of [1, -1]) {
    const r = await p.evaluate(([type, cd, rhythm, side]) => {
      reset(); state = 'play'; waveState = 'fight';
      const t = ENEMY_TYPES[type];
      enemies = [{ type, ...t, maxHp: 999, hp: 999, x: player.x + side * 220, y: player.y + 6, z: 0, vz: 0, dir: -side, hitstun: 0, down: 0, attack: 0, cooldown: 9999, frozenUntil: 0, vx: 0, kbFriction: 0, invuln: 0, stomped: false, dead: 0, flash: 0, entered: true }];
      player.x = 480; enemies[0].x = 480 + side * 220; player.hp = 99999; player.dir = side;
      const e = enemies[0];
      let stop = null;
      for (let i = 0; i < 400; i++) { const ox = e.x; step(); if (e.attack > 0 || Math.abs(e.x - ox) < 0.01) { stop = Math.abs(e.x - player.x); break; } }
      e.attack = 0; e.cooldown = cd === 'counter' ? 0 : 9999;
      const hp0 = player.hp;
      const res = [];
      let pending = 1, wait = 0;
      step(1, { KeyZ: true });
      for (let f = 0; f < 200 && res.length < 3; f++) {
        const before = { hp: e.hp, misses: debug.misses, hits: debug.hits };
        let k = {};
        if (pending < 3) {
          const ready = rhythm === 'hitstop' ? (player.attack > 0 && frozen(player) && !player.buffered) : rhythm === 'early' ? (player.attack > 0 && player.attack <= 8 && !player.buffered)
                      : rhythm === 'end' ? (player.attack === 0)
                      : (player.attack === 0 && ++wait > 10);
          if (ready) { k = { KeyZ: true }; pending++; wait = 0; }
        }
        step(1, k);
        if (debug.hits > before.hits || debug.misses > before.misses) res.push((debug.hits > before.hits ? 'O' : 'X') + player.combo + '@' + Math.abs(e.x - player.x).toFixed(0));
      }
      return { stop: +stop.toFixed(1), res: res.join(' '), hurt: hp0 - player.hp };
    }, [type, cd, rhythm, side]);
    console.log(type.padEnd(5), cd.padEnd(7), rhythm.padEnd(5), side > 0 ? 'R' : 'L', 'stop', r.stop, '|', r.res, '| 피격', r.hurt);
  }
  // 헛스윙하면 1타로 돌아가는지
  const whiff = await p.evaluate(() => {
    reset(); state = 'play'; waveState = 'fight'; enemies = [];
    const combos = [];
    for (let i = 0; i < 3; i++) { step(1, { KeyZ: true }); combos.push(player.combo); step(30); }
    return combos.join(',');
  });
  console.log('허공 3연타 콤보 단계:', whiff);
  console.log('errors', errors);
  await b.close();
})();
