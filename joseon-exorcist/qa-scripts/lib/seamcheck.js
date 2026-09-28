// 환경 타일 이음새 판정 (기획자 확정 기준, 2026-09-27):
// "원본 픽셀 완전 연속이 아니라, 실제 게임 표시 크기에서 인위적인 반복 세로 이음새가 눈에 띄지 않는가"
// → 브라우저 안에서 그림의 열(세로줄)별 평균 밝기를 구해 두 가지만 이음새로 본다
//   1) 가장자리 띠: 칸 끝에 붙은 어두운 열(≤20)이 이어지고, 바로 안쪽 그림보다 급격히 어두움(안쪽 8열 평균의 절반 이하)
//      → 칸 사이 틈(2px)에 섞이면 안 보인다. 게임 크기로 틈 너비(+반올림 0.1px)보다 넓으면 이음새
//   2) 안쪽 선: 칸 끝에 붙지 않은 어두운 골(≤20, 3열 이상) — 골 양옆 12열 안에 뚜렷이 밝은 열(골+15 이상)이 있고,
//      골과 칸 끝 사이가 어둡지 않음(평균 >20)
//      → 틈과 떨어진 선이라 모든 칸에 반복되어 보인다 (끝에서 25% 안쪽 영역만 봄)
// 반환: { ok, edgeL, edgeR (게임 크기 px), inner: [...] }
module.exports = function seamCheckSource() {
  return function (src, cellPx, gapPx) {
    return new Promise((ok) => { const im = new Image(); im.onerror = () => ok({ ok: false, error: 'load' }); im.onload = () => {
      const W = im.naturalWidth, H = im.naturalHeight, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.drawImage(im, 0, 0); const d = x.getImageData(0, 0, W, H).data;
      const m = []; for (let X = 0; X < W; X++) { let s = 0; for (let y = 0; y < H; y++) { const i = (y * W + X) * 4; s += (d[i] + d[i + 1] + d[i + 2]) / 3; } m.push(s / H); }
      const DARK = 20, px = (n) => +(n / W * cellPx).toFixed(2);
      const avg = (a, b) => { const s = m.slice(Math.max(0, a), Math.min(W, b)); return s.reduce((p, q) => p + q, 0) / s.length; };
      const edge = (fromLeft) => { let n = 0; while (n < W && m[fromLeft ? n : W - 1 - n] <= DARK) n++; if (!n) return 0;
        const strip = fromLeft ? avg(0, n) : avg(W - n, W), inner = fromLeft ? avg(n, n + 8) : avg(W - n - 8, W - n);
        return strip <= inner * 0.5 ? px(n) : 0; }; // 안쪽과 급격히 다를 때만 "띠" (자연스러운 어두운 그림은 제외)
      const eL = edge(true), eR = edge(false);
      const inner = []; const zone = Math.round(W * 0.25);
      for (let X = 0; X < W; X++) { if (m[X] > DARK) continue; let e = X; while (e + 1 < W && m[e + 1] <= DARK) e++;
        const touches = X === 0 || e === W - 1, near = X < zone || e >= W - zone;
        if (!touches && near && e - X + 1 >= 3) { const low = Math.min(...m.slice(X, e + 1)), leftSide = X < W - 1 - e;
          const ridge = Math.max(...m.slice(Math.max(0, X - 12), X), ...m.slice(e + 1, Math.min(W, e + 13))); // 골 양옆 12열 안의 가장 밝은 열
          const outerAvg = leftSide ? avg(0, X) : avg(e + 1, W); // 골과 칸 끝 사이 — 어둡지 않으면 틈과 떨어진 선
          if (ridge >= low + 15 && outerAvg > DARK) inner.push(X + '-' + e + '(골' + Math.round(low) + ',옆' + Math.round(ridge) + ',바깥' + Math.round(outerAvg) + ')'); }
        X = e; }
      const lim = gapPx + 0.1;
      ok({ ok: eL <= lim && eR <= lim && inner.length === 0, edgeL: eL, edgeR: eR, inner: inner.join(' ') }); }; im.src = src; });
  };
};
