// B3 비교 (2026-11-04 오너 지시 "AI 스프라이트 B3 개선 실험"): A·B2·B3 를 같은 전투 장면·같은 크기(2px, scale 2, 키 110px)로
//   A  = 지금 2px 코드 시안 (tools/p1-draft/draw.js 의 2px 판 서기·준비·1타 — 저장소 trial 시트는 서기·1타만이라 여기서 3칸으로 다시 그림)
//   B2 = AI 자동 보정 (assets/sprites/trial/ai/mugyeom-ai-b2.png, 준비 칸 없음 → 게임은 코드 그림 준비 칸을 씀)
//   B3 = AI 서기 디자인 + 도트 보정 (assets/sprites/trial/ai/mugyeom-ai-b3.png, 서기·준비·1타)
// 세 판 모두 윤무겸 칸만 바꾼 게임 사본(tests/out/ai-pilot/b3-game-*)에서 찍는다. 본 게임 시트(data/sprites.js)는 그대로. 베기 이펙트는 게임 JS 이펙트 그대로.
// 조건: PC 1440×900 창(게임 1.47배) / 휴대폰 가로 915×412 배율 2.625. 사진은 기기 픽셀 그대로.
// 출력: docs/ai-pilot/b3-compare-pc.png · b3-compare-mobile.png (장면 비교), b3-sequence.png (칸 4배: 서기→준비→1타→회수),
//       b3-motion.gif (PC 실제 화면 2배, 게임 프레임 시간 그대로: 서기 → 준비 5f → 1타 8f → 회수 → 서기) + 게임 사본 주소 출력 (tests/sheets.js·tip56-check 에 씀)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), { pathToFileURL } = require('url');
const ROOT = path.join(__dirname, '..', '..'), OUT = path.join(ROOT, 'tests', 'out', 'ai-pilot'), DOCS = path.join(ROOT, 'docs', 'ai-pilot');
const THREE = { idle0: [0, 0], idle1: [0, 0], windup: [1, 0], punch: [2, 0] };
const SHEETS = [['A', path.join(OUT, 'a3-2px.png'), 'A 지금 2px 코드 시안', THREE],
  ['B2', 'assets/sprites/trial/ai/mugyeom-ai-b2.png', 'B2 AI 자동 보정 (준비 칸 없음)', { idle0: [0, 0], idle1: [0, 0], punch: [1, 0] }],
  ['B3', 'assets/sprites/trial/ai/mugyeom-ai-b3.png', 'B3 AI 디자인 + 도트 보정', THREE]];
const CONDS = [
  ['pc', { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }, 'PC 1440×900 창 (게임 1408×792, 1.47배)'],
  ['mobile', { viewport: { width: 915, height: 412 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true }, '휴대폰 가로 915×412 · 배율 2.625 (실제 기기 픽셀)'],
];
const SCENES = [
  ['idle', '서기', 'fresh(); enemies = [mk("thug", 470)]; time = 40; draw();', [310, 300, 230, 160]],
  ['windup', '준비 (1타 첫 프레임)', 'fresh(); enemies = [mk("thug", 450)]; step(1, { KeyZ: true }); draw();', [250, 300, 290, 160]],
  ['atk1', '1타 판정 순간', 'fresh(); enemies = [mk("thug", 450)]; step(1, { KeyZ: true }); while (!player.swing) step(); draw();', [250, 300, 290, 160]],
  ['wide', '전투 장면 (원귀 2·도깨비 예고)', 'fresh(); enemies = [mk("thug", 480, { y: 440 }), mk("brute", 250, { dir: 1, y: 420 })]; enemies[1].attack = 8 + ENEMY_AI.lungeFrames + 6; time = 40; draw();', [170, 260, 420, 210]],
];
const prep = `window.realUpdate = window.realUpdate || update; update = () => {};
  window.mk = (type, x, extra = {}) => Object.assign({ type, ...ENEMY_TYPES[type], speed: 0, maxHp: 999, hp: 999, x, y: 430, z: 0, vz: 0, dir: -1, hitstun: 0, down: 0, attack: 0, cooldown: 9999, dead: 0, flash: 0, entered: true, frozenUntil: 0, vx: 0, kbFriction: 0, invuln: 0, stomped: false, grabbed: false, thrown: null }, extra);
  window.fresh = () => { reset(); state = 'play'; waveState = 'fight'; cam = 0; time = 5; player.x = 380; player.y = 430; player.dir = 1; player.hp = 999; debug.hitbox = false; };
  window.step = (n = 1, k = {}) => { for (let i = 0; i < n; i++) { Object.assign(pressed, k); realUpdate(); pressed = {}; k = {}; } };`;
(async () => {
  fs.mkdirSync(DOCS, { recursive: true }); fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch(); const errors = [];
  { const p = await b.newPage(); await p.setContent('<html><body></body></html>'); await p.addScriptTag({ path: path.join(ROOT, 'tools', 'p1-draft', 'draw.js') });
    const r = await p.evaluate(() => P1DRAFT2.mugyeom(['idle0', 'windup', 'punch'])); fs.writeFileSync(SHEETS[0][1], Buffer.from(r.url.split(',')[1], 'base64')); await p.close(); }
  const sprites = fs.readFileSync(path.join(ROOT, 'data', 'sprites.js'), 'utf8');
  const VARIANTS = SHEETS.map(([vid, src, label, frames]) => {
    const dir = path.join(OUT, 'b3-game-' + vid); fs.rmSync(dir, { recursive: true, force: true });
    for (const f of ['index.html', 'art.js', 'data', 'assets/joseon', 'assets/sprites']) fs.cpSync(path.join(ROOT, f), path.join(dir, f), { recursive: true });
    fs.copyFileSync(path.isAbsolute(src) ? src : path.join(ROOT, src), path.join(dir, 'assets', 'sprites', 'mugyeom-test.png'));
    const spec = { src: 'assets/sprites/mugyeom-test.png', frameW: 64, frameH: 64, footX: 32, footY: 60.5, scale: 2, height: 110, frames };
    fs.writeFileSync(path.join(dir, 'data', 'sprites.js'), sprites.replace(/"mugyeom": \{[\s\S]*?\} \},\n/, `"mugyeom": ${JSON.stringify(spec)},\n`));
    return [vid, pathToFileURL(path.join(dir, 'index.html')).href, label];
  });
  const shots = {}, motion = {};
  for (const [cid, opt] of CONDS) for (const [vid, url] of VARIANTS) {
    const ctx = await b.newContext(opt); const p = await ctx.newPage(); p.on('pageerror', e => errors.push(vid + ' ' + e.message));
    await p.goto(url); await p.waitForTimeout(700); await p.evaluate(prep);
    const box = await p.evaluate(() => { const r = document.getElementById('game').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width }; });
    const s = box.w / 960, clip = ([gx, gy, gw, gh]) => ({ x: box.x + gx * s, y: box.y + gy * s, width: gw * s, height: gh * s });
    for (const [sid, , code, rect] of SCENES) {
      await p.evaluate(code); const file = path.join(OUT, `b3-${cid}-${vid}-${sid}.png`);
      await p.screenshot({ path: file, clip: clip(rect) }); shots[`${cid}-${vid}-${sid}`] = file;
    }
    if (cid === 'pc') {   // 움직임: 서기 20f → Z → 1타 끝나고 서기 20f 까지 매 프레임 (그림 이름도 같이)
      await p.evaluate('fresh(); enemies = [mk("thug", 470)]; time = 40; draw();'); const fr = [];
      for (let f = 0; f < 60; f++) {
        const name = await p.evaluate(k => { if (k) step(1, { KeyZ: true }); else step(); draw(); return frameName(player, true); }, f === 20);
        fr.push({ name, png: await p.screenshot({ clip: clip([250, 300, 290, 160]) }) });
      }
      motion[vid] = fr;
    }
    await ctx.close();
  }
  const page = async (html, file) => { const ctx = await b.newContext({ viewport: { width: 2400, height: 400 }, deviceScaleFactor: 1 }); const p = await ctx.newPage();
    await p.setContent(`<html><body style="margin:0;background:#15151c;color:#ddd;font:14px sans-serif;width:max-content">${html}</body></html>`); await p.waitForTimeout(300);
    const size = await p.evaluate(() => ({ w: document.body.scrollWidth, h: document.body.scrollHeight }));
    await p.setViewportSize({ width: size.w, height: Math.min(size.h, 6000) }); await p.screenshot({ path: file, fullPage: true }); await ctx.close(); };
  const b64 = d => `data:image/png;base64,${d.toString('base64')}`;
  for (const [cid, , label] of CONDS) {
    const img = f => { const d = fs.readFileSync(shots[f]); return `<img style="width:${d.readUInt32BE(16)}px;image-rendering:pixelated" src="${b64(d)}">`; };
    await page(`<div style="padding:10px"><div style="font-size:16px;margin-bottom:6px">윤무겸 A·B2·B3 — ${label} · 같은 장면·같은 크기 (기기 픽셀 그대로)</div>` +
      SCENES.map(([sid, sl]) => `<div style="margin:10px 0 4px">${sl}${sid === 'windup' ? ' — B2 는 준비 칸이 없어 코드 그림이 나옴' : ''}</div><div style="display:flex;gap:12px">` +
        VARIANTS.map(([vid, , vl]) => `<div><div style="color:${vid === 'B3' ? '#fc6' : '#ddd'}">${vl}</div>${img(`${cid}-${vid}-${sid}`)}</div>`).join('') + '</div>').join('') + '</div>',
      path.join(DOCS, `b3-compare-${cid}.png`));
  }
  // 칸 4배: 서기 → 준비 → 1타 → 회수(= 서기 칸, 게임 구조상 1타 다음은 idle0)
  const cell = (src, i) => `<div style="width:256px;height:256px;background:#4a4236 url(${b64(fs.readFileSync(path.isAbsolute(src) ? src : path.join(ROOT, src)))}) ${-i * 256}px 0/auto 256px no-repeat;image-rendering:pixelated;position:relative">` +
    `<div style="position:absolute;left:128px;top:0;bottom:0;border-left:1px solid #5ac8ff"></div><div style="position:absolute;left:240px;top:0;bottom:0;border-left:1px solid #ff5a5a"></div><div style="position:absolute;top:248px;left:0;right:0;border-top:1px solid #5ac8ff"></div></div>`;
  const seq = { A: [0, 1, 2, 0], B2: [0, null, 1, 0], B3: [0, 1, 2, 0] };
  await page(`<div style="padding:10px"><div style="font-size:16px;margin-bottom:6px">준비 → 1타 → 회수 (칸 4배 · 하늘색 = 몸 중심·바닥, 빨강 = 칼끝 56px)</div>` +
    SHEETS.map(([vid, src, vl]) => `<div style="margin:8px 0 4px;color:${vid === 'B3' ? '#fc6' : '#ddd'}">${vl}</div><div style="display:flex;gap:10px">` +
      ['서기', '준비 5f', '1타 8f', '회수 (서기 칸)'].map((t, k) => `<div>${seq[vid][k] === null ? '<div style="width:256px;height:256px;background:#2a2a33;display:flex;align-items:center;justify-content:center">칸 없음 (코드 그림)</div>' : cell(src, seq[vid][k])}<div>${t}</div></div>`).join('') + '</div>').join('') + '</div>',
    path.join(DOCS, 'b3-sequence.png'));
  fs.writeFileSync(path.join(OUT, 'b3-motion.json'), JSON.stringify(Object.fromEntries(Object.entries(motion).map(([v, fr]) => [v, fr.map(f => f.name)]))));
  for (const [v, fr] of Object.entries(motion)) fr.forEach((f, i) => fs.writeFileSync(path.join(OUT, `b3-motion-${v}-${String(i).padStart(2, '0')}.png`), f.png));
  console.log(VARIANTS.map(([v, u]) => `${v} ${u}`).join('\n')); console.log('motion', fs.readFileSync(path.join(OUT, 'b3-motion.json'), 'utf8')); console.log('errors', errors); await b.close();
})();
