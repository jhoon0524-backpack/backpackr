// 도형 하나를 그리는 공용 함수. 캐릭터 파츠·이펙트·배경이 모두 이걸 쓴다.
// 도형 종류: rect {x,y,w,h,r} / ellipse {x,y,rx,ry} / poly {pts} / capsule {from,to,w}

export function tracePath(ctx, s) {
  ctx.beginPath();
  if (s.type === 'rect') {
    if (s.r) ctx.roundRect(s.x, s.y, s.w, s.h, s.r);
    else ctx.rect(s.x, s.y, s.w, s.h);
  } else if (s.type === 'ellipse') {
    ctx.ellipse(s.x || 0, s.y || 0, s.rx, s.ry ?? s.rx, 0, 0, Math.PI * 2);
  } else if (s.type === 'poly') {
    s.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
  } else if (s.type === 'capsule') {
    ctx.moveTo(s.from[0], s.from[1]);
    ctx.lineTo(s.to[0], s.to[1]);
  } else {
    throw new Error(`모르는 도형 종류: ${s.type}`);
  }
}

// outline이 있으면 외곽선 색으로 한 겹 두껍게 칠한다 (윗 패스에서 채움색을 덮어 외곽만 남김).
export function paintShape(ctx, s, color, outline) {
  tracePath(ctx, s);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (s.type === 'capsule') {
    ctx.strokeStyle = outline ? outline.color : color;
    ctx.lineWidth = s.w + (outline ? outline.width * 2 : 0);
    ctx.stroke();
    return;
  }
  ctx.fillStyle = outline ? outline.color : color;
  ctx.fill();
  if (outline) {
    ctx.strokeStyle = outline.color;
    ctx.lineWidth = outline.width * 2;
    ctx.stroke();
  }
}

export function resolveColor(palette, c) {
  return palette && palette[c] !== undefined ? palette[c] : c;
}

// 배경 요소: 도형 + color(+ outline) + repeat {dx, dy, count}
export function drawLayer(ctx, layer, palette) {
  const rep = layer.repeat || { dx: 0, dy: 0, count: 1 };
  const outline = layer.outline && { color: resolveColor(palette, layer.outline.color), width: layer.outline.width };
  for (let i = 0; i < rep.count; i++) {
    ctx.save();
    ctx.translate((rep.dx || 0) * i, (rep.dy || 0) * i);
    if (outline) paintShape(ctx, layer, null, outline);
    paintShape(ctx, layer, resolveColor(palette, layer.color));
    ctx.restore();
  }
}
