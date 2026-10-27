import { CONFIG } from './config.js';
import { paintShape, resolveColor } from './draw.js';

// 파츠 JSON을 조립해 그린다. 원점은 발밑 가운데, 오른쪽을 보는 방향이 기본.
// part: { id, parent, at:[x,y], shape, color, flash? }  배열 순서 = 그리기 순서
function partMatrix(def, pose, id, cache) {
  if (cache[id]) return cache[id];
  const part = def.parts.find((p) => p.id === id);
  const t = pose.parts[id];
  const base = part.parent ? partMatrix(def, pose, part.parent, cache) : new DOMMatrix();
  const m = base
    .translate(part.at[0] + t.x, part.at[1] + t.y)
    .rotate(t.rot)
    .scale(t.sx, t.sy);
  cache[id] = m;
  return m;
}

export function drawCharacter(ctx, def, pose, x, y, facing, flashColor) {
  const s = def.scale || 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing * s, s);
  ctx.translate(pose.root.x, pose.root.y);
  ctx.rotate(pose.root.rot * CONFIG.RAD_PER_DEG);
  const base = ctx.getTransform();
  const cache = {};
  const outline = def.outline && { color: resolveColor(def.palette, def.outline.color), width: def.outline.width };
  const passes = outline ? [outline, null] : [null];
  for (const ol of passes) {
    for (const part of def.parts) {
      ctx.setTransform(base.multiply(partMatrix(def, pose, part.id, cache)));
      const color = flashColor || resolveColor(def.palette, part.color);
      paintShape(ctx, part.shape, color, ol);
    }
  }
  ctx.restore();
}

export function drawShadow(ctx, def, x, y, color) {
  const s = def.scale || 1;
  ctx.beginPath();
  ctx.ellipse(x, y, def.shadow.rx * s, def.shadow.ry * s, 0, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}
