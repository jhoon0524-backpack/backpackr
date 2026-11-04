// B4 걷기·점프·맞음 움직임 GIF (2026-11-04): node tools/ai-pilot/b4_moves_gif.js
//  지금 게임(코드 그림)과 B4 시험판(tools/ai-pilot/b4_build.js 로 tests/out/ai-pilot/b4-build 에 만듦)을 같은 입력으로 돌려 PC 1440×900 화면을 매 프레임 찍음:
//  서기 4f → 오른쪽으로 걷기 40f (시험판은 걷기 6칸·16px 이동마다 — 칸당 5프레임, 지금 게임은 4칸·12px) → 멈춤 4f → 점프(X), 10프레임 뒤 점프 공격(Z), 착지까지 + 4f → 앞에서 맞음(damagePlayer) 14f + 6f. 출력 tests/out/ai-pilot/b4m-*.png, b4m-motion.json
//  GIF 는 python3 -I tools/ai-pilot/motion_gif.py . b4m → tests/out/ai-pilot/b4m-motion*.gif (단계 끝에만 끝에 --docs → docs/ai-pilot, 2026-11-04 오너 결정)
const { chromium } = require('playwright'); const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path'), { pathToFileURL } = require('url');
const ROOT = path.join(__dirname, '..', '..'), OUT = path.join(ROOT, 'tests', 'out', 'ai-pilot'), BUILD = path.join(OUT, 'b4-build');
execFileSync('node', [path.join(__dirname, 'b4_build.js'), BUILD]);
const V = [['NOW', pathToFileURL(path.join(ROOT, 'index.html')).href], ['B4', pathToFileURL(path.join(BUILD, 'index.html')).href]];
(async () => {
  const b = await chromium.launch(); const names = {}; const errors = [];
  for (const [vid, url] of V) {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }); const p = await ctx.newPage(); p.on('pageerror', e => errors.push(vid + ' ' + e.message));
    await p.goto(url); await p.waitForTimeout(700);
    await p.evaluate(() => { window.ru = update; update = () => {}; reset(); state = 'play'; waveState = 'fight'; enemies = []; cam = 0; player.x = 300; player.y = 430; player.dir = 1; player.hp = 999; debug.hitbox = false; });
    const box = await p.evaluate(() => { const r = document.getElementById('game').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width }; }); const s = box.w / 960;
    const shots = []; let i = 0;
    const shot = async (pre) => { const r = await p.evaluate(pre => { if (pre) eval(pre); ru(); draw(); return { n: frameName(player, true), sx: player.x - cam }; }, pre || null);
      const gx = Math.max(0, Math.min(960 - 220, r.sx - 110)); fs.writeFileSync(path.join(OUT, `b4m-motion-${vid}-${String(i).padStart(2, '0')}.png`), await p.screenshot({ clip: { x: box.x + gx * s, y: box.y + 220 * s, width: 220 * s, height: 230 * s } })); shots.push(r.n); i++; };
    for (let k = 0; k < 4; k++) await shot();
    await p.keyboard.down('ArrowRight'); for (let k = 0; k < 40; k++) await shot(); await p.keyboard.up('ArrowRight');
    for (let k = 0; k < 4; k++) await shot();
    await p.keyboard.down('KeyX'); await shot(); await p.keyboard.up('KeyX');
    for (let k = 0; k < 60 && await p.evaluate(() => player.z > 0); k++) { if (k === 10) await p.keyboard.down('KeyZ'); await shot(); if (k === 10) await p.keyboard.up('KeyZ'); }   // 점프 중 Z = 점프 공격 (2026-11-04)
    for (let k = 0; k < 4; k++) await shot();
    await shot('damagePlayer(1, -1, false, null)'); for (let k = 0; k < 19; k++) await shot();
    names[vid] = shots; await ctx.close();
  }
  const n = Math.min(names.NOW.length, names.B4.length); for (const v in names) names[v] = names[v].slice(0, n);
  fs.writeFileSync(path.join(OUT, 'b4m-motion.json'), JSON.stringify(names)); console.log('frames', n, 'errors', errors);
  console.log(V.map(([v]) => v + ' ' + [...new Set(names[v])].join(',')).join('\n')); await b.close();
})();
