const { GAME, OUT, ROOT } = require('./paths');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.goto(GAME);
  await p.evaluate(() => { window.realUpdate = update; update = () => {}; window.step = (n = 1, k = {}) => { for (let i = 0; i < n; i++) { Object.assign(pressed, k); realUpdate(); pressed = {}; k = {}; } }; });
  const mk = "({ type: 'thug', ...ENEMY_TYPES.thug, maxHp: 999, hp: 999, x: 518, y: 420, z: 0, vz: 0, dir: -1, hitstun: 0, down: 0, attack: 0, cooldown: 9999, dead: 0, flash: 0, entered: true, frozenUntil: 0, vx: 0, kbFriction: 0 })";
  // 1) 선입력 창: 첫 공격의 t번째 프레임에 두 번째 Z
  for (const heavy of [false, true]) {
    const res = await p.evaluate(([heavy, mk]) => {
      const out = [];
      for (let t = 2; t <= 45; t++) {
        reset(); state = 'play'; waveState = 'fight'; enemies = [eval(mk)]; player.x = 480; player.dir = 1; cam = 0;
        if (heavy) { player.combo = 2; player.lastHit = true; player.comboTimer = 5; }
        step(1, { KeyZ: true });
        let started = null;
        for (let f = 2; f <= 60; f++) { const a0 = player.attack; step(1, f === t ? { KeyZ: true } : {}); if (f > 2 && player.attack > a0 && started === null) started = f; }
        out.push(started === null ? '.' : (t < 10 ? ' ' : '') + t);
      }
      return out;
    }, [heavy, mk]);
    const firstOk = res.findIndex(x => x !== '.') + 2;
    const lastOk = res.length - 1 - [...res].reverse().findIndex(x => x !== '.') + 2;
    console.log(heavy ? '3타' : '1타', `두 번째 Z 를 받아주는 프레임: ${firstOk}~${lastOk} (누른 프레임=1)`);
  }
  // 2) 화면 끝 heavy (디렉터 재현 상황)
  console.log(await p.evaluate((mk) => {
    reset(); state = 'play'; waveState = 'fight'; cam = 0;
    const e = eval(mk); e.x = 938; enemies = [e]; player.x = 900; player.dir = 1;
    player.combo = 2; player.lastHit = true; player.comboTimer = 5;
    step(1, { KeyZ: true });
    let maxX = 0, jump = 0, prev = e.x;
    for (let i = 0; i < 120; i++) { step(); maxX = Math.max(maxX, e.x); jump = Math.max(jump, Math.abs(e.x - prev)); prev = e.x; }
    return `화면 끝 3타: 적 최대 x ${maxX.toFixed(1)} (화면 벽 ${W - 20}), 한 프레임 최대 이동 ${jump.toFixed(1)}px`;
  }, mk));
  // 3) 겹침: 선입력해 둔 상태에서 피격 → 선입력 비워짐
  console.log(await p.evaluate((mk) => {
    reset(); state = 'play'; waveState = 'fight'; cam = 0; const e = eval(mk); enemies = [e]; player.x = 480; player.dir = 1;
    step(1, { KeyZ: true }); while (!player.lastHit) step(); step(1, { KeyZ: true });
    const buf = player.buffered; player.frozenUntil = 0; player.invuln = 0; damagePlayer(1, -1, false, null);
    return `선입력 ${buf} → 피격 뒤 ${player.buffered}`;
  }, mk));
  console.log('errors', errors); await b.close();
})();
