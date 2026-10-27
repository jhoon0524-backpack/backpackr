import { CONFIG } from './config.js';
import { paintShape, resolveColor } from './draw.js';

// 이펙트 = 레이어 목록. 레이어 순서가 그리기 순서.
// 투명도를 쓰지 않는다(팔레트 밖 색이 생기므로). 사라질 때는 크기·굵기를 줄인다.
//  flash  : 원/별이 커졌다가 줄어든다 {shape:'circle'|'star', points, inner, r:[시작,최대], frames, grow}
//  ring   : 퍼지는 고리 {r:[시작,끝], w, frames}
//  sparks : 튀는 불꽃 {count, life:[min,max], speed:[min,max], angle, spread, len, w, drag, gravity, square}

const easeOut = (u) => 1 - Math.pow(1 - u, CONFIG.EASE_OUT_POWER);

export function spawnEffect(def, x, y, facing, rng) {
  const layers = def.layers.map((L) => {
    if (L.type !== 'sparks') return { L };
    const parts = [];
    for (let i = 0; i < L.count; i++) {
      const ang = (L.angle + (rng.next() - 0.5) * L.spread) * CONFIG.RAD_PER_DEG;
      const sp = rng.range(L.speed[0], L.speed[1]);
      const colors = L.colors || [L.color];
      parts.push({
        x: 0, y: 0,
        vx: Math.cos(ang) * sp * facing,
        vy: Math.sin(ang) * sp,
        life: Math.round(rng.range(L.life[0], L.life[1])),
        color: colors[Math.floor(rng.next() * colors.length)],
      });
    }
    return { L, parts };
  });
  return { def, x, y, facing, t: 0, layers, done: false };
}

function layerLife(layer) {
  if (layer.L.type === 'sparks') return Math.max(...layer.parts.map((p) => p.life));
  return layer.L.frames + (layer.L.delay || 0);
}

export function updateEffect(fx) {
  fx.t++;
  for (const layer of fx.layers) {
    if (!layer.parts) continue;
    for (const p of layer.parts) {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= layer.L.drag;
      p.vy = p.vy * layer.L.drag + (layer.L.gravity || 0);
    }
  }
  fx.done = fx.layers.every((l) => fx.t >= layerLife(l));
}

function starShape(points, rOut, rIn, rot) {
  const pts = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? rIn : rOut;
    const a = (i / (points * 2)) * Math.PI * 2 + rot;
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return { type: 'poly', pts };
}

export function drawEffect(ctx, fx, palette) {
  const col = (c) => resolveColor(palette, c);
  ctx.save();
  ctx.translate(fx.x, fx.y);
  ctx.scale(fx.facing, 1);
  for (const { L, parts } of fx.layers) {
    const t = fx.t - (L.delay || 0);
    if (t < 0) continue;
    const outline = L.outline && { color: col(L.outline.color), width: L.outline.width };
    if (L.type === 'flash') {
      if (t >= L.frames) continue;
      const u = t / L.frames;
      const g = L.grow ?? 0.3;
      const r = u < g ? L.r[0] + (L.r[1] - L.r[0]) * easeOut(u / g) : L.r[1] * (1 - (u - g) / (1 - g));
      const shape = L.shape === 'star'
        ? starShape(L.points, r, r * L.inner, (L.rot || 0) * CONFIG.RAD_PER_DEG)
        : { type: 'ellipse', rx: r, ry: r };
      if (outline) paintShape(ctx, shape, null, outline);
      paintShape(ctx, shape, col(L.color));
    } else if (L.type === 'ring') {
      if (t >= L.frames) continue;
      const u = easeOut(t / L.frames);
      const r = L.r[0] + (L.r[1] - L.r[0]) * u;
      ctx.beginPath();
      ctx.ellipse(0, 0, r, r * (L.squash || 1), 0, 0, Math.PI * 2);
      ctx.strokeStyle = col(L.color);
      ctx.lineWidth = Math.max(L.w * (1 - t / L.frames), 0.5);
      ctx.stroke();
    } else if (L.type === 'sparks') {
      for (const p of parts) {
        if (t >= p.life) continue;
        const k = 1 - t / p.life;
        if (L.square) {
          const s = L.w * k;
          ctx.fillStyle = col(p.color);
          ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
          continue;
        }
        const sp = Math.hypot(p.vx, p.vy) || 1;
        const len = L.len * k;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - (p.vx / sp) * len, p.y - (p.vy / sp) * len);
        ctx.strokeStyle = col(p.color);
        ctx.lineWidth = Math.max(L.w * k, 0.5);
        ctx.lineCap = 'round';
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

export function effectColors(def) {
  const out = [];
  for (const L of def.layers) {
    if (L.color) out.push(L.color);
    if (L.colors) out.push(...L.colors);
    if (L.outline) out.push(L.outline.color);
  }
  return out;
}
