const { GAME, OUT, ROOT } = require('./paths');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(GAME);
  await p.evaluate(() => { window.realUpdate = update; update = () => {}; window.step = (n = 1, k = {}) => { for (let i = 0; i < n; i++) { Object.assign(pressed, k); realUpdate(); pressed = {}; k = {}; } };
    window.mk = (type, x, extra = {}) => Object.assign({ type, ...ENEMY_TYPES[type], maxHp: 999, hp: 999, x, y: 420, z: 0, vz: 0, dir: -1, hitstun: 0, down: 0, attack: 0, cooldown: 9999, dead: 0, flash: 0, entered: true, frozenUntil: 0, vx: 0, kbFriction: 0, invuln: 0, stomped: false, grabbed: false, thrown: null }, extra);
    window.fresh = () => { reset(); state = 'play'; waveState = 'fight'; cam = 0; player.x = 480; player.y = 420; player.dir = 1; }; });
  let cases = 0;
  const R = async (label, fn, arg) => { cases++; console.log(label.padEnd(30), JSON.stringify(await p.evaluate(fn, arg))); };
  for (const left of [6, 5, 3, 1]) await R(`A 착지 경직 ${left} 남았을 때 Z`, (left) => { fresh(); enemies = [];
    step(1, { KeyX: true }); while (player.z > 0) step(); while (player.landLag > left) step();
    step(1, { KeyZ: true }); let f = 0; while (player.attack === 0 && f < 20) { step(); f++; }
    return { attackStarted: player.attack > 0, framesAfterPress: f + 1, lagLeftWhenStarted: player.landLag }; }, left);
  await R('B 착지 경직 중 적 속도', () => { fresh(); const e = mk('thug', 700); enemies = [e]; step(1, { KeyX: true }); while (player.z > 0) step();
    const sp = []; while (player.landLag > 0) { const x0 = e.x; step(); sp.push((x0 - e.x).toFixed(1)); } return sp.join(' '); });
  await R('C 공중 피격 뒤 착지 경직', () => { fresh(); const e = mk('thug', 515, { attack: 9, cooldown: 9999 }); enemies = [e]; player.hp = 999;
    step(1, { KeyX: true }); step(1); const z = player.z; while (player.z > 0) step(); return { hitInAirAtZ: +z.toFixed(1), hp: player.hp, landLag: player.landLag }; });
  await R('D 쿨다운 0 적 기상 → 공격 준비', () => { fresh(); const e = mk('thug', 518, { cooldown: 0, hp: 999, maxHp: 999 }); enemies = [e];
    player.combo = 2; player.lastHit = true; player.comboTimer = 5; step(1, { KeyZ: true }); while (e.down === 0) step(); while (e.down > 0) step(); e.cooldown = 0;
    let f = 0; while (e.attack === 0 && f < 60) { step(); f++; } return { windupStartsAfterGetup: f, invulnWas: 20 }; });
  await R('E 기상 직후 붙어서 연타로 끊기', () => { fresh(); const e = mk('thug', 518, { cooldown: 0, hp: 999, maxHp: 999 }); enemies = [e]; player.hp = 999;
    player.combo = 2; player.lastHit = true; player.comboTimer = 5; step(1, { KeyZ: true }); while (e.down === 0) step(); while (e.down > 0) step(); e.cooldown = 0;
    player.x = e.x - 37; player.dir = 1; player.attack = 0; const hp0 = player.hp; let hits = 0;
    for (let f = 0; f < 90; f++) { const h = e.hp; step(1, (player.attack === 0 || (player.attack <= 13 && !player.buffered)) ? { KeyZ: true } : {}); if (e.hp < h) hits++; }
    return { playerHurt: hp0 - player.hp, playerHits: hits }; });
  await R('F 적2명: 대기하던 적 다운→기상', () => { fresh(); const a = mk('thug', 445, { cooldown: 0, dir: 1, hp: 999, maxHp: 999 }), c = mk('thug', 518, { cooldown: 0, hp: 999, maxHp: 999 }); enemies = [a, c]; player.hp = 999;
    // a 가 먼저 공격 준비 → c 는 동시 공격 제한으로 대기. c 를 3타로 넘어뜨린다
    while (a.attack === 0) step(); const cWaiting = c.attack === 0; a.cooldown = 9999; a.attack = 0;
    player.dir = 1; player.combo = 2; player.lastHit = true; player.comboTimer = 5; player.attack = 0; player.hitstun = 0; player.down = 0;
    step(1, { KeyZ: true }); while (c.down === 0 && player.attack > 0) step(); const downed = c.down > 0; while (c.down > 0) step(); c.cooldown = 0;
    let f = 0; while (c.attack === 0 && f < 60) { step(); f++; } return { cWasWaiting: cWaiting, cDowned: downed, cWindupAfterGetup: f }; });
  console.log(`측정 ${cases} / 기대 9 (A 4개 + B~F 5개)`, 'errors', errors); await b.close();
})();
