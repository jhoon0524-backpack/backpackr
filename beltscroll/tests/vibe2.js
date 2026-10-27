const { GAME, OUT, ROOT } = require('./paths');
const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errors = []; let n = 0;
  const cases = [
    ['PC 크롬', { viewport: { width: 1280, height: 800 } }, null],
    ['터치 노트북', { viewport: { width: 1280, height: 800 }, hasTouch: true }, null],
    ['안드로이드 크롬', { ...devices['Pixel 7'], viewport: { width: 915, height: 412 } }, null],
    ['아이폰 (진동 API 없음)', { ...devices['iPhone 13'], viewport: { width: 844, height: 390 } }, () => { delete Navigator.prototype.vibrate; }],
  ];
  for (const [label, opts, init] of cases) {
    const ctx = await b.newContext(opts); if (init) await ctx.addInitScript(init);
    const p = await ctx.newPage(); p.on('pageerror', e => errors.push(label + ':' + e.message));
    await p.goto(GAME); await p.waitForTimeout(300);
    const r = await p.evaluate(() => ({ vibrateApi: typeof navigator.vibrate, vibeButton: getComputedStyle(document.getElementById('btnVibe')).display !== 'none', soundButton: getComputedStyle(document.getElementById('btnSound')).display !== 'none' }));
    n++; console.log(label.padEnd(22), JSON.stringify(r)); await ctx.close();
  }
  console.log(`경우 ${n} / 기대 4`, 'errors', errors); await b.close();
})();
