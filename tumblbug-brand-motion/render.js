// motion.html 을 프레임 단위로 캡처해 MP4 로 변환합니다.
// 사용법: node render.js [출력파일.mp4]   (필요: playwright-core, ffmpeg, Noto Sans CJK KR 폰트)
const { chromium } = require('playwright-core');
const { spawn } = require('child_process');
const path = require('path');

const FPS = 30, DURATION = 20;
const out = process.argv[2] || path.join(__dirname, 'tumblbug-brand-motion.mp4');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto('file://' + path.join(__dirname, 'motion.html'));
  await page.evaluate(() => document.fonts.ready);

  const ff = spawn('ffmpeg', ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'slow', '-movflags', '+faststart', out],
    { stdio: ['pipe', 'inherit', 'inherit'] });

  const total = FPS * DURATION;
  for (let f = 0; f < total; f++) {
    await page.evaluate(t => window.render(t), f / FPS);
    const png = await page.screenshot({ type: 'png' });
    if (!ff.stdin.write(png)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 60 === 0) console.log(`frame ${f}/${total}`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close();
  console.log('완료:', out);
})();
