const { GAME, OUT, ROOT } = require('./paths');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.goto(GAME);
  await p.evaluate(() => { window.realUpdate = update; update = () => {}; window.step = (n = 1, k = {}) => { for (let i = 0; i < n; i++) { Object.assign(pressed, k); realUpdate(); pressed = {}; k = {}; } }; });
  const mk = (x) => ({ type: 'thug', ...ENEMY_TYPES.thug, maxHp: 999, hp: 999, x, y: 420, z: 0, vz: 0, dir: -1, hitstun: 0, down: 0, attack: 0, cooldown: 9999, dead: 0, flash: 0, entered: true, frozenUntil: 0, vx: 0, kbFriction: 0, invuln: 0, stomped: false });
  // 1) 적 2명이 겹친 상태에서 3타(heavy): 멈춤 동안 맞은 적이 움직이면 안 된다
  for (const heavy of [false, true]) console.log(await p.evaluate(([heavy, mkS]) => {
    const mk = eval(mkS);
    reset(); state = 'play'; waveState = 'fight';
    enemies = [mk(518), mk(530)];
    player.x = 480; player.dir = 1; cam = 0;
    if (heavy) { player.combo = 2; player.lastHit = true; player.comboTimer = 5; }
    const e = enemies[0]; const h = e.hp; step(1, { KeyZ: true }); while (e.hp === h) step();
    const xs = [e.x]; let fr = 0; while (true) { step(); if (!frozen(e)) break; xs.push(e.x); fr++; }
    const moved = Math.max(...xs) - Math.min(...xs);
    return `${heavy ? 'heavy' : 'normal'} 적 2명 겹침: 멈춤 ${fr}프레임 동안 맞은 적 이동 ${moved.toFixed(1)}px`;
  }, [heavy, mk.toString()]));
  // 2) 맞자마자 게임오버: 킥이 남으면 안 된다
  console.log(await p.evaluate((mkS) => {
    const mk = eval(mkS);
    reset(); state = 'play'; waveState = 'fight';
    const e = mk(515); e.attack = 9; enemies = [e]; player.x = 480; player.hp = 5; cam = 0;
    step(1); const s0 = state; step(120);
    return `게임오버 전환: ${s0}, 120프레임 뒤 카메라 킥 ${camKick ? '남음 t=' + camKick.t : '없음'}`;
  }, mk.toString()));
  // 3) 맞는 첫 프레임 그려지는 킥 크기
  console.log(await p.evaluate((mkS) => {
    const mk = eval(mkS);
    reset(); state = 'play'; waveState = 'fight'; enemies = [mk(518)]; player.x = 480; player.dir = 1; cam = 0;
    player.combo = 2; player.lastHit = true; player.comboTimer = 5;
    const e = enemies[0]; const h = e.hp; step(1, { KeyZ: true }); while (e.hp === h) step();
    const xs = []; for (let i = 0; i < 10; i++) { xs.push(camKick ? Math.round(camKick.dir * camKick.amp * (1 - camKick.t / camKick.dur)) : 0); step(); }
    return 'heavy 명중 프레임부터 그려지는 킥 px: ' + xs.join(',');
  }, mk.toString()));
  console.log('errors', errors);
  await b.close();
})();
