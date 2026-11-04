// AI 스프라이트 실험 A/B 비교 (2026-11-04): 같은 전투 장면·같은 캐릭터 크기(2px, scale 2, 키 110px)로
//   A  = 지금 2px 코드 시안 (assets/sprites/trial/mugyeom-2px.png)
//   B1 = AI 단순 축소 (assets/sprites/trial/ai/mugyeom-ai-b1.png)
//   B2 = AI 자동 보정(규칙 처리) (assets/sprites/trial/ai/mugyeom-ai-b2.png)
// 세 판 모두 윤무겸 서기·1타 2칸만 바꾼 게임 사본(tests/out/ai-pilot/game-*)에서 찍는다. 본 게임 시트(data/sprites.js)는 그대로.
// 조건: PC 1440×900 창(오너 PC, 게임 1.47배) / 휴대폰 가로 915×412 배율 2.625. 사진은 기기 픽셀 그대로 붙임.
// 쓰는 법: node tools/ai-pilot/compare.js → docs/ai-pilot/compare-pc.png, compare-mobile.png (+ 게임 사본 주소 출력: tests/sheets.js·tip56-check 에 씀)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), { pathToFileURL } = require('url');
const ROOT = path.join(__dirname, '..', '..'), OUT = path.join(ROOT, 'tests', 'out', 'ai-pilot'), DOCS = path.join(ROOT, 'docs', 'ai-pilot');
const SHEETS = [['A', 'assets/sprites/trial/mugyeom-2px.png', 'A 지금 2px 코드 시안'], ['B1', 'assets/sprites/trial/ai/mugyeom-ai-b1.png', 'B1 AI 단순 축소'], ['B2', 'assets/sprites/trial/ai/mugyeom-ai-b2.png', 'B2 AI 자동 보정 (규칙 처리)']];
const sprites = fs.readFileSync(path.join(ROOT, 'data', 'sprites.js'), 'utf8');
const VARIANTS = SHEETS.map(([vid, src, label]) => {
  const dir = path.join(OUT, 'game-' + vid); fs.rmSync(dir, { recursive: true, force: true });
  for (const f of ['index.html', 'art.js', 'data', 'assets/joseon', 'assets/sprites']) fs.cpSync(path.join(ROOT, f), path.join(dir, f), { recursive: true });
  const spec = `"mugyeom": { "src": "${src}", "frameW": 64, "frameH": 64, "footX": 32, "footY": 60.5, "scale": 2, "height": 110,
               "frames": { "idle0": [0, 0], "idle1": [0, 0], "punch": [1, 0] } },`;
  fs.writeFileSync(path.join(dir, 'data', 'sprites.js'), sprites.replace(/"mugyeom": \{[\s\S]*?\} \},\n/, spec + '\n'));
  return [vid, pathToFileURL(path.join(dir, 'index.html')).href, label];
});
const CONDS = [
  ['pc', { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }, 'PC 1440×900 창 (오너 PC 실측 — 게임 1408×792, 1.47배)'],
  ['mobile', { viewport: { width: 915, height: 412 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true }, '휴대폰 가로 915×412 · 배율 2.625 (실제 기기 픽셀)'],
];
const SCENES = [
  ['idle', '서기 (원귀 앞)', 'fresh(); enemies = [mk("thug", 470)]; time = 40; draw();', [310, 300, 230, 160]],
  ['atk1', '1타 판정 순간 (원귀 70px)', 'fresh(); enemies = [mk("thug", 450)]; step(1, { KeyZ: true }); while (!player.swing) step(); draw();', [310, 300, 230, 160]],
  ['wide', '전투 장면 (원귀 2·도깨비 예고)', 'fresh(); enemies = [mk("thug", 480, { y: 440 }), mk("brute", 250, { dir: 1, y: 420 })]; enemies[1].attack = 8 + ENEMY_AI.lungeFrames + 6; time = 40; draw();', [170, 260, 420, 210]],
];
const prep = `window.realUpdate = window.realUpdate || update; update = () => {};
  window.mk = (type, x, extra = {}) => Object.assign({ type, ...ENEMY_TYPES[type], speed: 0, maxHp: 999, hp: 999, x, y: 430, z: 0, vz: 0, dir: -1, hitstun: 0, down: 0, attack: 0, cooldown: 9999, dead: 0, flash: 0, entered: true, frozenUntil: 0, vx: 0, kbFriction: 0, invuln: 0, stomped: false, grabbed: false, thrown: null }, extra);
  window.fresh = () => { reset(); state = 'play'; waveState = 'fight'; cam = 0; time = 5; player.x = 380; player.y = 430; player.dir = 1; player.hp = 999; debug.hitbox = false; };
  window.step = (n = 1, k = {}) => { for (let i = 0; i < n; i++) { Object.assign(pressed, k); realUpdate(); pressed = {}; k = {}; } };`;
(async () => {
  fs.mkdirSync(DOCS, { recursive: true });
  const b = await chromium.launch(); const shots = {}; const errors = [];
  for (const [cid, opt] of CONDS) for (const [vid, url] of VARIANTS) {
    const ctx = await b.newContext(opt); const p = await ctx.newPage(); p.on('pageerror', e => errors.push(vid + ' ' + e.message));
    await p.goto(url); await p.waitForTimeout(700); await p.evaluate(prep);
    const box = await p.evaluate(() => { const r = document.getElementById('game').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width }; });
    const s = box.w / 960;
    for (const [sid, , code, [gx, gy, gw, gh]] of SCENES) {
      await p.evaluate(code);
      const file = path.join(OUT, `${cid}-${vid}-${sid}.png`);
      await p.screenshot({ path: file, clip: { x: box.x + gx * s, y: box.y + gy * s, width: gw * s, height: gh * s } });
      shots[`${cid}-${vid}-${sid}`] = file;
    }
    await ctx.close();
  }
  for (const [cid, , label] of CONDS) {
    const img = f => { const d = fs.readFileSync(shots[f]); const w = d.readUInt32BE(16); return `<img style="width:${w}px;image-rendering:pixelated" src="data:image/png;base64,${d.toString('base64')}">`; };
    const html = `<div style="padding:10px"><div style="font-size:16px;margin-bottom:6px">윤무겸 A/B 비교 — ${label} · 같은 장면·같은 크기 (기기 픽셀 그대로)</div>` +
      SCENES.map(([sid, sl]) => `<div style="margin:10px 0 4px">${sl}</div><div style="display:flex;gap:12px">` +
        VARIANTS.map(([vid, , vl]) => `<div><div style="color:${vid === 'A' ? '#ddd' : '#fc6'}">${vl}</div>${img(`${cid}-${vid}-${sid}`)}</div>`).join('') + '</div>').join('') + '</div>';
    const ctx = await b.newContext({ viewport: { width: 2400, height: 400 }, deviceScaleFactor: 1 }); const p = await ctx.newPage();
    await p.setContent(`<html><body style="margin:0;background:#15151c;color:#ddd;font:14px sans-serif;width:max-content">${html}</body></html>`); await p.waitForTimeout(300);
    const size = await p.evaluate(() => ({ w: document.body.scrollWidth, h: document.body.scrollHeight }));
    await p.setViewportSize({ width: size.w, height: Math.min(size.h, 6000) });
    await p.screenshot({ path: path.join(DOCS, `compare-${cid === 'pc' ? 'pc' : 'mobile'}.png`), fullPage: true }); await ctx.close();
  }
  console.log(VARIANTS.map(([v, u]) => `${v} ${u}`).join('\n')); console.log('errors', errors); await b.close();
})();
