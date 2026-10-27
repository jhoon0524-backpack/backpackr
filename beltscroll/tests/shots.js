// 장면 사진: 타이틀 / 웨이브 1 전투 / 웨이브 3 전투 (PC 960x540, 휴대폰 가로). 프레임 단위로 같은 장면을 찍는다
// 사용: node shots.js [접두어]   → out/<접두어>-*.png
const { GAME, OUT } = require('./paths');
const { chromium, devices } = require('playwright');
const tag = process.argv[2] || 'shot';
async function scenes(page, name) {
  await page.goto(GAME); await page.waitForTimeout(400);
  await page.evaluate(() => { window.realUpdate = update; update = () => {}; });
  await page.screenshot({ path: `${OUT}/${tag}-${name}-title.png` });
  // 웨이브 1: 걸어 들어가 적이 화면에 들어와 공격 예고할 때까지, 그리고 3타 1번
  await page.evaluate(() => {
    reset(); state = 'play';
    keys.ArrowRight = true; let f = 0; while (waveState !== 'fight' && f < 600) { realUpdate(); f++; } keys.ArrowRight = false;
    for (let i = 0; i < 70; i++) realUpdate();
    draw();
  });
  await page.waitForTimeout(100);
  await page.screenshot({ path: `${OUT}/${tag}-${name}-wave1.png` });
  // 웨이브 3 자리로 옮겨 적 4명 등장
  await page.evaluate(() => {
    enemies = []; waveIndex = 2; waveState = 'walk'; player.x = 2700; cam = 2700 - 300;
    keys.ArrowRight = true; let f = 0; while (waveState !== 'fight' && f < 600) { realUpdate(); f++; } keys.ArrowRight = false;
    for (let i = 0; i < 90; i++) realUpdate();
    const e = enemies[0]; if (e) { e.down = 30; e.hp = Math.max(1, e.hp); }
    draw();
  });
  await page.waitForTimeout(100);
  await page.screenshot({ path: `${OUT}/${tag}-${name}-wave3.png` });
}
(async () => {
  const b = await chromium.launch(); const errors = [];
  const pc = await b.newPage({ viewport: { width: 960, height: 540 } }); pc.on('pageerror', e => errors.push(e.message));
  await scenes(pc, 'pc');
  const ctx = await b.newContext({ ...devices['Pixel 7'], viewport: { width: 915, height: 412 } });
  const m = await ctx.newPage(); m.on('pageerror', e => errors.push(e.message));
  await scenes(m, 'mobile');
  console.log('사진', `${OUT}/${tag}-*.png`, 'errors', errors); await b.close();
})();
