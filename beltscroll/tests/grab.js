const { GAME, OUT, ROOT } = require('./paths');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(GAME);
  await p.evaluate(() => { window.realUpdate = update; update = () => {}; window.step = (n = 1, k = {}) => { for (let i = 0; i < n; i++) { Object.assign(pressed, k); realUpdate(); pressed = {}; k = {}; } };
    window.mk = (type, x, extra = {}) => Object.assign({ type, ...ENEMY_TYPES[type], maxHp: 999, hp: 999, x, y: 420, z: 0, vz: 0, dir: -1, hitstun: 0, down: 0, attack: 0, cooldown: 9999, dead: 0, flash: 0, entered: true, frozenUntil: 0, vx: 0, kbFriction: 0, invuln: 0, stomped: false, grabbed: false, thrown: null }, extra);
    window.fresh = () => { reset(); state = 'play'; waveState = 'fight'; cam = 0; player.x = 480; player.y = 420; player.dir = 1; player.hp = 9999; };
    window.push = (n, dir = 1) => { const k = dir > 0 ? 'ArrowRight' : 'ArrowLeft'; keys[k] = true; for (let i = 0; i < n && !player.grab; i++) step(); const f = player.grab ? 1 : 0; keys[k] = false; return f; };
    window.grabAt = (e) => { player.x = e.x - 36; keys.ArrowRight = true; let f = 0; while (!player.grab && f < 60) { step(); f++; } keys.ArrowRight = false; return f; }; });
  let n = 0; const R = async (label, fn, arg) => { n++; console.log(label.padEnd(30), JSON.stringify(await p.evaluate(fn, arg))); };
  for (const frames of [7, 8]) await R(`1 밀기 ${frames}프레임`, (frames) => { fresh(); const e = mk('thug', 514); enemies = [e];
    keys.ArrowRight = true; let minGap = 99; for (let i = 0; i < frames; i++) { step(); minGap = Math.min(minGap, e.x - player.x); } keys.ArrowRight = false;
    return { grabbed: !!player.grab, closestGap: +minGap.toFixed(1) }; }, frames);
  for (const d of [34, 34.5, 35]) await R(`1 거리 ${d}px 잡기 대상?`, (d) => { fresh(); const e = mk('thug', 480 + d); enemies = [e]; time = 5; return { canGrab: canGrab(player, e) }; }, d);
  await R('1 공격 준비 중인 적', () => { fresh(); const e = mk('thug', 514, { attack: 20 }); enemies = [e]; keys.ArrowRight = true; step(10); keys.ArrowRight = false; return { grabbed: !!player.grab }; });
  await R('2 1타 뒤 밀어서 잡기', () => { fresh(); const e = mk('thug', 518); enemies = [e]; step(1, { KeyZ: true }); while (!player.lastHit) step(); while (player.attack > 0) step();
    const hs = e.hitstun; const f = grabAt(e); return { enemyHitstunWhenStarted: hs > 0, grabbed: !!player.grab, frames: f }; });
  await R('3 잡힌 적: 위치·공격 못함', () => { fresh(); const e = mk('thug', 520, { cooldown: 0 }); enemies = [e]; e.cooldown = 9999; grabAt(e); e.cooldown = 0;
    let maxOff = 0, attacked = false; for (let i = 0; i < 60; i++) { step(); if (!player.grab) break; maxOff = Math.max(maxOff, Math.abs((e.x - player.x) - player.dir * GRAB.holdDist)); if (e.attack > 0) attacked = true; }
    return { stillHeld: !!player.grab, offsetFromHoldPx: maxOff, enemyAttacked: attacked }; });
  await R('3 잡는 중 다른 적에게 맞음', () => { fresh(); const e = mk('thug', 520), o = mk('thug', 440, { dir: 1, cooldown: 9999 }); enemies = [e, o]; grabAt(e); o.x = player.x - 30; o.attack = 9; o.dir = 1;
    const hp = player.hp; step(2); return { playerHit: player.hp < hp, grabReleased: !player.grab, enemyFreed: !e.grabbed }; });
  await R('4 무릎 3번 (대기 입력)', () => { fresh(); const e = mk('thug', 520); enemies = [e]; grabAt(e);
    const dmg = []; let hp = e.hp; const startF = []; let f = 0;
    for (; f < 120 && (player.grab || f < 3); f++) { step(1, { KeyZ: true }); if (e.hp < hp) { dmg.push(hp - e.hp); hp = e.hp; startF.push(f); } }
    return { dmg, hitFrames: startF, released: !player.grab, knockedDown: e.down > 0 }; });
  for (const back of [false, true]) await R(`5 던지기 ${back ? '뒤로' : '앞으로'}`, (back) => { fresh(); const e = mk('thug', 520); enemies = [e]; grabAt(e); const x0 = player.x;
    if (back) keys.ArrowLeft = true; step(1, { KeyX: true }); keys.ArrowLeft = false;
    const hp = e.hp, ex0 = e.x; let landF = null, f = 0, recov = 0, maxD = 0; for (; f < 120; f++) { step(); if (player.afterGrab) recov++; if (landF === null && e.hp < hp) landF = f; maxD = Math.max(maxD, Math.abs(e.x - ex0)); }
    return { side: Math.sign(e.x - x0), flewPx: +maxD.toFixed(1), landDmg: hp - e.hp, landedAtFrame: landF, playerRecoverFrames: recov, down: e.down > 0 || e.invuln > 0 }; }, back);
  await R('6 던진 적에 부딪힌 적', () => { fresh(); const e = mk('thug', 520), o = mk('brute', 600, { cooldown: 9999 }), o2 = mk('thug', 640, { cooldown: 9999 }); enemies = [e, o, o2]; grabAt(e);
    const ho = o.hp, ho2 = o2.hp; step(1, { KeyX: true }); step(80); return { brute: { dmg: ho - o.hp, knocked: o.down > 0 || o.invuln > 0 }, thug2: { dmg: ho2 - o2.hp } }; });
  await R('7 벽 앞에서 잡기', () => { fresh(); player.x = W - 60; const e = mk('thug', W - 25); enemies = [e]; keys.ArrowRight = true; let f = 0; while (!player.grab && f < 40) { step(); f++; } step(5); keys.ArrowRight = false;
    return { grabbed: !!player.grab, enemyX: +e.x.toFixed(1), wall: W - 20, gap: +(e.x - player.x).toFixed(1) }; });
  await R('8 빠져나감 (100프레임)', () => { fresh(); const e = mk('thug', 520); enemies = [e]; grabAt(e); let f = 0; while (player.grab && f < 200) { step(); f++; } return { escapedAfter: f, gapAfter10: (step(10), +(e.x - player.x).toFixed(1)) }; });
  await R('9 무릎으로 처치', () => { fresh(); const e = mk('thug', 520, { hp: 8, maxHp: 30 }); enemies = [e]; grabAt(e); step(1, { KeyZ: true }); step(10);
    return { released: !player.grab, down: e.down > 0, flash: e.flash }; });
  console.log(`측정 ${n} / 기대 16 (1번 6개 + 2·3a·3b·4·5×2·6·7·8·9 10개)`, 'errors', errors); await b.close();
})();
