const { GAME, OUT, ROOT } = require('./paths');
const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 1000, height: 640 } }); const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(GAME); await p.waitForTimeout(300);
  await p.evaluate(() => { window.realUpdate = update; update = () => {}; window.step = (n = 1, k = {}) => { for (let i = 0; i < n; i++) { Object.assign(pressed, k); realUpdate(); pressed = {}; k = {}; } };
    window.played = []; const orig = playHit; playHit = (kind, preview) => { if (debug.sound && audio) played.push({ kind, preview: !!preview, t: time }); return orig(kind, preview); };
    window.mk = (type, x, extra = {}) => Object.assign({ type, ...ENEMY_TYPES[type], maxHp: 999, hp: 999, x, y: 420, z: 0, vz: 0, dir: -1, hitstun: 0, down: 0, attack: 0, cooldown: 9999, dead: 0, flash: 0, entered: true, frozenUntil: 0, vx: 0, kbFriction: 0, invuln: 0, stomped: false, grabbed: false, thrown: null }, extra);
    window.fresh = () => { reset(); state = 'play'; waveState = 'fight'; cam = 0; time = 5; player.x = 480; player.y = 420; player.dir = 1; player.hp = 9999; played.length = 0; }; });
  let n = 0; const R = async (label, fn) => { n++; console.log(label.padEnd(30), JSON.stringify(await p.evaluate(fn))); };
  await R('1 기본 꺼짐: 3연타', () => { fresh(); const e = mk('thug', 518); enemies = [e]; step(1, { KeyZ: true }); for (let i = 0; i < 80; i++) step(1, (player.attack > 0 && player.attack <= 8 && !player.buffered) ? { KeyZ: true } : {}); return { soundOn: debug.sound, audioMade: !!audio, played: played.length }; });
  await p.evaluate(() => { const AC = window.AudioContext; const o = AC.prototype.createOscillator; AC.prototype.createOscillator = function () { window.__osc = (window.__osc || 0) + 1; return o.call(this); }; });
  await p.keyboard.press('KeyM'); await p.waitForTimeout(100);
  await R('2 M 키로 켜기 (확인음은 바로 1번)', () => ({ soundOn: debug.sound, audioState: audio && audio.state, previewOscMade: window.__osc || 0 }));
  await R('3 1·2·3타 소리 종류', () => { fresh(); const e = mk('thug', 518); enemies = [e]; step(1, { KeyZ: true }); for (let i = 0; i < 80; i++) step(1, (player.attack > 0 && player.attack <= 8 && !player.buffered) ? { KeyZ: true } : {}); return played.map(x => x.kind).join(','); });
  await R('3 피격·처치·던지기 착지', () => { fresh(); const out = {};
    const a = mk('thug', 515, { attack: 9 }); enemies = [a]; step(2); out.playerHit = played.map(x => x.kind).join(','); played.length = 0;
    fresh(); const k = mk('thug', 518, { hp: 5 }); enemies = [k]; step(1, { KeyZ: true }); step(10); out.kill = played.map(x => x.kind).join(','); played.length = 0;
    fresh(); const t = mk('thug', 514); enemies = [t]; keys.ArrowRight = true; while (!player.grab) step(); keys.ArrowRight = false; step(1, { KeyX: true }); step(60); out.throwLanding = played.map(x => x.kind).join(','); return out; });
  await R('4 한 프레임 여러 명 → 1번', () => { fresh(); const a = mk('thug', 518), c = mk('thug', 522, { y: 425 }); enemies = [a, c]; player.combo = 2; player.lastHit = true; player.comboTimer = 5;
    step(1, { KeyZ: true }); step(14); const byFrame = {}; for (const x of played) byFrame[x.t] = (byFrame[x.t] || 0) + 1; return { hitsTaken: [a, c].filter(e => e.hp < 999).length, soundsPerFrame: Object.values(byFrame) }; });
  await R('3 F=heavy 강제면 1타도 heavy', () => { fresh(); debug.feel = 'heavy'; const e = mk('thug', 518); enemies = [e]; step(1, { KeyZ: true }); step(10); debug.feel = 'auto'; return played.map(x => x.kind).join(','); });
  await p.keyboard.press('KeyM'); await p.waitForTimeout(50);
  await R('2 M 다시 → 꺼짐, 타격 무음', () => { fresh(); const e = mk('thug', 518); enemies = [e]; step(1, { KeyZ: true }); step(10); return { soundOn: debug.sound, played: played.length }; });
  // 버튼 (PC): 클릭 → 켜짐, 그 뒤 Enter 가 버튼을 다시 누르지 않음
  await p.click('#btnSound'); await p.waitForTimeout(50); await p.keyboard.press('Enter'); await p.waitForTimeout(50);
  await R('5 PC 버튼 클릭 후 Enter', () => ({ soundOn: debug.sound, label: document.getElementById('btnSound').textContent, focused: document.activeElement.id || document.activeElement.tagName }));
  // 휴대폰
  const ctx = await b.newContext({ ...devices['Pixel 7'], viewport: { width: 915, height: 412 } }); const m = await ctx.newPage(); m.on('pageerror', e => errors.push('m:' + e.message));
  await m.goto(GAME); await m.waitForTimeout(300);
  const bb = await m.locator('#btnSound').boundingBox(); const cv = await m.locator('canvas').boundingBox();
  await m.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); await m.waitForTimeout(100);
  n++; console.log('5 휴대폰 버튼 탭'.padEnd(30), JSON.stringify(await m.evaluate(() => ({ soundOn: debug.sound, state }))), 'insideCanvas', bb.x >= cv.x && bb.x + bb.width <= cv.x + cv.width);
  console.log(`측정 ${n} / 기대 9`, 'errors', errors); await b.close();
})();
