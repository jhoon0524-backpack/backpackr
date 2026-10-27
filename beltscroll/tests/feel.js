const { GAME, OUT, ROOT } = require('./paths');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.goto(GAME);
  await p.evaluate(() => { window.realUpdate = update; update = () => {}; window.step = (n = 1, k = {}) => { for (let i = 0; i < n; i++) { Object.assign(pressed, k); realUpdate(); pressed = {}; k = {}; } }; });
  const measure = (label, setup) => p.evaluate(([label, setup]) => {
    reset(); state = 'play'; waveState = 'fight'; debug.feel = 'auto';
    const t = ENEMY_TYPES.thug;
    enemies = [{ type: 'thug', ...t, maxHp: 999, hp: 999, x: 517, y: 420, z: 0, vz: 0, dir: -1, hitstun: 0, down: 0, attack: 0, cooldown: 9999, dead: 0, flash: 0, entered: true, frozenUntil: 0, vx: 0, kbFriction: 0, invuln: 0, stomped: false }];
    player.x = 480; player.dir = 1; cam = 0;
    const e = enemies[0];
    eval(setup);
    // setup 이 정한 공격을 낸다
    const h0 = e.hp; let f = 0;
    while (e.hp === h0 && f < 60) { step(f === 0 ? 1 : 1, f === 0 ? { KeyZ: true } : {}); f++; }
    const x0 = e.x, hitAt = f;
    const r = { label, enemyFrozenUntil: e.frozenUntil - time, playerFrozenUntil: player.frozenUntil - time, flash: e.flash, kickAmp: camKick && camKick.amp, kickFrames: camKick && camKick.dur };
    // 멈춤 프레임 실측: 적 x 가 변하기 시작할 때까지
    let still = 0; while (e.x === x0 && still < 40) { step(); still++; }
    let n = 0; while ((e.vx !== 0 || frozen(e)) && n < 200) { step(); n++; }
    r.measuredStill = still; r.slideFrames = n + 1; r.knockbackPx = +(Math.abs(e.x - x0)).toFixed(1);
    return r;
  }, [label, setup]);
  console.log(JSON.stringify(await measure('1타 (normal)', '')));
  console.log(JSON.stringify(await measure('3타 (heavy)', 'player.combo = 2; player.lastHit = true; player.comboTimer = 5;')));
  console.log(JSON.stringify(await measure('1타로 처치 (heavy, 번쩍임 2배)', 'e.hp = 5;')));
  // 플레이어 피격
  const ph = await p.evaluate(() => {
    reset(); state = 'play'; waveState = 'fight';
    enemies = [{ type: 'thug', ...ENEMY_TYPES.thug, maxHp: 30, hp: 30, x: 515, y: 420, z: 0, vz: 0, dir: -1, hitstun: 0, down: 0, attack: 9, cooldown: 999, dead: 0, flash: 0, entered: true, frozenUntil: 0, vx: 0, kbFriction: 0, invuln: 0, stomped: false }];
    player.x = 480; cam = 0; const x0 = player.x; const hp0 = player.hp;
    step(1);
    const r = { hpLost: hp0 - player.hp, playerFrozen: player.frozenUntil - time, enemyFrozen: enemies[0].frozenUntil - time, flash: player.flash, kick: camKick && camKick.amp };
    step(60); r.knockbackPx = +Math.abs(player.x - x0).toFixed(1); return r;
  });
  console.log('플레이어 피격(thug)', JSON.stringify(ph));
  // 카메라 킥 궤적
  const kick = await p.evaluate(() => { reset(); state = 'play'; camKick = { dir: 1, amp: FEEL.heavy.kick, dur: FEEL.heavy.kickFrames, t: 0 }; const xs = []; while (camKick) { xs.push(Math.round(camKick.dir * camKick.amp * (1 - camKick.t / camKick.dur))); step(); } return xs.join(','); });
  console.log('heavy 카메라 킥 px 프레임별:', kick);
  const kickN = await p.evaluate(() => { reset(); state = 'play'; camKick = { dir: 1, amp: FEEL.normal.kick, dur: FEEL.normal.kickFrames, t: 0 }; const xs = []; while (camKick) { xs.push(Math.round(camKick.dir * camKick.amp * (1 - camKick.t / camKick.dur))); step(); } return xs.join(','); });
  console.log('normal 카메라 킥 px 프레임별:', kickN);
  // 1타 명중 → 2타 명중 간격 (실제 프레임)
  const gap = await p.evaluate(() => {
    reset(); state = 'play'; waveState = 'fight';
    enemies = [{ type: 'thug', ...ENEMY_TYPES.thug, maxHp: 999, hp: 999, x: 518, y: 420, z: 0, vz: 0, dir: -1, hitstun: 0, down: 0, attack: 0, cooldown: 9999, dead: 0, flash: 0, entered: true, frozenUntil: 0, vx: 0, kbFriction: 0, invuln: 0, stomped: false }];
    player.x = 480; player.dir = 1; cam = 0;
    const hits = []; let f = 0; const e = enemies[0];
    step(1, { KeyZ: true });
    for (; f < 120 && hits.length < 3; f++) { const h = e.hp; step(1, (player.attack > 0 && player.attack <= 8 && !player.buffered) ? { KeyZ: true } : {}); if (e.hp < h) hits.push(f + 2); }
    return hits.join(',');
  });
  console.log('최속 연타 명중 프레임 (누른 프레임=1):', gap);
  console.log('errors', errors);
  await b.close();
})();
