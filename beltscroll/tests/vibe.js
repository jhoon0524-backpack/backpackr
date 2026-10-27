const { GAME, OUT, ROOT } = require('./paths');
const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const errors = [];
  // 휴대폰 (진동 지원 흉내: navigator.vibrate 를 기록용으로 바꿔 끼움)
  const ctx = await b.newContext({ ...devices['Pixel 7'], viewport: { width: 915, height: 412 } });
  await ctx.addInitScript(() => { window.__vib = []; navigator.vibrate = (ms) => { window.__vib.push({ ms, t: typeof time === 'number' ? time : -1 }); return true; }; });
  const m = await ctx.newPage(); m.on('pageerror', e => errors.push('m:' + e.message));
  await m.goto(GAME); await m.waitForTimeout(300);
  let n = 0; const R = async (label, v) => { n++; console.log(label.padEnd(30), JSON.stringify(v)); };
  const vb = await m.locator('#btnVibe').boundingBox(), cv = await m.locator('canvas').boundingBox(), sb = await m.locator('#btnSound').boundingBox();
  await R('4 버튼 위치(휴대폰)', { visible: !!vb, insideCanvas: vb.x >= cv.x && vb.x + vb.width <= cv.x + cv.width, leftOfSound: vb.x + vb.width <= sb.x });
  await R('1 기본 꺼짐: 3연타', await m.evaluate(() => { window.realUpdate = update; update = () => {}; window.step = (n = 1, k = {}) => { for (let i = 0; i < n; i++) { Object.assign(pressed, k); realUpdate(); pressed = {}; k = {}; } };
    window.mk = (x, y, hp = 999) => Object.assign({ type: 'thug', ...ENEMY_TYPES.thug, maxHp: 999, hp, x, y, z: 0, vz: 0, dir: -1, hitstun: 0, down: 0, attack: 0, cooldown: 9999, dead: 0, flash: 0, entered: true, frozenUntil: 0, vx: 0, kbFriction: 0, invuln: 0, stomped: false, grabbed: false, thrown: null });
    window.fresh = () => { reset(); state = 'play'; waveState = 'fight'; cam = 0; time = 5; player.x = 480; player.y = 420; player.dir = 1; player.hp = 9999; __vib.length = 0; };
    fresh(); enemies = [mk(518, 420)]; step(1, { KeyZ: true }); for (let i = 0; i < 80; i++) step(1, (player.attack > 0 && player.attack <= 8 && !player.buffered) ? { KeyZ: true } : {}); return { vibeOn: debug.vibe, calls: __vib.length }; }));
  await m.touchscreen.tap(vb.x + vb.width / 2, vb.y + vb.height / 2); await m.waitForTimeout(50);
  await R('2 버튼 탭 → 켜짐·확인 진동', await m.evaluate(() => ({ vibeOn: debug.vibe, confirm: __vib.map(v => v.ms), soundStillOff: !debug.sound, state })));
  await R('3 1·2·3타 진동 길이', await m.evaluate(() => { fresh(); enemies = [mk(518, 420)]; step(1, { KeyZ: true }); for (let i = 0; i < 80; i++) step(1, (player.attack > 0 && player.attack <= 8 && !player.buffered) ? { KeyZ: true } : {}); return __vib.map(v => v.ms).join(','); }));
  await R('3 두 명 동시(처치 적 앞/뒤)', await m.evaluate(() => { const out = {}; for (const first of [true, false]) { fresh(); enemies = [mk(518, 420, first ? 5 : 999), mk(522, 425, first ? 999 : 5)]; step(1, { KeyZ: true }); step(10); out[first ? 'front' : 'back'] = __vib.map(v => v.ms).join(','); } return out; }));
  await R('3 피격·재시작 뒤', await m.evaluate(() => { fresh(); const a = mk(515, 420); a.attack = 9; enemies = [a]; step(2); const hit = __vib.map(v => v.ms).join(','); fresh(); enemies = [mk(518, 420)]; step(1, { KeyZ: true }); step(10); return { playerHit: hit, afterReset: __vib.map(v => v.ms).join(',') }; }));
  await m.touchscreen.tap(vb.x + vb.width / 2, vb.y + vb.height / 2); await m.waitForTimeout(50);
  await R('2 다시 탭 → 꺼짐·무진동', await m.evaluate(() => { fresh(); enemies = [mk(518, 420)]; step(1, { KeyZ: true }); step(10); return { vibeOn: debug.vibe, calls: __vib.length }; }));
  // 진동 미지원(아이폰 흉내): 버튼 숨김
  const ctx2 = await b.newContext({ ...devices['iPhone 13'], viewport: { width: 844, height: 390 } });
  await ctx2.addInitScript(() => { delete Navigator.prototype.vibrate; });
  const i = await ctx2.newPage(); i.on('pageerror', e => errors.push('i:' + e.message));
  await i.goto(GAME); await i.waitForTimeout(300);
  await R('4 진동 미지원 기기', { vibeButtonVisible: await i.locator('#btnVibe').isVisible(), soundButtonVisible: await i.locator('#btnSound').isVisible() });
  console.log(`측정 ${n} / 기대 8`, 'errors', errors); await b.close();
})();
