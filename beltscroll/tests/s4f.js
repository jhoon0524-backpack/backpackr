const { GAME, OUT, ROOT } = require('./paths');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(GAME);
  await p.evaluate(() => { window.realUpdate = update; update = () => {}; window.step = (n = 1, k = {}) => { for (let i = 0; i < n; i++) { Object.assign(pressed, k); realUpdate(); pressed = {}; k = {}; } };
    window.mk = (type, x, extra = {}) => Object.assign({ type, ...ENEMY_TYPES[type], maxHp: 999, hp: 999, x, y: 420, z: 0, vz: 0, dir: -1, hitstun: 0, down: 0, attack: 0, cooldown: 0, dead: 0, flash: 0, entered: false, frozenUntil: 0, vx: 0, kbFriction: 0, invuln: 0, stomped: false, grabbed: false, thrown: null }, extra);
    window.fresh = () => { reset(); state = 'play'; waveState = 'fight'; cam = 0; player.x = 480; player.y = 420; player.dir = 1; }; });
  let n = 0; const R = async (label, fn, arg) => { n++; console.log(label.padEnd(34), JSON.stringify(await p.evaluate(fn, arg))); };
  for (const side of ['right', 'left']) await R(`1 벽에 붙은 주인공(${side}) + 화면 밖 적`, (side) => { fresh(); player.hp = 9999;
    player.x = side === 'right' ? W - 20 : 20; const e = mk('thug', side === 'right' ? W + 40 : -60, { dir: side === 'right' ? -1 : 1 }); enemies = [e];
    let offscreenHits = 0, startX = null, startEntered = null, f = 0;
    for (; f < 400 && startX === null; f++) { const hp = player.hp; const wasIn = e.x >= 20 && e.x <= W - 20; step(); if (player.hp < hp && !wasIn) offscreenHits++; if (e.attack > 0) { startX = +e.x.toFixed(1); startEntered = e.entered; } }
    return { offscreenHits, windupAtX: startX, enteredAtWindup: startEntered, onScreen: startX >= 20 && startX <= W - 20, playerX: player.x, gapAtWindup: +Math.abs(player.x - startX).toFixed(1) }; }, side);
  await R('2 벽 앞 주인공 옆 서는 자리', () => { fresh(); player.x = W - 20; const e = mk('thug', W + 40, { cooldown: 9999 }); enemies = [e];
    step(400); return { enemyX: +e.x.toFixed(1), playerX: player.x, gap: +(player.x - e.x).toFixed(1) }; });
  for (const when of ['hitstop', 'falling', 'lastAirFrame', 'beforeHit']) await R(`3 점프 공격 뒤 공중 Z (${when})`, (when) => { fresh();
    const e = mk('thug', 530, { cooldown: 9999, entered: true }); enemies = [e];
    step(1, { KeyX: true }); step(4); step(1, { KeyZ: true });
    if (when === 'beforeHit') { step(1); step(1, { KeyZ: true }); }
    while (!(player.jumpKick && player.jumpKick.hit) && player.z > 0) step();
    if (when === 'hitstop') step(1, { KeyZ: true });
    if (when === 'falling') { while (frozen(player)) step(); step(3); step(1, { KeyZ: true }); }
    if (when === 'lastAirFrame') { while (player.z > 0 && player.z + player.vz > 0) step(); step(1, { KeyZ: true }); }
    let f = 0, landed = null; while (player.attack === 0 && f < 80) { if (player.z === 0 && landed === null) landed = f; step(); f++; }
    return { buffered: player.attack > 0, attackStartsAfterLanding: landed === null ? null : f - landed, combo: player.combo }; }, when);
  await R('4 추가타 포즈', () => { fresh(); const e = mk('thug', 518, { cooldown: 9999, entered: true }); enemies = [e];
    player.combo = 2; player.lastHit = true; player.comboTimer = 5; step(1, { KeyZ: true }); while (e.down === 0) step(); while (e.z > 0 || frozen(e)) step(); while (player.attack > 0) step();
    player.x = e.x - 30; keys.ArrowDown = true; step(1, { KeyZ: true }); keys.ArrowDown = false; const poses = new Set(); while (player.attack > 0) { poses.add(frameName(player, true)); step(); } return [...poses]; });
  console.log(`측정 ${n} / 기대 8 (1 두 방향 + 2 + 3 네 가지 + 4)`, 'errors', errors); await b.close();
})();
