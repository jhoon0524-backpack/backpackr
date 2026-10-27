const { GAME, OUT, ROOT } = require('./paths');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(GAME);
  await p.evaluate(() => { window.realUpdate = update; update = () => {}; window.step = (n = 1, k = {}) => { for (let i = 0; i < n; i++) { Object.assign(pressed, k); realUpdate(); pressed = {}; k = {}; } };
    window.mk = (type, x, extra = {}) => Object.assign({ type, ...ENEMY_TYPES[type], maxHp: 999, hp: 999, x, y: 420, z: 0, vz: 0, dir: -1, hitstun: 0, down: 0, attack: 0, cooldown: 9999, dead: 0, flash: 0, entered: true, frozenUntil: 0, vx: 0, kbFriction: 0, invuln: 0, stomped: false, grabbed: false, thrown: null }, extra);
    window.fresh = () => { reset(); state = 'play'; waveState = 'fight'; cam = 0; time = 5; player.x = 480; player.y = 420; player.dir = 1; player.hp = 9999; };
    window.grabAt = (e) => { player.x = e.x - 36; keys.ArrowRight = true; let f = 0; while (!player.grab && f < 60) { step(); f++; } keys.ArrowRight = false; return f; }; });
  let n = 0; const R = async (label, fn) => { n++; console.log(label.padEnd(28), JSON.stringify(await p.evaluate(fn))); };
  const seq = () => { const out = []; let last = null, c = 0; return { push(x) { if (x === last) c++; else { if (last !== null) out.push(`${last}×${c}`); last = x; c = 1; } }, done() { if (last !== null) out.push(`${last}×${c}`); return out.join(' '); } }; };
  for (const lethal of [false, true]) await R(`1 ${lethal ? '처치' : '3번째'} 무릎 뒤 포즈·행동`, (lethal) => { fresh(); const e = mk('thug', 520, lethal ? { hp: 8, maxHp: 30 } : {}); enemies = [e]; grabAt(e);
    if (!lethal) { step(1, { KeyZ: true }); step(17); step(1, { KeyZ: true }); step(17); }
    step(1, { KeyZ: true }); while (player.grab) step();
    const poses = []; let blocked = 0; for (let i = 0; i < 24; i++) { poses.push(frameName(player, true)); const a0 = player.attack; step(1, { KeyZ: true }); if (player.attack === 0 && a0 === 0) blocked++; else break; }
    const out = []; let last = null, c = 0; for (const x of poses) { if (x === last) c++; else { if (last) out.push(`${last}×${c}`); last = x; c = 1; } } out.push(`${last}×${c}`);
    return { posesAfterRelease: out.join(' '), framesUntilNextAttack: blocked + 1 }; }, lethal);
  await R('2 던지기 앞 회수', () => { fresh(); const e = mk('thug', 520); enemies = [e]; grabAt(e); step(1, { KeyX: true });
    const poses = []; for (let i = 0; i < 20; i++) { poses.push(frameName(player, true)); step(); }
    const out = []; let last = null, c = 0; for (const x of poses) { if (x === last) c++; else { if (last) out.push(`${last}×${c}`); last = x; c = 1; } } out.push(`${last}×${c}`); return out.join(' '); });
  await R('3 뒤로 던지기 적 이동', () => { fresh(); const e = mk('thug', 520); enemies = [e]; grabAt(e); const d = []; let px = e.x;
    keys.ArrowLeft = true; step(1, { KeyX: true }); keys.ArrowLeft = false; d.push(+(e.x - px).toFixed(1)); px = e.x;
    for (let i = 0; i < 8; i++) { step(); d.push(+(e.x - px).toFixed(1)); px = e.x; } return { perFrameDx: d.join(','), maxAbs: Math.max(...d.map(Math.abs)), playerDirAfter: player.dir }; });
  await R('4 가장 가까운 적을 잡음', () => { fresh(); const far = mk('thug', 512, { y: 430 }), near = mk('thug', 507, { y: 420 }); enemies = [far, near]; player.x = 480;
    keys.ArrowRight = true; let f = 0; while (!player.grab && f < 40) { step(); f++; } keys.ArrowRight = false; return { grabbedNear: player.grab && player.grab.e === near }; });
  await R('5 잡는 프레임에 누른 Z', () => { fresh(); const e = mk('thug', 514); enemies = [e]; keys.ArrowRight = true; while (player.grabPush < GRAB.pushFrames - 1) step(); step(1, { KeyZ: true }); keys.ArrowRight = false;
    const hp = e.hp; step(8); return { grabbed: !!player.grab, firstKneeHit: e.hp < hp }; });
  console.log(`측정 ${n} / 기대 6`, 'errors', errors); await b.close();
})();
