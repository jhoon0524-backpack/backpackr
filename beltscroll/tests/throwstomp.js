const { GAME, OUT, ROOT } = require('./paths');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(GAME);
  await p.evaluate(() => { window.realUpdate = update; update = () => {}; window.step = (n = 1, k = {}) => { for (let i = 0; i < n; i++) { Object.assign(pressed, k); realUpdate(); pressed = {}; k = {}; } };
    window.mk = (type, x, extra = {}) => Object.assign({ type, ...ENEMY_TYPES[type], maxHp: 999, hp: 999, x, y: 420, z: 0, vz: 0, dir: -1, hitstun: 0, down: 0, attack: 0, cooldown: 9999, dead: 0, flash: 0, entered: true, frozenUntil: 0, vx: 0, kbFriction: 0, invuln: 0, stomped: false, grabbed: false, thrown: null }, extra);
    window.fresh = () => { reset(); state = 'play'; waveState = 'fight'; cam = 0; time = 5; player.x = 400; player.y = 420; player.dir = 1; player.hp = 9999; }; });
  let n = 0; const R = async (label, fn, arg) => { n++; console.log(label.padEnd(30), JSON.stringify(await p.evaluate(fn, arg))); };
  // 실제 조작 순서: 잡기 → 던지기 → (회수 끝나면) 오른쪽으로 걸어가며 → 닿으면 아래+Z
  for (const type of ['thug', 'brute']) for (const back of [false, true]) await R(`${type} ${back ? '뒤로' : '앞으로'} 던지고 달려가 내려찍기`, ([type, back]) => { fresh();
    const e = mk(type, 436); enemies = [e]; if (back) { player.x = 500; e.x = 536; }
    keys.ArrowRight = true; while (!player.grab) step(); keys.ArrowRight = false;
    if (back) keys.ArrowLeft = true; step(1, { KeyX: true }); keys.ArrowLeft = false;
    while (!e.thrown) step();   // 손을 놓을 때까지 (준비 6프레임)
    while (e.thrown) step();    // 착지까지
    const downAtLanding = e.down;
    let landed = 0, f = 0;
    for (; f < 200; f++) {
            const dir = Math.sign(e.x - player.x) || 1; const toward = dir > 0 ? 'ArrowRight' : 'ArrowLeft';
      const reach = Math.abs(e.x - player.x) < STOMP.reach - 8;
      keys.ArrowRight = keys.ArrowLeft = false;
      if (!reach) keys[toward] = true; else player.dir = dir;
      if (reach && player.attack === 0 && !player.afterGrab) { keys.ArrowDown = true; const h = e.hp; step(1, { KeyZ: true }); keys.ArrowDown = false; const move = player.move;
        while (player.attack > 0) step(); keys.ArrowRight = keys.ArrowLeft = false; return { downAtLanding, stompHit: e.hp < h, wasStomp: move === STOMP, downLeftAtStomp: e.down, framesAfterLanding: f - landed }; }
      step();
    }
    keys.ArrowRight = keys.ArrowLeft = false; return { stompHit: false, enemyDown: e.down }; }, [type, back]);
  await R('던지기 착지 처치 → 다운 끝에 사라짐', () => { fresh(); const e = mk('thug', 436, { hp: 15, maxHp: 30 }); enemies = [e]; keys.ArrowRight = true; while (!player.grab) step(); keys.ArrowRight = false; step(1, { KeyX: true });
    while (!e.thrown) step(); while (e.thrown) step(); const downAtLanding = e.down; let f = 0; while (!e.dead && f < 120) { step(); f++; } return { downAtLanding, deadAfter: f, dead: !!e.dead }; });
  console.log(`측정 ${n} / 기대 5`, 'errors', errors); await b.close();
})();
