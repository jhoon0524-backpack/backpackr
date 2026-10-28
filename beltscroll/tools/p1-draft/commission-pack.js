// 아티스트 전달 자료 만들기 (윤무겸 샘플 6칸, 2px 규격): node tools/p1-draft/commission-pack.js → docs/p1-commission/
//  - pose-guide.png : 6칸 자세 참고(Claude 2px 시안 = 뼈대, 디자인 기준 아님) 8배 확대 + 기준선(몸 중심·바닥·칼끝 56px·키 110px) + 실측 수치
//  - palette.png / palette.gpl : 03 주요 색상 6색 + 부위별 4단 명암(시안에 쓴 색)
//  - ref-03-*.png : 03 설정화 부분 확대 (3면도·얼굴·주요 색상·의복/장비·전투 포즈)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), { pathToFileURL } = require('url');
const ROOT = path.join(__dirname, '..', '..'), OUT = path.join(ROOT, 'docs', 'p1-commission');
const SAMPLE = ['idle0', 'walk0', 'punch', 'kickPrep', 'kick', 'kickRecover'];
const LABEL = { idle0: '서기', walk0: '걷기 (첫 장)', punch: '1타 내려베기', kickPrep: '3타 준비', kick: '3타 찌르기', kickRecover: '3타 회수' };
const SWATCH03 = [['먹색', '#1b1b1a'], ['남청', '#292c30'], ['회갈', '#706255'], ['주홍', '#913324'], ['금속', '#987c5c'], ['누런 백색', '#e7dbc7']];
const MAT = { coat: '남청 도포', coatF: '도포 (먼 쪽)', mantle: '먹색 어깨 망토', pants: '바지', pantsF: '바지 (먼 쪽)', inner: '누런 백색 속자락·깃', boots: '신발', skin: '피부', skinF: '피부 (먼 쪽)',
  hair: '머리카락', belt: '가죽 띠', gold: '금속 (관·코등이·장식)', red: '주홍 (끈·술·매듭)', steel: '칼날', bracer: '가죽 팔토시', sheath: '칼집', grip: '칼자루' };
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  const p = await b.newPage(); await p.setContent('<html><body></body></html>'); await p.addScriptTag({ path: path.join(__dirname, 'draw.js') });
  const r = await p.evaluate(names => ({ sheet: P1DRAFT2.mugyeom(names), M: P1DRAFT2.M }), SAMPLE);
  await p.close();
  // 칸별 실측 (몸 기준점 x=32, 발바닥 아래끝 y=62 → 화면 px)
  const q = await b.newPage();
  const meas = await q.evaluate(async ({ url, names }) => {
    const img = new Image(); img.src = url; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data, out = {};
    names.forEach((n, i) => { let front = -99, top = 99, steel = [];
      for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) { const k = (y * c.width + i * 64 + x) * 4; if (!d[k + 3]) continue;
        front = Math.max(front, x); top = Math.min(top, y); const hex = ((d[k] << 16) | (d[k + 1] << 8) | d[k + 2]).toString(16).padStart(6, '0');
        if (['3f4a55', '8f9aa4', 'c6cfd5', 'f3f6f8'].includes(hex)) steel.push(x); }
      out[n] = { front: (front + 1 - 32) * 2, height: (62 - top) * 2, blade: steel.length ? (Math.max(...steel) + 1 - Math.min(...steel)) * 2 : null }; });
    return out;
  }, { url: r.sheet.url, names: SAMPLE });
  await q.close();
  const note = n => ({ idle0: `키 ${meas.idle0.height}px · 왼손 칼집, 오른손 자루`, walk0: `키 ${meas.walk0.height}px · 발 기준점 고정`, punch: `칼끝 ${meas.punch.front}px (목표 56)`,
    kickPrep: `상체·어깨를 뒤로 · 칼 허리로`, kick: `칼끝 ${meas.kick.front}px · 칼날 ${meas.kick.blade}px · 상체 준비보다 +12px`, kickRecover: `칼을 거두며 서기로` })[n];
  // 자세 가이드: 8배 확대 + 기준선
  const Z = 8, cell = 64 * Z;
  const guide = await b.newPage({ viewport: { width: 3 * (cell + 20) + 20, height: 600 } });
  await guide.setContent(`<body style="margin:0;background:#2c2a26;color:#eee;font:15px sans-serif;padding:10px">
    <div style="font-size:18px">윤무겸 샘플 6칸 — 자세·기준점 참고 (2px 규격, 64×64 칸, 8배 확대)</div>
    <div style="color:#fc6;margin:4px 0 10px">그림은 Claude 가 코드로 그린 "뼈대"입니다. 자세·칸 구성·기준점만 참고하고, 얼굴·옷·장비 디자인은 03 설정화를 따라 주세요.</div>
    <div style="display:grid;grid-template-columns:repeat(3,${cell}px);gap:20px">${SAMPLE.map((n, i) => `<div>
      <div style="font-size:16px">${i + 1}. ${LABEL[n]} <span style="color:#9cf">(${n})</span></div>
      <div style="position:relative;width:${cell}px;height:${cell}px;background:#4a443b;overflow:hidden">
        <img src="${r.sheet.url}" style="position:absolute;left:${-i * cell}px;top:0;width:${cell * SAMPLE.length}px;image-rendering:pixelated">
        ${[...Array(64)].map((_, k) => `<div style="position:absolute;left:${k * Z}px;top:0;width:1px;height:${cell}px;background:rgba(255,255,255,.05)"></div>`).join('')}
        <div title="몸 중심" style="position:absolute;left:${32 * Z}px;top:0;width:2px;height:${cell}px;background:#5cf"></div>
        <div title="바닥(발바닥 아래끝)" style="position:absolute;left:0;top:${62 * Z}px;width:${cell}px;height:2px;background:#5cf"></div>
        <div title="키 110px" style="position:absolute;left:0;top:${(62 - 55) * Z}px;width:${cell}px;height:1px;background:rgba(255,255,255,.5)"></div>
        <div title="칼끝 56px" style="position:absolute;left:${(32 + 28) * Z}px;top:0;width:2px;height:${cell}px;background:#f66"></div>
        <div style="position:absolute;left:4px;top:${62 * Z + 4}px;font-size:12px;color:#5cf">바닥 · 몸 중심</div>
        <div style="position:absolute;left:${(32 + 28) * Z - 74}px;top:4px;font-size:12px;color:#f88">칼끝 56px</div>
        <div style="position:absolute;left:4px;top:${(62 - 55) * Z - 16}px;font-size:12px;color:#ddd">키 110px</div>
      </div><div style="margin-top:4px">${note(n)}</div></div>`).join('')}</div>
    <div style="margin-top:12px">실제 게임 크기 (그림 1칸 = 2px, 960×540 화면 기준. PC 1440×900 창에서는 이보다 1.47배): <span style="display:inline-flex;gap:8px;vertical-align:middle">${SAMPLE.map((n, i) => `<span style="display:inline-block;width:128px;height:128px;overflow:hidden;position:relative;background:#4a443b"><img src="${r.sheet.url}" style="position:absolute;left:${-i * 128}px;width:${128 * SAMPLE.length}px;image-rendering:pixelated"></span>`).join('')}</span></div>
  </body>`);
  await guide.waitForTimeout(300); await guide.screenshot({ path: path.join(OUT, 'pose-guide.png'), fullPage: true }); await guide.close();
  // 팔레트
  const mats = Object.keys(MAT).filter(k => r.M[k]);
  const gpl = ['GIMP Palette', 'Name: Joseon Toemajeon - Yun Mugyeom (P1 draft)', 'Columns: 4', '#'];
  for (const [n, h] of SWATCH03) gpl.push(`${parseInt(h.slice(1, 3), 16)} ${parseInt(h.slice(3, 5), 16)} ${parseInt(h.slice(5, 7), 16)}\t03 ${n} ${h}`);
  for (const k of mats) ['외곽', '그림자', '바탕', '밝은 면'].forEach((t, i) => { const h = r.M[k][i]; gpl.push(`${parseInt(h.slice(1, 3), 16)} ${parseInt(h.slice(3, 5), 16)} ${parseInt(h.slice(5, 7), 16)}\t${k} ${t} ${h}`); });
  fs.writeFileSync(path.join(OUT, 'palette.gpl'), gpl.join('\n') + '\n');
  const sw = (h, w = 64) => `<div style="display:inline-block;margin:2px;text-align:center;font:11px monospace"><div style="width:${w}px;height:32px;background:${h};border:1px solid #555"></div>${h}</div>`;
  const pal = await b.newPage({ viewport: { width: 1000, height: 400 } });
  await pal.setContent(`<body style="margin:0;background:#2c2a26;color:#eee;font:14px sans-serif;padding:10px">
    <div style="font-size:17px">윤무겸 색 팔레트 (초안) — 03 "주요 색상" 6색 + 부위별 4단(외곽·그림자·바탕·밝은 면)</div>
    <div style="margin:8px 0 4px">03 주요 색상 견본</div><div>${SWATCH03.map(([n, h]) => `<div style="display:inline-block;margin:2px 6px 2px 0;text-align:center">${sw(h, 90)}<div>${n}</div></div>`).join('')}</div>
    <div style="margin:10px 0 4px">부위별 4단 (시안에 쓴 색 — 아티스트가 03 에 맞춰 조정 가능, 확정 팔레트는 샘플 승인 때)</div>
    <table style="border-collapse:collapse">${mats.map(k => `<tr><td style="padding:2px 10px 2px 0">${MAT[k]}</td><td>${r.M[k].map(h => sw(h)).join('')}</td></tr>`).join('')}</table></body>`);
  await pal.waitForTimeout(200); await pal.screenshot({ path: path.join(OUT, 'palette.png'), fullPage: true }); await pal.close();
  // 03 설정화 부분 확대 (원본 PNG 1536×1024 에서 잘라냄)
  const src = pathToFileURL(path.join(ROOT, 'assets', 'reference', 'png-originals', '조선 퇴마전 윤무겸 캐릭터 설정화.png')).href;
  const crops = { '3view': [627, 13, 493, 427], face: [1127, 13, 393, 427], colors: [627, 460, 207, 227], gear: [847, 460, 673, 227], battle: [309, 700, 637, 323] };
  const cp = await b.newPage(); await cp.goto(pathToFileURL(path.join(ROOT, 'index.html')).href);   // file:// 페이지에서 열어야 원본 그림을 읽을 수 있음
  for (const [name, [x, y, w, h]] of Object.entries(crops)) {
    const data = await cp.evaluate(async ({ src, x, y, w, h }) => { const img = new Image(); img.src = src; await img.decode();
      const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(img, x, y, w, h, 0, 0, w, h); return c.toDataURL('image/png'); }, { src, x, y, w, h });
    fs.writeFileSync(path.join(OUT, `ref-03-${name}.png`), Buffer.from(data.split(',')[1], 'base64'));
  }
  await cp.close();
  console.log(JSON.stringify(meas)); await b.close();
})();
