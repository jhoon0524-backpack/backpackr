// 2px 정식 규격 칼끝 56px(판정 57 유지) 검증 (2026-10-28 오너 승인 항목).
// 2px 검증용 칸(tools/p1-draft 의 2px 판 1·2·3타 등, 게임·저장소 그림엔 안 넣음)을 끼운 게임 사본에서
// 1·2·3타 × 좌우 × 판정 경계(맞음 끝·맞음 소수·헛침)에 적을 세워: 명중 여부, 화면 칼끝 위치(캔버스 픽셀로 잼, 카메라 킥 뺌), 칼끝과 적 몸 앞면·가드 주먹 사이 간격.
// 사진은 실제 화면 그대로(맞으면 카메라 킥 2px·7px 포함).
// 쓰는 법: node tools/p1-draft/tip56-check.js → 표 출력 + docs/p1/tip56-check.png
//         node tools/p1-draft/tip56-check.js <다른 게임 index.html 주소>  → 그 판(1px 시안·코드 그림 등)으로 같은 측정만 (사진 없음)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), { pathToFileURL } = require('url');
const ROOT = path.join(__dirname, '..', '..'), OUT = path.join(ROOT, 'tests', 'out', 'tip56'), DOCS = path.join(ROOT, 'docs', 'p1');
const NAMES = ['idle0', 'walk0', 'punch', 'punch2', 'kickPrep', 'kick', 'kickRecover'];
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  // 1) 2px 검증용 칸 만들기
  { const p = await b.newPage(); await p.setContent('<html><body></body></html>'); await p.addScriptTag({ path: path.join(__dirname, 'draw.js') });
    const r = await p.evaluate(names => P1DRAFT2.mugyeom(names), NAMES); fs.writeFileSync(path.join(OUT, 'mugyeom-2px.png'), Buffer.from(r.url.split(',')[1], 'base64')); await p.close(); }
  // 2) 게임 사본: 윤무겸만 2px 칸으로
  const game = path.join(OUT, 'game'); fs.rmSync(game, { recursive: true, force: true });
  for (const f of ['index.html', 'art.js', 'data', 'assets/joseon', 'assets/sprites']) fs.cpSync(path.join(ROOT, f), path.join(game, f), { recursive: true });
  fs.copyFileSync(path.join(OUT, 'mugyeom-2px.png'), path.join(game, 'assets', 'sprites', 'mugyeom-2px.png'));
  const frames = Object.fromEntries(NAMES.map((n, i) => [n, [i, 0]])); Object.assign(frames, { idle1: [0, 0], walk1: [1, 0], walk2: [1, 0], walk3: [1, 0] });
  const spec = { src: 'assets/sprites/mugyeom-2px.png', frameW: 64, frameH: 64, footX: 32, footY: 60.5, scale: 2, height: 110, frames };
  const sp = fs.readFileSync(path.join(ROOT, 'data', 'sprites.js'), 'utf8');
  fs.writeFileSync(path.join(game, 'data', 'sprites.js'), sp.replace(/"mugyeom": \{[\s\S]*?\} \},\n/, `"mugyeom": ${JSON.stringify(spec)},\n`));
  const p = await b.newPage({ viewport: { width: 960, height: 540 } }); const errors = []; p.on('pageerror', e => errors.push(e.message));
  const OTHER = process.argv[2];
  await p.goto(OTHER || pathToFileURL(path.join(game, 'index.html')).href); await p.waitForTimeout(800);
  await p.evaluate(() => {
    window.realUpdate = update; update = () => {};
    window.step = (n = 1, k = {}) => { for (let i = 0; i < n; i++) { Object.assign(pressed, k); realUpdate(); pressed = {}; k = {}; } };
    window.mk = (type, x, extra = {}) => Object.assign({ type, ...ENEMY_TYPES[type], speed: 0, maxHp: 999, hp: 999, x, y: 430, z: 0, vz: 0, dir: -1, hitstun: 0, down: 0, attack: 0, cooldown: 9999, dead: 0, flash: 0, entered: true, frozenUntil: 0, vx: 0, kbFriction: 0, invuln: 0, stomped: false, grabbed: false, thrown: null }, extra);
    const real = frameName; window.forceEnemy = null;
    window.frameName = (f, isP) => (!isP && window.forceEnemy && f.hitstun <= 0) ? window.forceEnemy : real(f, isP);
    const steel = new Set(['3f4a55', '8f9aa4', 'c6cfd5', 'f3f6f8', 'c3ccd2', 'f1f4f6']);   // 칼날 색: 시트(draw.js steel) + 코드 그림(art.js steel·steelHi)
    // n타를 dx 거리(적 중심, 앞쪽) 적에게: 앞 타는 가까이서 맞히고 마지막 타 직전에 옮김. 판정 순간 그림에서 칼끝 화면 위치를 잰다
    window.check = (n, dir, type, dx, guard) => {
      reset(); state = 'play'; waveState = 'fight'; cam = 0; time = 5; player.x = 480; player.y = 430; player.dir = dir; player.hp = 9999; debug.hitbox = false;
      window.forceEnemy = guard ? 'idle0' : null;
      const e = mk(type, 480 + dir * 40, { dir: -dir }); enemies = [e];
      for (let k = 1; k <= n; k++) {
        if (k === n) { player.lunge = 0; e.x = player.x + dir * dx; e.y = player.y; e.hitstun = 0; e.vx = 0; }
        const hp = e.hp; player.swing = null; step(1, { KeyZ: true }); let f = 0;
        while (!player.swing && f < 40) { step(); f++; }
        if (k < n) { while (player.attack > 0) step(); e.down = 0; e.hitstun = 0; e.z = 0; e.vz = 0; e.flash = 0; continue; }
        const hit = player.swing.hit;
        // 칼끝: 적을 잠깐 화면 밖으로 빼고 그려 칼끝 픽셀을 잰 뒤 되돌림
        const ex = e.x, ck = camKick; e.x = -999; camKick = null; draw(); e.x = ex; camKick = ck;   // 카메라 킥(맞을 때 화면이 밀림)은 빼고 잰다
        const d = ctx.getImageData(0, 0, W, H).data; let tip = null;
        for (let y = 250; y < 440; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4, hex = ((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]).toString(16).padStart(6, '0');
          if (steel.has(hex)) { const t = dir > 0 ? x + 1 - (player.x - cam) : (player.x - cam) - x; if (tip === null || t > tip) tip = t; } }
        // 그림끼리 실제 거리: 칼날 픽셀과 적 그림(서기 칸) 픽셀 사이 가장 가까운 거리 (0 = 겹침). 판정과 무관한 화면상의 틈
        const blade = []; for (let y = 250; y < 440; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; if (steel.has(((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]).toString(16).padStart(6, '0'))) blade.push([x, y]); }
        const fr = ART.frameOf(e.art, guard ? 'idle0' : 'idle0'), c = fr.img, cd = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, ep = [];
        for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (cd[(y * c.width + x) * 4 + 3]) {
          const sx = (e.x - cam) + (e.dir < 0 ? -1 : 1) * ((x + 0.5 - fr.ax) * fr.scale), sy = e.y + (y + 0.5 - fr.ay) * fr.scale; ep.push([sx, sy]); }
        let near = Infinity; for (const [bx, by] of blade) for (const [qx, qy] of ep) { const dd = Math.max(0, Math.abs(bx + 0.5 - qx) - (fr.scale + 1) / 2, 0) + 0 * qy; if (Math.abs(by + 0.5 - qy) <= (fr.scale + 1) / 2 && dd < near) near = dd; }
        // 직선으로 가장 가까운 거리 (칼날이 머리 위로 지나갈 때 같은 높이 가로 거리는 틈을 크게 잼 — 둘 다 냄)
        let eu = Infinity; const half = fr.scale / 2 + 0.5;
        for (const [bx, by] of blade) for (const [qx, qy] of ep) { const ddx = Math.max(0, Math.abs(bx + 0.5 - qx) - half), ddy = Math.max(0, Math.abs(by + 0.5 - qy) - half); const dd = Math.hypot(ddx, ddy); if (dd < eu) eu = dd; }
        draw();
        const bodyFront = dx - hurtHalf(e);   // 적 몸 앞면 (판정, 주인공 중심에서)
        const fist = guard ? Math.min(...ART.hitShapes(e.art, 'idle0').fists.map(([x, , w]) => dx - (x + w - ART.CX) * ART.S)) : null;   // 가드 주먹 앞끝
        return { hit, tip, gapBody: +(bodyFront - tip).toFixed(1), gapFist: fist === null ? null : +(fist - tip).toFixed(1), gapArt: near === Infinity ? null : Math.round(near), gapEu: Math.round(eu) };
      }
    };
  });
  const rows = [], shots = [];
  for (const n of [1, 2, 3]) for (const dir of [1, -1]) for (const [type, dx, guard, label] of [['thug', 83, false, '몸 앞면 56px (맞음 끝)'], ['thug', 83.5, false, '몸 앞면 56.5px'], ['thug', 84, false, '몸 앞면 57px (헛침 시작)'],
    ...(n === 3 ? [['brute', 92, true, '가드 주먹 56px (3타 주먹 맞음 끝)'], ['brute', 93, true, '가드 주먹 57px']] : [])]) {
    const r = await p.evaluate(([n, dir, type, dx, guard]) => check(n, dir, type, dx, guard), [n, dir, type, dx, guard]);
    rows.push({ n, dir, type, dx, label, ...r });
    if (dx === 83 || dx === 92) { const file = path.join(OUT, `shot-${n}-${dir}-${type}.png`);
      const cx = dir > 0 ? 480 : 480 - 140; await p.screenshot({ path: file, clip: { x: cx - 30, y: 300, width: 200, height: 140 } }); shots.push({ file, cap: `${n}타 ${dir > 0 ? '→' : '←'} ${label} · ${r.hit ? '맞음' : '헛침'} · 칼끝 ${r.tip}px` }); }
  }
  for (const r of rows) console.log(`${r.n}타 ${r.dir > 0 ? '→' : '←'} ${r.type.padEnd(5)} 적 중심 ${String(r.dx).padEnd(4)} ${r.label.padEnd(26)} ${r.hit ? '맞음' : '헛침'} · 화면 칼끝 ${r.tip}px · 칼끝~${r.gapFist === null ? '몸 앞면' : '가드 주먹'} 간격 ${r.gapFist === null ? r.gapBody : r.gapFist}px · 칼날~적 그림 같은 높이 최소 틈 ${r.gapArt}px · 직선 최단 ${r.gapEu}px`);
  if (OTHER) { console.log('errors', errors); await b.close(); return; }
  // 사진: 맞음 끝 장면 4배 확대
  const img = f => `<img style="width:600px;image-rendering:pixelated" src="data:image/png;base64,${fs.readFileSync(f).toString('base64')}">`;
  const q = await b.newPage({ viewport: { width: 1900, height: 400 } });
  await q.setContent(`<body style="margin:0;background:#15151c;color:#ddd;font:14px monospace;padding:10px"><div style="font-size:16px">2px 칼끝 56px · 판정 57px — 맞는 가장 먼 거리(적 몸 앞면/가드 주먹이 56px)에서의 명중 순간 (PC 화면 3배 확대)</div><div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:8px">${shots.map(s => `<div>${img(s.file)}<div>${s.cap}</div></div>`).join('')}</div></body>`);
  await q.waitForTimeout(300); await q.screenshot({ path: path.join(DOCS, 'tip56-check.png'), fullPage: true });
  console.log('errors', errors); await b.close();
})();
