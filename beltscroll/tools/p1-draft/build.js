// P1 시안 시트 만들기: node tools/p1-draft/build.js → assets/sprites/mugyeom.png, assets/sprites/dokkaebi.png
//   + 2px 시험 assets/sprites/trial/mugyeom-2px.png (서기·1타 2칸, 64×64 칸, scale 2 — 게임엔 안 씀, 비교용)
// (선택) 두 번째 인자로 폴더를 주면 4배 확대 미리보기 PNG 도 그 폴더에 저장
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'assets', 'sprites');
const PREVIEW = process.argv[2];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.setContent('<html><body></body></html>');
  await p.addScriptTag({ path: path.join(__dirname, 'draw.js') });
  const r = await p.evaluate(() => ({ m: P1DRAFT.mugyeom(), d: P1DRAFT.dokkaebi(), m2: P1DRAFT2.mugyeom(['idle0', 'punch']), order: { m: P1DRAFT.MUG_ORDER, d: P1DRAFT.DOK_ORDER } }));
  fs.mkdirSync(path.join(OUT, 'trial'), { recursive: true });
  fs.writeFileSync(path.join(OUT, 'trial', 'mugyeom-2px.png'), Buffer.from(r.m2.url.split(',')[1], 'base64'));
  fs.mkdirSync(OUT, { recursive: true });
  for (const [k, name] of [['m', 'mugyeom'], ['d', 'dokkaebi']]) {
    fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(r[k].url.split(',')[1], 'base64'));
    if (PREVIEW) {   // 4배 확대 + 칸 이름 + 발 기준점 표시
      const big = await b.newPage({ viewport: { width: 128 * 4 * r.order[k].length + 20, height: 600 } });
      await big.setContent(`<body style="margin:0;background:#3a352e;color:#eee;font:14px monospace"><div style="display:flex;gap:4px;padding:6px">${r.order[k].map((n, i) =>
        `<div><div>${n}</div><div style="position:relative;width:512px;height:512px;background:#4a443b;overflow:hidden"><img src="${r[k].url}" style="position:absolute;left:${-i * 512}px;top:0;width:${128 * 4 * r.order[k].length}px;image-rendering:pixelated"><div style="position:absolute;left:256px;top:0;width:1px;height:512px;background:#5cf"></div><div style="position:absolute;left:0;top:496px;width:512px;height:1px;background:#5cf"></div></div></div>`).join('')}</div></body>`);
      await big.waitForTimeout(200); await big.screenshot({ path: path.join(PREVIEW, `draft-${name}-x4.png`), fullPage: true }); await big.close();
    }
  }
  console.log(JSON.stringify({ mugyeom: r.m.info, dokkaebi: r.d.info, mugyeom2px: r.m2.info }), 'errors', errors);
  await b.close();
})();
