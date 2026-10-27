// 자동 재생 규칙을 켠 실제 조건 (플래그 없음)
const { GAME, OUT, ROOT } = require('./paths');
const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errors = []; let n = 0;
  for (const [label, opts, act] of [
    ['휴대폰 첫 탭 = 화면', { ...devices['Pixel 7'], viewport: { width: 915, height: 412 } }, async p => p.touchscreen.tap(600, 150)],
    ['휴대폰 첫 탭 = 공격 버튼', { ...devices['Pixel 7'], viewport: { width: 915, height: 412 } }, async p => { const bb = await p.locator('#btnAttack').boundingBox(); await p.touchscreen.tap(bb.x + 30, bb.y + 30); }],
    ['PC 첫 입력 = Enter', { viewport: { width: 1000, height: 640 } }, async p => p.keyboard.press('Enter')],
    ['PC 첫 입력 = 화면 클릭', { viewport: { width: 1000, height: 640 } }, async p => p.mouse.click(600, 200)],
  ]) {
    const ctx = await b.newContext(opts); const p = await ctx.newPage(); p.on('pageerror', e => errors.push(label + e.message));
    await p.goto(GAME); await p.waitForTimeout(300);
    await act(p); await p.waitForTimeout(200);
    n++; console.log(label.padEnd(24), JSON.stringify(await p.evaluate(() => ({ audio: audio && audio.state, state, soundOn: debug.sound })))); await ctx.close();
  }
  console.log(`경우 ${n} / 기대 4 (자동 재생 규칙 켠 상태)`, 'errors', errors); await b.close();
})();
