import { CONFIG } from './config.js';
import { drawLayer, resolveColor } from './draw.js';
import { drawCharacter, drawShadow } from './character.js';
import { drawEffect, effectColors } from './effects.js';
import { currentPose, bodyBox, activeAttackBox } from './world.js';
import { get } from './data.js';

// 이 장면에 쓰일 수 있는 모든 색 (픽셀형 색 맞춤 + snap의 팔레트 검사에 쓴다)
export function worldPalette(w) {
  const colors = new Set(Object.values(w.stage.palette));
  for (const e of w.entities) {
    Object.values(e.def.palette).forEach((c) => colors.add(c));
    for (const atk of e.def.attacks || []) {
      effectColors(get('effects', atk.effect)).forEach((c) => colors.add(resolveColor(w.stage.palette, c)));
    }
  }
  return [...colors];
}

function drawWorld(ctx, w, debug) {
  const { WIDTH: W, HEIGHT: H, SHAKE_MARGIN: M } = CONFIG;
  const st = w.stage;
  ctx.save();
  ctx.translate(w.shake.x, w.shake.y);
  ctx.fillStyle = st.palette.bg;
  ctx.fillRect(-M, -M, W + M * 2, H + M * 2);
  for (const layer of st.background) drawLayer(ctx, layer, st.palette);

  const sorted = [...w.entities].sort((a, b) => a.y - b.y || a.id - b.id);
  for (const e of sorted) drawShadow(ctx, e.def, e.x, e.y, st.palette.shadow);
  for (const e of sorted) {
    const flash = e.flash > 0 ? resolveColor(st.palette, st.palette.flash) : null;
    drawCharacter(ctx, e.def, currentPose(e), e.x, e.y, e.facing, flash);
  }
  for (const fx of w.effects) drawEffect(ctx, fx, st.palette);

  if (debug.hitboxes) drawHitboxes(ctx, w);
  ctx.restore();
}

// 픽셀형: 작은 캔버스에 그린 뒤 모든 픽셀을 가장 가까운 팔레트 색으로 맞춘다.
const lowCanvas = document.createElement('canvas');
const quantCache = new Map();

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function quantize(ctx, palette, cacheKey) {
  const rgbs = palette.map(hexToRgb);
  const img = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  const d = img.data;
  let cache = quantCache.get(cacheKey);
  if (!cache) quantCache.set(cacheKey, (cache = new Map()));
  for (let i = 0; i < d.length; i += 4) {
    const key = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
    let best = cache.get(key);
    if (best === undefined) {
      let bd = Infinity;
      for (let j = 0; j < rgbs.length; j++) {
        const [r, g, b] = rgbs[j];
        const dist = (r - d[i]) ** 2 + (g - d[i + 1]) ** 2 + (b - d[i + 2]) ** 2;
        if (dist < bd) { bd = dist; best = j; }
      }
      cache.set(key, best);
    }
    [d[i], d[i + 1], d[i + 2]] = rgbs[best];
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

export function renderFrame(ctx, w, debug = {}) {
  const r = w.stage.render || {};
  ctx.imageSmoothingEnabled = false;
  if (r.style !== 'pixel') {
    drawWorld(ctx, w, debug);
    return;
  }
  const d = r.downscale;
  lowCanvas.width = CONFIG.WIDTH / d;
  lowCanvas.height = CONFIG.HEIGHT / d;
  const lc = lowCanvas.getContext('2d', { willReadFrequently: true });
  lc.setTransform(1 / d, 0, 0, 1 / d, 0, 0);
  drawWorld(lc, w, {});
  lc.setTransform(1, 0, 0, 1, 0, 0);
  quantize(lc, worldPalette(w), w.stage.id);
  ctx.drawImage(lowCanvas, 0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
  if (debug.hitboxes) {
    ctx.save();
    ctx.translate(w.shake.x, w.shake.y);
    drawHitboxes(ctx, w);
    ctx.restore();
  }
}

function drawHitboxes(ctx, w) {
  ctx.lineWidth = 1;
  for (const e of w.entities) {
    const b = bodyBox(e);
    ctx.strokeStyle = CONFIG.DEBUG_BODY_COLOR;
    ctx.strokeRect(b.left, b.top, b.right - b.left, b.bottom - b.top);
    const a = activeAttackBox(e);
    if (a) {
      ctx.strokeStyle = CONFIG.DEBUG_ATTACK_COLOR;
      ctx.strokeRect(a.left, a.top, a.right - a.left, a.bottom - a.top);
    }
  }
}
