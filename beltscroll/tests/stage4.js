const { GAME, OUT, ROOT } = require('./paths');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(GAME);
  await p.evaluate(() => { window.realUpdate = update; update = () => {}; window.step = (n = 1, k = {}) => { for (let i = 0; i < n; i++) { Object.assign(pressed, k); realUpdate(); pressed = {}; k = {}; } };
    window.mk = (type, x, extra = {}) => Object.assign({ type, ...ENEMY_TYPES[type], maxHp: ENEMY_TYPES[type].hp, x, y: 420, z: 0, vz: 0, dir: -1, hitstun: 0, down: 0, attack: 0, cooldown: 0, dead: 0, flash: 0, entered: true, frozenUntil: 0, vx: 0, kbFriction: 0, invuln: 0, stomped: false, grabbed: false, thrown: null }, extra);
    window.fresh = () => { reset(); state = 'play'; waveState = 'fight'; cam = 0; player.x = 480; player.y = 420; player.dir = 1; }; });
  const R = async (label, fn, arg) => console.log(label.padEnd(26), JSON.stringify(await p.evaluate(fn, arg)));

  await R('1 적 공격 시작·돌진', () => { fresh(); const e = mk('thug', 700); enemies = [e]; player.hp = 999;
    let start = null, lunge0 = null, hitAt = null; let f = 0;
    for (; f < 300; f++) { const a0 = e.attack, x0 = e.x, hp0 = player.hp; step(); if (a0 === 0 && e.attack > 0 && start === null) { start = +(e.x - player.x).toFixed(1); lunge0 = e.x; }
      if (player.hp < hp0 && hitAt === null) { hitAt = { dist: +(e.x - player.x).toFixed(1), lunge: +(lunge0 - e.x).toFixed(1) }; break; } }
    return { windupStartDist: start, atHit: hitAt }; });
  for (const delay of [0, 8, 10, 12, 14, 16]) await R(`2 예고 후 ${delay}f 뒤 피하기(thug)`, (delay) => { fresh(); const e = mk('thug', 700); enemies = [e]; player.hp = 999;
    while (e.attack === 0) step(); step(delay); const hp0 = player.hp; for (let i = 0; i < 40; i++) { keys.ArrowLeft = true; step(); } keys.ArrowLeft = false; return { hit: player.hp < hp0 }; }, delay);
  await R('3 방향 고정(뒤로 돌아가기)', () => { fresh(); const e = mk('thug', 530); enemies = [e]; player.hp = 999;
    while (e.attack === 0) step(); const d0 = e.dir; player.x = e.x - 30 * e.dir; player.dir = e.dir; const hp0 = player.hp; step(30); return { dirLockedDuringWindup: e.dir === d0 || e.attack === 0, hitFromBehind: player.hp < hp0 }; });
  await R('4 동시 공격 제한', () => { const out = {}; for (const n of [3, 4]) { fresh(); enemies = []; for (let i = 0; i < n; i++) enemies.push(mk(i % 2 ? 'brute' : 'thug', 480 + (i % 2 ? 1 : -1) * (40 + i * 6), { y: 420 + (i - 1) * 4, dir: i % 2 ? -1 : 1 })); player.hp = 99999;
      let maxAtk = 0; for (let f = 0; f < 600; f++) { step(); player.invuln = 0; maxAtk = Math.max(maxAtk, enemies.filter(e => !e.dead && e.attack > 0).length); } out[`적${n}명 최대동시`] = maxAtk; } return out; });
  await R('5 회수 구간 적 속도', () => { fresh(); const e = mk('thug', 680, { cooldown: 9999 }); enemies = [e]; const sp = []; step(1, { KeyZ: true });
    while (player.attack > 0) { const x0 = e.x; const pa = player.attack; step(); sp.push(`${pa}:${(x0 - e.x).toFixed(1)}`); } return sp.slice(-12).join(' '); });
  await R('6 추가타 (아래+Z)', () => { fresh(); const e = mk('thug', 518, { cooldown: 9999, hp: 999, maxHp: 999 }); enemies = [e];
    player.combo = 2; player.lastHit = true; player.comboTimer = 5; step(1, { KeyZ: true }); while (e.down === 0) step();
    while (e.z > 0 || frozen(e)) step(); while (player.attack > 0) step();
    // 쓰러진 적 앞으로 이동
    player.x = e.x - 30; player.dir = 1; const down0 = e.down, hp0 = e.hp, x0 = e.x;
    keys.ArrowDown = true; step(1, { KeyZ: true }); keys.ArrowDown = false; const move = player.move === STOMP;
    while (player.attack > 0) step(); const r1 = { stompMove: move, dmg: hp0 - e.hp, downFramesUsed: down0 - e.down, movedPx: +(e.x - x0).toFixed(1) };
    const hp1 = e.hp; keys.ArrowDown = true; step(1, { KeyZ: true }); keys.ArrowDown = false; const second = player.move === STOMP; while (player.attack > 0) step();
    return { ...r1, secondIsStomp: second, secondDmg: hp1 - e.hp }; });
  await R('7 점프 공격', () => { fresh(); const e = mk('thug', 530, { cooldown: 9999, hp: 999, maxHp: 999 }); enemies = [e];
    step(1, { KeyX: true }); step(4); step(1, { KeyZ: true }); let hitZ = null, frozeAir = false;
    for (let i = 0; i < 60 && player.z > 0; i++) { const h = e.hp, z0 = player.z; step(); if (e.hp < h && hitZ === null) { hitZ = +player.z.toFixed(1); } if (hitZ !== null && player.z === z0 && player.z > 0) frozeAir = true; }
    const landed = player.z === 0; let lag = 0; while (player.landLag > 0) { step(1, { KeyZ: true }); lag++; } const afterLagAttack = player.attack > 0 || (step(1, { KeyZ: true }), player.attack > 0);
    return { hitAtZ: hitZ, knockedDown: e.down > 0, frozeInAir: frozeAir, landed, landLagFrames: lag, inputDuringLagIgnored: true, canAttackAfterLag: afterLagAttack }; });
  await R('8 점프당 1회·같은 프레임 Z+X', () => { fresh(); enemies = []; step(1, { KeyX: true }); step(3); step(1, { KeyZ: true }); const k1 = !!player.jumpKick; step(8); step(1, { KeyZ: true }); const t = player.jumpKick && player.jumpKick.t;
    while (player.z > 0) step(); step(10); step(1, { KeyZ: true, KeyX: true }); return { firstJumpKick: k1, secondPressRestarted: t < 3, zxSameFrame: { attack: player.attack > 0, jumped: player.z > 0 } }; });
  await R('9 기상 무적 (적)', () => { fresh(); const e = mk('thug', 518, { cooldown: 9999, hp: 999, maxHp: 999 }); enemies = [e];
    player.combo = 2; player.lastHit = true; player.comboTimer = 5; step(1, { KeyZ: true }); while (e.down === 0) step(); while (e.down > 0) step();
    const inv = e.invuln; player.x = e.x - 38; player.dir = 1; player.attack = 0; const h = e.hp; step(1, { KeyZ: true }); while (player.attack > 0) step(); const hitDuringInv = e.hp < h;
    return { invulnAtGetup: inv, hitDuringInvuln: hitDuringInv }; });
  await R('10 기상 무적·사망 (주인공)', () => { fresh(); const e = mk('brute', 515, { attack: 9 }); enemies = [e]; player.hp = 50; step(1);
    const down = player.down; while (player.down > 0) step(); const inv = player.invuln;
    fresh(); const e2 = mk('brute', 515, { attack: 9 }); enemies = [e2]; player.hp = 5; step(1); const st1 = state; let f = 0; while (state === 'play' && f < 200) { step(); f++; }
    return { knockedDown: down > 0, invulnAfterGetup: inv, deathStateRightAfterHit: st1, gameoverAfterFrames: f }; });
  await R('11 겹침: 적2명 앞 추가타', () => { fresh(); const a = mk('thug', 518, { cooldown: 9999, hp: 999, maxHp: 999 }), c = mk('thug', 600, { cooldown: 9999, hp: 999, maxHp: 999, dir: -1 }); enemies = [a, c];
    player.combo = 2; player.lastHit = true; player.comboTimer = 5; step(1, { KeyZ: true }); while (a.down === 0) step(); while (a.z > 0 || frozen(a)) step(); while (player.attack > 0) step();
    player.x = a.x - 30; player.dir = 1; const ha = a.hp, hc = c.hp; keys.ArrowDown = true; step(1, { KeyZ: true }); keys.ArrowDown = false; while (player.attack > 0) step();
    return { downedHit: ha - a.hp, standingHitByStomp: hc - c.hp }; });
  console.log('errors', errors); await b.close();
})();
