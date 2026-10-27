const { GAME, OUT, ROOT } = require('./paths');
const { chromium, devices } = require('playwright');
const out = OUT;
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(GAME);
  await page.waitForTimeout(300);
  await page.screenshot({ path: out + '/m1-title.png' });
  const st = () => page.evaluate(() => ({ state, px: Math.round(player.x), py: Math.round(player.y), hp: player.hp, atk: player.attack, z: Math.round(player.z), enemies: enemies.filter(e=>!e.dead).length, touchUI: document.body.classList.contains('has-touch') }));

  // tap to start (right side of canvas)
  await page.touchscreen.tap(600, 150);
  await page.waitForTimeout(100);
  console.log('after tap', await st());

  // joystick drag to the right via CDP touch events
  const cdp = await ctx.newCDPSession(page);
  const touch = async (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
  await touch('touchStart', 150, 250);
  await touch('touchMove', 200, 250);
  await page.waitForTimeout(1500);
  console.log('while dragging right', await st(), await page.evaluate(() => ({ r: keys.ArrowRight, l: keys.ArrowLeft, active: document.getElementById('stick').classList.contains('active') })));
  await page.screenshot({ path: out + '/m2-stick.png' });
  await touch('touchMove', 150, 210);   // up
  await page.waitForTimeout(400);
  console.log('drag up', await st(), await page.evaluate(() => ({ u: keys.ArrowUp, r: keys.ArrowRight })));
  await touch('touchEnd', 0, 0);
  await page.waitForTimeout(100);
  console.log('released', await page.evaluate(() => ({ r: keys.ArrowRight, u: keys.ArrowUp, active: document.getElementById('stick').classList.contains('active') })));

  // attack button
  const b = await page.locator('#btnAttack').boundingBox();
  await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
  await page.waitForTimeout(50);
  console.log('after attack tap', await st());
  // jump button
  const j = await page.locator('#btnJump').boundingBox();
  await page.touchscreen.tap(j.x + j.width / 2, j.y + j.height / 2);
  await page.waitForTimeout(150);
  console.log('after jump tap', await st());
  await page.screenshot({ path: out + '/m3-fight.png' });
  console.log('errors', errors);
  await browser.close();
})();
