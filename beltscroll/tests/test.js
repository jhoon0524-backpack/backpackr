const { GAME, OUT, ROOT } = require('./paths');
const { chromium } = require('playwright');
const out = OUT;
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1000, height: 640 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(GAME);
  await page.waitForTimeout(300);
  await page.screenshot({ path: out + '/01-title.png' });

  const st = () => page.evaluate(() => ({ state, waveState, waveIndex, px: Math.round(player.x), py: Math.round(player.y), hp: player.hp, enemies: enemies.filter(e => !e.dead).length, score, cam: Math.round(cam) }));

  await page.keyboard.press('Enter');
  await page.waitForTimeout(100);
  console.log('after start', await st());

  // walk right until wave 1 fight
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(1500);
  await page.keyboard.up('ArrowRight');
  console.log('after walk', await st());
  await page.waitForTimeout(1200);
  await page.screenshot({ path: out + '/02-wave1.png' });

  // auto-fight loop: face nearest enemy, punch when close, for up to 60s
  const t0 = Date.now();
  let lastShot = 0;
  while (Date.now() - t0 < 150000) {
    const s = await page.evaluate(() => {
      const live = enemies.filter(e => !e.dead && e.down === 0);
      if (!live.length) return { none: true, state, waveState };
      live.sort((a, b) => Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y));
      const e = live[0];
      return { dx: e.x - player.x, dy: e.y - player.y, state, waveState, eAttack: e.attack };
    });
    if (s.state !== 'play') break;
    if (s.none) {
      // advance right
      await page.keyboard.down('ArrowRight'); await page.waitForTimeout(120); await page.keyboard.up('ArrowRight');
      continue;
    }
    // align depth
    if (Math.abs(s.dy) > 8) { const k = s.dy > 0 ? 'ArrowDown' : 'ArrowUp'; await page.keyboard.down(k); await page.waitForTimeout(60); await page.keyboard.up(k); }
    // face / approach
    if (Math.abs(s.dx) > 50) { const k = s.dx > 0 ? 'ArrowRight' : 'ArrowLeft'; await page.keyboard.down(k); await page.waitForTimeout(60); await page.keyboard.up(k); }
    else {
      // ensure facing: tap direction briefly
      const k = s.dx > 0 ? 'ArrowRight' : 'ArrowLeft'; await page.keyboard.down(k); await page.waitForTimeout(16); await page.keyboard.up(k);
      await page.keyboard.press('KeyZ'); await page.waitForTimeout(120);
    }
    if (Date.now() - lastShot > 6000) { lastShot = Date.now(); await page.screenshot({ path: out + `/03-fight-${Math.round((Date.now()-t0)/1000)}s.png` }); console.log('progress', await st(), await page.evaluate(() => enemies.map(e => ({t:e.type,x:Math.round(e.x),y:Math.round(e.y),z:Math.round(e.z),hp:e.hp,atk:e.attack,cd:Math.round(e.cooldown),down:e.down,hs:e.hitstun,dead:e.dead}))), await page.evaluate(() => ({pz: player.z, pdown: player.down, patk: player.attack, phs: player.hitstun}))); }
  }
  console.log('end', await st());
  await page.screenshot({ path: out + '/04-end.png' });
  console.log('errors:', errors);
  await browser.close();
})();
