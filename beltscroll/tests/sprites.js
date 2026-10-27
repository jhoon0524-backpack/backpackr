// 정식 스프라이트 교체 구조: 가짜 시트(PNG)를 data/sprites.js 에 적으면 그 칸만 바뀌는지, 빠진 칸·파일 없음은 코드 그림으로 버티는지,
// 그림을 바꿔도 판(위치·체력·점수)은 그대로인지 (사본에서, 실제 게임은 안 고침)
const { GAME, OUT, ROOT } = require('./paths');
const { chromium } = require('playwright'); const fs = require('fs'); const { pathToFileURL } = require('url');
const base = OUT + '/spritetest';
const SPEC = { src: 'assets/sprites/mugyeom.png', frameW: 64, frameH: 64, footX: 32, footY: 60, scale: 1.5, face: [20, 4, 24, 24],
  frames: { idle0: [0, 0], idle1: [1, 0], walk0: [2, 0], punch: [3, 0] } };
function copyGame(spec) {
  fs.rmSync(base, { recursive: true, force: true });
  for (const f of ['index.html', 'art.js', 'data', 'assets/joseon']) fs.cpSync(ROOT + '/' + f, base + '/' + f, { recursive: true });
  fs.writeFileSync(base + '/data/sprites.js', `window.BB_DATA = window.BB_DATA || {};\nBB_DATA.sprites = ${JSON.stringify(spec ? { mugyeom: spec } : {})};\n`);
}
async function fakeSheet(b) {   // 칸마다 다른 색 사람 모양 4칸
  const p = await b.newPage();
  const url = await p.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d');
    ['#e0457b', '#3fb6c9', '#f2a33a', '#7dff6a'].forEach((col, i) => { g.fillStyle = col; g.fillRect(i * 64 + 24, 12, 16, 48); g.fillRect(i * 64 + 22, 4, 20, 14); });
    return c.toDataURL('image/png');
  });
  await p.close(); return Buffer.from(url.split(',')[1], 'base64');
}
async function run(b, label) {
  const p = await b.newPage(); const errors = [], failed = [];
  p.on('pageerror', e => errors.push(e.message)); p.on('requestfailed', r => failed.push(r.url().split('/').pop()));
  await p.goto(pathToFileURL(base + '/index.html').href); await p.waitForTimeout(500);
  const r = await p.evaluate(() => {
    const f0 = ART.frameOf('mugyeom', 'idle0'), fk = ART.frameOf('mugyeom', 'kick'), face = ART.faceOf('mugyeom');
    window.realUpdate = update; update = () => {};
    reset(); state = 'play'; const trace = [];
    for (let f = 0; f < 900; f++) {   // 같은 입력: 오른쪽으로 걷다가 7프레임마다 Z
      for (const k in keys) keys[k] = false;
      keys.ArrowRight = f < 300 || (f > 500 && f < 560);
      if (f > 300 && f % 7 === 0) pressed.KeyZ = true;
      realUpdate(); pressed = {};
      if (f % 10 === 0) draw();
      if (f % 30 === 0) trace.push([Math.round(player.x), Math.round(player.y), player.hp, score, ...enemies.map(e => Math.round(e.x) + ':' + e.hp)].join(','));
    }
    return { idle0: { w: f0.img.width, scale: f0.scale }, kick: { w: fk.img.width, scale: fk.scale }, faceW: face.img.width, trace: trace.join('|') };
  });
  await p.close();
  console.log(label.padEnd(16), JSON.stringify({ idle0: r.idle0, kick: r.kick, faceW: r.faceW }), '못 불러옴', failed, 'errors', errors);
  return r.trace;
}
(async () => {
  const b = await chromium.launch();
  const png = await fakeSheet(b);
  copyGame(null);
  const t0 = await run(b, '시트 없음(지금)');
  copyGame(SPEC); fs.mkdirSync(base + '/assets/sprites', { recursive: true }); fs.writeFileSync(base + '/assets/sprites/mugyeom.png', png);
  const t1 = await run(b, '가짜 시트 적용');
  copyGame(SPEC);   // 파일은 안 넣음
  const t2 = await run(b, '시트 파일 없음');
  console.log(t0 === t1 && t1 === t2 ? '세 경우 판 기록 같음 (그림만 바뀜)' : '판 기록이 다름');
  await b.close();
})();
