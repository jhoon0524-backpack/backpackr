// 정식 스프라이트 시트 실측 (data/sprites.js 에 적힌 시트): 그림과 판정이 같은 자리인지, 규격(투명도·발 위치·키)을 지키는지.
// 윤무겸: 1·2·3타 칼끝(가장 앞 불투명 칸) vs 판정 57px, 3타 칼날 길이·높이(코드 그림 판정 칼날과 비교), 3타 준비 → 찌르기 상체 이동.
// 도깨비: 펀치 주먹 끝 ≤ 적 사거리 52px. 시트가 없으면 "시트 없음"만 출력
const { GAME } = require('./paths');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--allow-file-access-from-files'] }); const errors = [];   // file:// 로 연 시트 그림을 읽으려면 (캔버스 오염 방지)
  const p = await b.newPage();
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(GAME.replace(/([?&])theme=[^&]*&?/, '$1')); await p.waitForTimeout(800);
  const r = await p.evaluate(() => {
    const out = {}, specs = BB_DATA.sprites || {};
    if (!Object.keys(specs).length) return { 결과: '시트 없음 (코드 그림)' };
    const S = ART.S, CX = ART.CX, FOOT = ART.FOOT;
    // 칸 하나의 불투명 칸 목록 → 몸 기준점 기준 화면 px (dx 앞쪽, h 위쪽)
    const scan = (id, name) => {
      const sh = ART.characters[id].sheet[name]; if (!sh) return null;
      const { footX, footY, scale } = ART.characters[id].spec, c = sh.img, d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      const px = []; let semi = 0;
      for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) { const a = d[(y * c.width + x) * 4 + 3];
        if (a > 0 && a < 255) semi++; if (a) px.push({ dx: (x - footX) * scale, dx1: (x + 1 - footX) * scale, h: (footY - y - 1) * scale, h1: (footY - y) * scale,   // h = 칸 아래 높이 (footY 줄 위가 바닥)
          rgb: (d[(y * c.width + x) * 4] << 16) | (d[(y * c.width + x) * 4 + 1] << 8) | d[(y * c.width + x) * 4 + 2] }); }
      return { px, semi, scale };
    };
    const front = s => Math.max(...s.px.map(q => q.dx1));
    // 띠(높이 h0~h1)에서 줄마다 가장 넓은 연속 칸의 가운데 → 평균 (팔·칼처럼 가는 것보다 몸통이 잡힘)
    // 이웃 칸 간격은 시트 배율(scale) 만큼 — 2px 시트는 dx 가 2씩 뛴다 (2026-10-28 수정: 예전엔 1 로 고정돼 2px 시트를 틀리게 쟀다)
    const bodyX = (s, h0, h1) => { const rows = {}, sc = s.scale; for (const q of s.px) if (q.h >= h0 && q.h < h1) (rows[q.h] = rows[q.h] || []).push(q.dx);
      const cs = Object.values(rows).map(xs => { xs.sort((a, b) => a - b); let best = [xs[0], xs[0]], cur = [xs[0], xs[0]];
        for (const x of xs.slice(1)) { if (x - cur[1] <= sc) cur[1] = x; else cur = [x, x]; if (cur[1] - cur[0] > best[1] - best[0]) best = [...cur]; }
        return (best[0] + best[1] + sc) / 2; });
      return cs.reduce((a, b) => a + b, 0) / cs.length; };
    for (const [id, spec] of Object.entries(specs)) {
      const names = Object.keys(spec.frames), all = names.map(n => [n, scan(id, n)]).filter(([, s]) => s);
      out[`${id} 칸 수`] = `${all.length} (${names.join(' ')})`;
      out[`${id} 반투명 테두리 칸`] = all.reduce((a, [, s]) => a + s.semi, 0) + ' (0 이어야 함)';
      const codeSole = (() => { const c = ART.characters[id].frames.idle0, d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let lo = 0;
        for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3]) lo = y; return (FOOT - lo - 1) * S; })();
      out[`${id} 발바닥 높이`] = all.map(([n, s]) => `${n} ${Math.min(...s.px.map(q => q.h))}`).join(' ') + ` (가장 낮은 칸 아래 높이 / 코드 그림 ${codeSole} — 같아야 칸이 섞여도 발이 안 튐)`;
      const top = s => Math.max(...s.px.map(q => q.h1)) - Math.min(...s.px.map(q => q.h));
      // 윤무겸 기준 (명세서 7절): 서기·걷기 110 ±4, 공격 칸은 자세에 따라 100~110
      const okH = (n, h) => id !== 'mugyeom' ? '' : /^(idle|walk)/.test(n) ? (h < 106 || h > 114 ? ' ✗' : '') : /^(windup|punch|punch2|kickPrep|kick|kickRecover)$/.test(n) ? (h < 100 || h > 110 ? ' ✗' : '') : '';
      out[`${id} 키`] = all.map(([n, s]) => `${n} ${top(s)}${okH(n, top(s))}`).join(' ') + ` (코드 그림 ${Math.round(ART.characters[id].height * S)}px, 시트 height ${spec.height || '-'}${id === 'mugyeom' ? ' · 기준 서기·걷기 110±4, 공격 100~110' : ''})`;
    }
    const m = n => scan('mugyeom', n);
    if (specs.mugyeom) {
      out['윤무겸 칼끝 vs 판정'] = ['punch', 'punch2', 'kick'].map((n, i) => { const s = m(n); if (!s) return `${n} 없음`; const t = front(s), R = ATTACKS[i].reach;
        const th = Math.max(...s.px.filter(q => q.dx1 === t).map(q => q.h)), cb = ART.hitShapes(PLAYER_ART, n).blade, cx = Math.max(...cb.map(c => c[0])), ch = Math.max(...cb.filter(c => c[0] === cx).map(c => (FOOT - c[1] - 1) * S));
        // 기준 (2026-10-28 오너 승인): 칼끝 = 판정 57 또는 1px 안쪽 56. 57 을 넘으면 칼이 닿고도 헛침, 56 보다 짧으면 허공에서 맞음 → ✗
        return `${i + 1}타 칼끝 ${t} / 판정 ${R} / 차이 ${Math.abs(t - R)}px${t > R || t < R - 1 ? ' ✗' : ''} (칼끝 높이 ${th}, 코드 그림 ${ch})`; }).join(' | ') + ' (기준 56~57)';
      const k = m('kick');
      if (k) {   // 칼날: 칼끝에서 뒤로 이어지는 가장 긴 가로 줄(밝은 강철색 줄) 길이
        const rows = {}; for (const q of k.px) if (q.dx >= 0) (rows[q.h] = rows[q.h] || []).push(q);
        let best = null; for (const [h, qs] of Object.entries(rows)) { qs.sort((a, b) => a.dx - b.dx); let run = [qs[qs.length - 1]];
          // 칼날 = 밝고 채도가 낮은 색(강철) — 손(피부)·코등이(금색)는 밝아도 채도가 높아 빠진다
          const steelish = v => { const r = v >> 16, g = (v >> 8) & 255, b = v & 255; return Math.min(r, g, b) > 110 && Math.max(r, g, b) - Math.min(r, g, b) < 40; };
          for (let i = qs.length - 2; i >= 0 && qs[i + 1].dx - qs[i].dx <= k.scale && steelish(qs[i].rgb); i--) run.push(qs[i]);
          if (!best || run.length > best.len) best = { h: +h, len: run[0].dx1 - run[run.length - 1].dx, from: run[run.length - 1].dx }; }
        const code = ART.hitShapes(PLAYER_ART, 'kick').blade.map(([, y]) => (FOOT - y - 1) * S);   // 코드 그림이 화면에 그려지는 높이 (FOOT 줄은 바닥선 아래로 그려져 판정 칸 높이보다 3px 낮음)
        out['윤무겸 3타 칼날'] = `길이 약 ${best.len}px${best.len < 45 || best.len > 51 ? ' ✗' : ''} (기준 45~51) (${best.from}~${front(k)}), 높이 ${best.h}px / 코드 그림 칼날(판정 칸) 화면 높이 ${Math.min(...code)}~${Math.max(...code) + S}px`;
      }
      const kp = m('kickPrep'), kr = m('kickRecover'), w = m('windup');
      if (k && kp) out['윤무겸 3타 상체 (몸통 띠 h70~84 가운데)'] = `준비 ${bodyX(kp, 70, 84).toFixed(1)} → 찌르기 ${bodyX(k, 70, 84).toFixed(1)} → 회수 ${kr ? bodyX(kr, 70, 84).toFixed(1) : '-'} : 찌르기에서 앞으로 ${(bodyX(k, 70, 84) - bodyX(kp, 70, 84)).toFixed(1)}px${(d => d < 9 || d > 12.5 ? ' ✗' : '')(bodyX(k, 70, 84) - bodyX(kp, 70, 84))} (기준 9~12) / 머리 띠 h86~100 ${(bodyX(k, 86, 100) - bodyX(kp, 86, 100)).toFixed(1)}px`;
      if (w && k) out['윤무겸 1·2타 준비 vs 3타 준비 (몸통 가운데)'] = `windup ${bodyX(w, 70, 84).toFixed(1)} / kickPrep ${kp ? bodyX(kp, 70, 84).toFixed(1) : '-'}`;
    }
    if (specs.dokkaebi) {
      const d = scan('dokkaebi', 'punch'), dw = scan('dokkaebi', 'windup');
      if (d) out['도깨비 펀치 주먹 끝'] = `${front(d)}px / 적 사거리 ${ENEMY_AI.reach}px${front(d) > ENEMY_AI.reach ? ' ✗' : ''}`;
      if (dw) out['도깨비 예고 앞끝'] = `${front(dw)}px (예고 그림엔 주먹 판정 없음, 몸 앞끝 판정 ${hurtHalf(ENEMY_TYPES.brute)}px)`;
      // 서기·걷기: 가드 주먹이 코드 그림의 주먹 판정 칸(tests/fists.js)과 같은 자리인지 — 판정 칸 안이 시트 그림으로 얼마나 차 있는지, 칸 밖으로 나온 주먹 끝,
      // 주먹 높이 밖의 몸 앞끝 vs hurtHalfWidth. 판정 칸 높이는 발바닥 기준이라 시트 높이(바닥선 기준, 발바닥 −3)에 3 을 더해 비교
      for (const n of ['idle0', 'idle1', 'walk0', 'walk1', 'walk2', 'walk3']) {
        const d2 = scan('dokkaebi', n); if (!d2) continue;
        const boxes = ART.hitShapes('dokkaebi', n).fists.map(([x, y, w, h]) => [(x - CX) * S, (x + w - CX) * S, (FOOT - y - h) * S, (FOOT - y) * S]);
        const fill = boxes.map(([x0, x1, h0, h1]) => { let n0 = 0; for (const q of d2.px) if (q.dx >= x0 && q.dx < x1 && q.h + 3 >= h0 && q.h + 3 < h1) n0++; return Math.round(100 * n0 / ((x1 - x0) * (h1 - h0))); });
        const inFist = q => boxes.some(([, , h0, h1]) => q.h + 3 >= h0 - 3 && q.h + 3 < h1 + 3);
        const bodyFront = Math.max(...d2.px.filter(q => !inFist(q) && q.h > 6).map(q => q.dx1));
        out[`도깨비 ${n} 가드 주먹`] = `판정 칸 채움 ${fill.join('% / ')}% · 주먹 끝 ${front(d2)}px (판정 칸 끝 ${Math.max(...boxes.map(b => b[1]))}px) · 주먹 높이 밖 몸 앞끝 ${bodyFront}px (판정 ${hurtHalf(ENEMY_TYPES.brute)} ±3)`;
      }
    }
    return out;
  });
  for (const [k, v] of Object.entries(r)) console.log(k.padEnd(30), v);
  console.log('errors', errors); await b.close();
})();
