// 3축 조합: 전체화면 × 기기(폰/터치 노트북/마우스 PC) × 방향(가로/세로)
const { GAME, OUT, ROOT } = require('./paths');
const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errors = [];
  const kinds = {
    phone:  (w, h) => ({ ...devices['Pixel 7'], viewport: { width: w, height: h } }),
    touchPC:(w, h) => ({ viewport: { width: w, height: h }, hasTouch: true }),
    mousePC:(w, h) => ({ viewport: { width: w, height: h } }),
  };
  const sizes = { phone: [[915, 412], [412, 915]], touchPC: [[1280, 800], [700, 900]], mousePC: [[1280, 800], [700, 900]] };
  for (const kind of Object.keys(kinds)) for (const [w, h] of sizes[kind]) for (const fs of [false, true]) {
    const ctx = await b.newContext(kinds[kind](w, h)); const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(e.message));
    await p.goto(GAME); await p.waitForTimeout(300);
    if (fs) await p.evaluate(() => document.getElementById('stage').requestFullscreen().catch(() => {}));
    await p.waitForTimeout(300);
    const r = await p.evaluate(() => {
      const c = document.querySelector('canvas').getBoundingClientRect();
      const rot = document.getElementById('rotate');
      const top = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
      const inside = el => { const q = el.getBoundingClientRect(); return getComputedStyle(el).display === 'none' ? 'hidden' : (q.left >= c.left - 1 && q.right <= c.right + 1 && q.top >= c.top - 1 && q.bottom <= c.bottom + 1 ? 'in' : 'OUT'); };
      return { fs: !!document.fullscreenElement, canvas: `${Math.round(c.width)}x${Math.round(c.height)}`, blocked: rotateBlocked(), rotateOnTop: getComputedStyle(rot).display !== 'none' && (top === rot || rot.contains(top)), attackBtn: inside(document.getElementById('btnAttack')), jumpBtn: inside(document.getElementById('btnJump')), fullBtn: inside(document.getElementById('btnFull')) };
    });
    // 시작 키/탭이 먹는지
    if (kind === 'phone') await p.touchscreen.tap(Math.round(w * 0.8), Math.round(h * 0.3)); else await p.keyboard.press('Enter');
    await p.waitForTimeout(300);
    r.state = await p.evaluate(() => state);
    console.log(kind.padEnd(7), `${w}x${h}`.padEnd(8), fs ? 'FS ' : '   ', JSON.stringify(r));
    await ctx.close();
  }
  console.log('errors', errors); await b.close();
})();
