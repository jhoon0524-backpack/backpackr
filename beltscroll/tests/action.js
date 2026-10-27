const { GAME, OUT, ROOT } = require('./paths');
const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch();
  // PC
  const p = await b.newPage({ viewport: { width: 1000, height: 640 } });
  const errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.goto(GAME);
  await p.waitForTimeout(400);
  console.log('pc buttons visible:', await p.locator('#btnAttack').isVisible());
  await p.keyboard.press('Enter');
  await p.keyboard.down('ArrowRight'); await p.waitForTimeout(1300); await p.keyboard.up('ArrowRight');
  await p.waitForTimeout(1600);
  // 적 앞에 세우고 공격 장면 포착
  await p.evaluate(() => { const e = enemies[0]; player.y = e.y; player.x = e.x - 45; player.dir = 1; e.cooldown = 999; enemies[1].cooldown = 0; });
  await p.keyboard.press('KeyZ'); await p.waitForTimeout(110);
  await p.screenshot({ path: OUT + '/act1.png' });
  await p.waitForTimeout(250); await p.keyboard.press('KeyZ'); await p.waitForTimeout(90); await p.keyboard.press('KeyZ'); await p.waitForTimeout(230);
  await p.screenshot({ path: OUT + '/act2.png' });
  console.log('errors', errors);
  // 모바일
  const ctx = await b.newContext({ ...devices['iPhone 13'], viewport: { width: 844, height: 390 } });
  const m = await ctx.newPage();
  await m.goto(GAME);
  await m.waitForTimeout(400);
  console.log('mobile buttons visible:', await m.locator('#btnAttack').isVisible());
  await m.touchscreen.tap(600, 150); await m.waitForTimeout(800);
  await m.screenshot({ path: OUT + '/mob.png' });
  await b.close();
})();
