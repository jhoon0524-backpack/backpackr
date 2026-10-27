// 장면을 PNG로 찍는 검수 스크립트.
//   npm run snap -- <장면> [프레임] [--seed=N] [--frames=5,hit+1,hit+16] [--labels="a|b|c"] [--out=이름]
//   npm run snap:strip -- <장면> [--seed=N] [--hit=N] [--feel=basic|strong]
// 프레임 토큰: 숫자 | hit+k | hit-k | hit2+k (n번째 타격 기준)
// vite build → vite preview를 직접 띄우고, 끝나면 끈다.
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VITE = path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
const PORT = 4179;
const COLOR_TOLERANCE = 8;
const STRIP_BEFORE = 2;
const STRIP_COUNT = 12;
const TRACE_AFTER_LAST_HIT = 60;

const args = process.argv.slice(2);
const opts = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => {
  const [k, v] = a.slice(2).split('=');
  return [k, v ?? true];
}));
const [sceneName = 'empty', frameArg = '0'] = args.filter((a) => !a.startsWith('--'));
const seed = Number(opts.seed ?? 1);
const feel = opts.feel || null; // 타격감 프리셋 강제 (F키와 같음). 없으면 데이터에 적힌 값

function startPreview() {
  const build = spawnSync(process.execPath, [VITE, 'build', '--logLevel', 'warn'], { cwd: ROOT, stdio: 'inherit' });
  if (build.status !== 0) throw new Error('vite build 실패');
  const proc = spawn(process.execPath, [VITE, 'preview', '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: 'ignore' });
  return proc;
}

async function waitForServer(url) {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('vite preview가 뜨지 않았습니다');
}

function resolveFrames(page, tokens) {
  return Promise.all(tokens.map(async (tok) => {
    const m = /^hit(\d*)([+-]\d+)?$/.exec(tok);
    if (!m) return Number(tok);
    const n = Number(m[1] || 1);
    const hit = await page.evaluate(([s, k, f]) => window.__game.findHit(s, k, f), [seed, n, feel]);
    if (hit === null) throw new Error(`장면 "${sceneName}"에서 ${n}번째 타격이 일어나지 않았습니다`);
    return hit + Number(m[2] || 0);
  }));
}

// 팔레트 검사: ±8 안이면 팔레트 색, 팔레트 색 2~3개가 섞인 색(±8)이면 안티에일리어싱 중간색
// (도형 가장자리, 세 색이 만나는 모서리), 그 외는 팔레트 밖.
function paletteCheck(file, palette, height) {
  const png = PNG.sync.read(readFileSync(file));
  const pal = palette.map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)));
  const near = (c, p) => Math.abs(c[0] - p[0]) <= COLOR_TOLERANCE && Math.abs(c[1] - p[1]) <= COLOR_TOLERANCE && Math.abs(c[2] - p[2]) <= COLOR_TOLERANCE;
  const onSegment = (c, a, b) => {
    const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const len = d[0] ** 2 + d[1] ** 2 + d[2] ** 2;
    if (!len) return false;
    const t = Math.max(0, Math.min(1, ((c[0] - a[0]) * d[0] + (c[1] - a[1]) * d[1] + (c[2] - a[2]) * d[2]) / len));
    return near(c, [a[0] + d[0] * t, a[1] + d[1] * t, a[2] + d[2] * t]);
  };
  const MIX_STEPS = 20;
  const inTriangle = (c, a, b, d) => {
    for (let i = 0; i <= MIX_STEPS; i++) {
      for (let j = 0; i + j <= MIX_STEPS; j++) {
        const u = i / MIX_STEPS, v = j / MIX_STEPS, w = 1 - u - v;
        if (near(c, [0, 1, 2].map((k) => a[k] * u + b[k] * v + d[k] * w))) return true;
      }
    }
    return false;
  };
  const mixOf3 = (c) => pal.some((a, i) => pal.some((b, j) => j > i && pal.some((d, k) => k > j && inTriangle(c, a, b, d))));
  const counts = new Map();
  for (let y = 0; y < Math.min(height, png.height); y++) {
    for (let x = 0; x < png.width; x++) {
      const i = (y * png.width + x) * 4;
      const key = (png.data[i] << 16) | (png.data[i + 1] << 8) | png.data[i + 2];
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }
  let inPal = 0, aa = 0;
  const outside = [];
  for (const [key, n] of counts) {
    const c = [(key >> 16) & 255, (key >> 8) & 255, key & 255];
    if (pal.some((p) => near(c, p))) inPal++;
    else if (pal.some((a, i) => pal.some((b, j) => j > i && onSegment(c, a, b))) || mixOf3(c)) aa++;
    else outside.push({ hex: '#' + key.toString(16).padStart(6, '0'), pixels: n });
  }
  outside.sort((a, b) => b.pixels - a.pixels);
  return { total: counts.size, inPal, aa, outside };
}

function summarizeHits(trace) {
  const hits = trace.events.filter((e) => e.type === 'hit');
  const at = (f) => trace.rows[f - 1];
  return hits.map((h, i) => {
    const end = Math.min(hits[i + 1]?.frame ?? h.frame + TRACE_AFTER_LAST_HIT, trace.rows.length);
    let hitstop = 0;
    for (let f = h.frame + 1; f <= end && at(f).timeScale === 0; f++) hitstop++;
    let shakeMax = 0;
    for (let f = h.frame + 1; f <= end; f++) shakeMax = Math.max(shakeMax, Math.abs(at(f).shakeX), Math.abs(at(f).shakeY));
    const knockback = Math.abs(at(end).xs[h.target] - at(h.frame).xs[h.target]);
    return { hit: i + 1, frame: h.frame, feel: h.feel, hitstopFrames: hitstop, shakeMaxPx: shakeMax, knockbackPx: Math.round(knockback * 100) / 100 };
  });
}

async function main() {
  mkdirSync(path.join(ROOT, 'snaps'), { recursive: true });
  const preview = startPreview();
  let browser;
  try {
    const base = `http://localhost:${PORT}/`;
    await waitForServer(base);
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${base}?scene=${sceneName}&seed=${seed}&paused=1&frame=0`);
    await page.waitForFunction(() => window.__snapReady, null, { timeout: 10000 }).catch(() => {});
    if (errors.length) throw new Error('게임 화면 오류: ' + errors.join(' / '));

    let tokens, labels, outName;
    if (opts.strip) {
      const hitN = Number(opts.hit ?? 1);
      const [hit] = await resolveFrames(page, [`hit${hitN}`]);
      tokens = Array.from({ length: STRIP_COUNT }, (_, i) => String(hit - STRIP_BEFORE + i));
      labels = 'strip';
      outName = opts.out || `${sceneName}${feel ? '-' + feel : ''}-strip`;
    } else {
      tokens = opts.frames ? String(opts.frames).split(',') : [frameArg];
      labels = opts.labels ? String(opts.labels).split('|') : null;
      outName = opts.out || `${sceneName}-f${tokens.join('_')}-s${seed}`;
    }
    const frames = await resolveFrames(page, tokens);
    const shot = await page.evaluate(([s, f, l, fe]) => window.__game.capture(s, f, l, fe), [seed, frames, labels, feel]);
    const file = path.join(ROOT, 'snaps', `${outName}.png`);
    const buf = Buffer.from(shot.png.split(',')[1], 'base64');
    writeFileSync(file, buf);
    console.log(`PNG 저장: ${path.relative(ROOT, file)}  (프레임 ${frames.join(', ')}, 시드 ${seed})`);
    console.log(`  sha256 ${createHash('sha256').update(buf).digest('hex').slice(0, 16)}`);

    const pc = paletteCheck(file, shot.palette, shot.cellHeight);
    console.log(`  팔레트 밖 색: ${pc.outside.length}개  (팔레트 색 ${pc.inPal}, 외곽선 AA 중간색 ${pc.aa}, 전체 ${pc.total})`);
    if (pc.outside.length) console.log('  많이 쓰인 팔레트 밖 색:', pc.outside.slice(0, 5).map((o) => `${o.hex}(${o.pixels}px)`).join(' '));

    if (opts.strip) {
      const last = Math.max(frames.at(-1), ...shot.events.map((e) => e.frame)) + TRACE_AFTER_LAST_HIT;
      const trace = await page.evaluate(([s, n, fe]) => window.__game.trace(s, n, fe), [seed, last, feel]);
      const hits = summarizeHits(trace);
      const json = { scene: sceneName, seed, hitIndex: Number(opts.hit ?? 1), frames: shot.infos, hits };
      const jfile = path.join(ROOT, 'snaps', `${opts.out || sceneName + (feel ? '-' + feel : '')}.json`);
      writeFileSync(jfile, JSON.stringify(json, null, 2));
      console.log(`수치 저장: ${path.relative(ROOT, jfile)}`);
      for (const h of hits) console.log(`  ${h.hit}타 (F${h.frame}, ${h.feel}): 히트스톱 ${h.hitstopFrames}프레임, 흔들림 최대 ${h.shakeMaxPx}px, 넉백 ${h.knockbackPx}px`);
    }
  } finally {
    if (browser) await browser.close();
    preview.kill();
  }
}

main().catch((e) => {
  console.error('snap 실패:', e.message);
  process.exit(1);
});
