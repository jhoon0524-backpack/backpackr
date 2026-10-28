// 도트 밀도 비교 (2026-10-28 오너 지시): 같은 장면을 코드 그림(3px 칸) · 1px 시안 · 2px 시험으로, 화면 조건별로 찍어 나란히.
// 조건: PC 960×540 배율 1 / PC 1440×900 창(오너 PC 실측, 1.47배) / 휴대폰 가로 915×412 배율 2.625(Pixel 7) / 같은 화면 배율 1(저해상도·작은 창) / 배율 2.
// 사진은 기기 픽셀 그대로(다시 줄이거나 늘리지 않음) 붙인다 — 비교 사진 자체가 축소로 뭉개지지 않게.
// 쓰는 법: node tools/p1-draft/density-compare.js <코드 그림 버전 index.html 주소> → docs/p1/density-*.png
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), { pathToFileURL } = require('url');
const ROOT = path.join(__dirname, '..', '..'), OUT = path.join(ROOT, 'tests', 'out', 'density'), DOCS = path.join(ROOT, 'docs', 'p1');
const CODE_URL = process.argv[2];
if (!CODE_URL) { console.log('코드 그림 버전(PR #31 최종) index.html 주소를 주세요'); process.exit(1); }
// 2px 시험판 사본: 지금 게임 + 윤무겸 시트만 2px 시험 시트(서기·1타)로
const copy2 = path.join(OUT, 'game-2px');
fs.rmSync(copy2, { recursive: true, force: true });
for (const f of ['index.html', 'art.js', 'data', 'assets/joseon', 'assets/sprites']) fs.cpSync(path.join(ROOT, f), path.join(copy2, f), { recursive: true });
const sprites = fs.readFileSync(path.join(ROOT, 'data', 'sprites.js'), 'utf8');
const m2 = `"mugyeom": { "src": "assets/sprites/trial/mugyeom-2px.png", "frameW": 64, "frameH": 64, "footX": 32, "footY": 60.5, "scale": 2, "height": 110,
               "frames": { "idle0": [0, 0], "idle1": [0, 0], "punch": [1, 0] } },`;
fs.writeFileSync(path.join(copy2, 'data', 'sprites.js'), sprites.replace(/"mugyeom": \{[\s\S]*?\} \},\n/, m2 + '\n'));
const VARIANTS = [['code', CODE_URL, '지금 코드 그림 (3px 칸)'], ['1px', pathToFileURL(path.join(ROOT, 'index.html')).href, '1px 시안 (128칸, scale 1)'], ['2px', pathToFileURL(path.join(copy2, 'index.html')).href, '2px 시험 (64칸, scale 2)']];
const CONDS = [
  ['pc', { viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 }, 'PC 960×540 · 배율 1 (게임 1px = 화면 1px — 창이 정확히 게임 크기일 때만)'],
  ['pc-window', { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }, 'PC 1440×900 창 · 배율 1 (오너 PC 실측: 게임 1408×792 = 1.47배 비정수 확대 → 1px 선은 1·2px 로 섞이고 2px 선은 3px 로 고름)'],
  ['phone', { viewport: { width: 915, height: 412 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true }, '휴대폰 가로 915×412 · 배율 2.625 (Pixel 7 같은 보통 폰: 게임 1px = 기기 약 2px, 빠지는 칸 없음)'],
  ['phone-dpr1', { viewport: { width: 915, height: 412 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true }, '같은 화면 · 배율 1 (저해상도 기기·작은 창: 게임 1px = 기기 0.76px, 가장 가까운 픽셀만 남김 → 1px 줄 약 4줄에 1줄 빠짐)'],
  ['dpr2', { viewport: { width: 915, height: 412 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, '같은 화면 · 배율 2 (게임 1px = 기기 1.53px → 1px 줄 굵기가 1·2px 로 고르지 않음)'],
];
const SCENES = {
  idle: 'fresh(); enemies = [mk("thug", 470)]; time = 40; draw();',
  atk1: 'fresh(); enemies = [mk("thug", 450)]; step(1, { KeyZ: true }); while (!player.swing) step(); draw();',
  wide: 'fresh(); enemies = [mk("thug", 470, { y: 440 }), mk("thug", 260, { dir: 1, y: 415 })]; time = 40; draw();',
};
const prep = `window.realUpdate = window.realUpdate || update; update = () => {};
  window.mk = (type, x, extra = {}) => Object.assign({ type, ...ENEMY_TYPES[type], speed: 0, maxHp: 999, hp: 999, x, y: 430, z: 0, vz: 0, dir: -1, hitstun: 0, down: 0, attack: 0, cooldown: 9999, dead: 0, flash: 0, entered: true, frozenUntil: 0, vx: 0, kbFriction: 0, invuln: 0, stomped: false, grabbed: false, thrown: null }, extra);
  window.fresh = () => { reset(); state = 'play'; waveState = 'fight'; cam = 0; time = 5; player.x = 380; player.y = 430; player.dir = 1; player.hp = 999; debug.hitbox = false; };
  window.step = (n = 1, k = {}) => { for (let i = 0; i < n; i++) { Object.assign(pressed, k); realUpdate(); pressed = {}; k = {}; } };`;
(async () => {
  fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(DOCS, { recursive: true });
  const b = await chromium.launch(); const shots = {};
  for (const [cid, opt] of CONDS) for (const [vid, url] of VARIANTS) {
    const ctx = await b.newContext(opt); const p = await ctx.newPage(); await p.goto(url); await p.waitForTimeout(700); await p.evaluate(prep);
    const box = await p.evaluate(() => { const r = document.getElementById('game').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width }; });
    const s = box.w / 960;
    for (const [sid, code] of Object.entries(SCENES)) {
      await p.evaluate(code);
      const [gx, gy, gw, gh] = sid === 'wide' ? [180, 270, 400, 200] : [310, 300, 230, 160];
      const file = path.join(OUT, `${cid}-${vid}-${sid}.png`);
      await p.screenshot({ path: file, clip: { x: box.x + gx * s, y: box.y + gy * s, width: gw * s, height: gh * s } });
      shots[`${cid}-${vid}-${sid}`] = file;
    }
    await ctx.close();
  }
  // 합치기: 기기 픽셀 그대로 (CSS 1px = 이미지 1px 로 보이게 배율 1 페이지에 원래 크기로)
  for (const [cid, opt, label] of CONDS) {
    const img = f => { const d = fs.readFileSync(shots[f]); const w = d.readUInt32BE(16); return `<img style="width:${w}px;image-rendering:pixelated" src="data:image/png;base64,${d.toString('base64')}">`; };
    const html = `<div style="padding:10px"><div style="font-size:16px;margin-bottom:6px">${label}</div>` +
      `<div style="display:grid;grid-template-columns:repeat(3,max-content);gap:8px 12px">${VARIANTS.map(([, , vl]) => `<div style="color:#fc6">${vl}</div>`).join('')}` +
      Object.keys(SCENES).map(sid => VARIANTS.map(([vid]) => `<div>${img(`${cid}-${vid}-${sid}`)}</div>`).join('')).join('') + '</div></div>';
    const ctx = await b.newContext({ viewport: { width: 2400, height: 400 }, deviceScaleFactor: 1 }); const p = await ctx.newPage();
    await p.setContent(`<html><body style="margin:0;background:#15151c;color:#ddd;font:14px monospace;width:max-content">${html}</body></html>`); await p.waitForTimeout(300);
    const size = await p.evaluate(() => ({ w: document.body.scrollWidth, h: document.body.scrollHeight }));
    await p.setViewportSize({ width: size.w, height: Math.min(size.h, 4000) });
    await p.screenshot({ path: path.join(DOCS, `density-${cid}.png`), fullPage: true }); await ctx.close();
  }
  console.log('ok', Object.keys(shots).length, '장');
  await b.close();
})();
