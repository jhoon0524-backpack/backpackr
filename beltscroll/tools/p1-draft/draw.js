// P1 정식 스프라이트 시안 (Claude 가 코드로 그린 시안, 2026-10-28). 설정화 03(윤무겸 디자인)·06·07(세밀한 도트 결) 기준.
// 기본 128×128 칸, 발바닥 아래끝 (64, 124), 화면 1px = 그림 1px (scale 1). 오른쪽을 보는 방향.
// 2px 시험(2026-10-28 오너 결정): 같은 관절 자리·색으로 그림 1칸 = 화면 2px (64×64 칸, scale 2) — makeDrawer(2)
// 칸마다 관절 자리(몸 기준점 앞쪽 dx, 바닥 위 높이 h)를 손으로 정하고, 부위마다 4단 색(외곽·그림자·바탕·밝은 면)으로 칠한다.
// 브라우저에서 돌린다 (build.js 가 Playwright 로 열어 PNG 로 저장).
(() => {
function makeDrawer(R) {   // R = 그림 1칸이 화면 몇 px 인지 (1 또는 2). 관절 자리는 화면 px 로 적고 여기서 칸으로 바꾼다
  const W = 128 / R, H = 128 / R, FX = 64 / R, FY = 124 / R;
  const X = dx => FX + dx / R, Y = h => FY - h / R;

  // ── 재질: [외곽, 그림자, 바탕, 밝은 면] — 03 "주요 색상"(먹색·남청·회갈·주홍·금속·누런 백색) + 07 의 3단 명암
  const M = {
    coat:   ['#0c0e15', '#1b1f2c', '#283048', '#3d4a6a'],   // 남청 도포
    coatF:  ['#090a10', '#151822', '#1f2537', '#2f3850'],   // 먼 쪽(어둡게)
    mantle: ['#080809', '#141416', '#1f1f23', '#33333b'],   // 먹색 어깨 망토
    pants:  ['#0d0c10', '#1c1a20', '#2b2930', '#403d47'],
    pantsF: ['#0a090c', '#151418', '#211f25', '#302d36'],
    inner:  ['#5f574b', '#b3a892', '#e3d7c1', '#f6efe2'],   // 누런 백색 속자락·깃
    boots:  ['#050505', '#101010', '#1d1b1a', '#38322f'],
    skin:   ['#55301f', '#b5835d', '#dfae86', '#f1cca6'],
    skinF:  ['#45261a', '#9a6e4e', '#c39470', '#d9b08c'],
    hair:   ['#040406', '#0c0c10', '#18181e', '#30303a'],
    belt:   ['#1a100a', '#382417', '#553828', '#7a5440'],
    gold:   ['#3a2b1a', '#7a6046', '#a8875f', '#dcbd8c'],
    red:    ['#360d09', '#6e2219', '#a83a2b', '#d4573f'],
    steel:  ['#3f4a55', '#8f9aa4', '#c6cfd5', '#f3f6f8'],
    bracer: ['#110b07', '#2a1d15', '#3d2c21', '#5c4535'],
    sheath: ['#070707', '#121212', '#1d1c1b', '#34302d'],
    grip:   ['#0b0807', '#1c1412', '#2a1d19', '#4a2c26'],
    // 도깨비 (07 도깨비: 붉은 근육·상아색 뿔·검은 갈기·새끼줄·짚 치마·붕대·방울)
    dskin:  ['#3c0e0b', '#7e2a22', '#b5463b', '#de7a62'],
    dskinF: ['#300b09', '#68221c', '#943a31', '#b85a4a'],
    horn:   ['#5a4e38', '#b9ab88', '#e6dcc2', '#fbf6e8'],
    dhair:  ['#050404', '#120d0c', '#201817', '#3a2e2a'],
    straw:  ['#3b301c', '#7d6a42', '#a8915c', '#cdb780'],
    rope:   ['#2e2414', '#6b5734', '#958052', '#bfa877'],
    wrap:   ['#3e382b', '#7d735d', '#a89d80', '#c9bf9f'],
    eye:    ['#2a1c05', '#b88f16', '#f2d14a', '#fff2a8'],
  };

  // ── 그리기 바탕: 칸 하나 = 색 번호 배열. 부위를 캔버스 경로로 그려 알파 128 이상만 칸으로 삼는다(반투명 테두리 없음)
  const scratch = document.createElement('canvas'); scratch.width = W; scratch.height = H;
  const sg = scratch.getContext('2d', { willReadFrequently: true });
  function newFrame() { return { px: new Array(W * H).fill(null), part: new Int32Array(W * H).fill(-1), edge: new Array(W * H).fill(null), n: 0 }; }
  function maskOf(fn) {
    sg.clearRect(0, 0, W, H); sg.save(); sg.fillStyle = '#000'; sg.strokeStyle = '#000'; sg.lineCap = 'round'; sg.lineJoin = 'round';
    fn(sg); sg.restore();
    const d = sg.getImageData(0, 0, W, H).data, m = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) m[i] = d[i * 4 + 3] >= 128 ? 1 : 0;
    return m;
  }
  const at = (m, x, y) => x >= 0 && y >= 0 && x < W && y < H && m[y * W + x] === 1;
  // 부위 하나를 칠한다. opt.flat: 외곽선 없이(가는 부위), opt.tex: 바탕에 그림자색 점 무늬(옷감 결), opt.noShade
  function paint(fr, mat, fn, opt = {}) {
    const m = maskOf(fn), id = fr.n++, [o, s, b, hi] = M[mat];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!m[y * W + x]) continue;
      const edge = !at(m, x - 1, y) || !at(m, x + 1, y) || !at(m, x, y - 1) || !at(m, x, y + 1);
      let c = b;
      if (!opt.noShade) {
        if (!at(m, x, y - 1) || !at(m, x + 1, y - 1)) c = hi;                                          // 위·앞(빛 쪽) 가장자리
        else if (R === 1 ? (!at(m, x - 2, y + 1) || !at(m, x - 1, y + 2) || !at(m, x, y + 3) || !at(m, x - 3, y))
                         : (!at(m, x - 1, y + 1) || !at(m, x, y + 2) || !at(m, x - 2, y))) c = s;   // 뒤·아래 그림자 띠 (2px 는 칸이 커서 1칸 남짓)
        else if (opt.tex && ((x * 7 + y * 13 + (x * y) % 5) % opt.tex === 0)) c = s;
      }
      // 2px 도트: 부위 경계는 그림자색, 바깥 윤곽(투명과 맞닿은 칸)만 외곽선 — 마지막에 sheet() 에서 정함 (1칸 = 2px 라 모든 경계를 외곽선으로 하면 뭉개짐)
      if (edge && !opt.flat) { if (R === 1) c = o; else { c = s; fr.edge[y * W + x] = o; } } else fr.edge[y * W + x] = null;
      fr.px[y * W + x] = c; fr.part[y * W + x] = id;
    }
    return m;
  }
  // 경로 도우미 (dx, h 좌표)
  const P = (g, pts) => { g.beginPath(); pts.forEach(([dx, h], i) => i ? g.lineTo(X(dx), Y(h)) : g.moveTo(X(dx), Y(h))); g.closePath(); g.fill(); };
  const L = (g, pts, w) => { g.lineWidth = Math.max(w / R, 1); g.beginPath(); pts.forEach(([dx, h], i) => i ? g.lineTo(X(dx), Y(h)) : g.moveTo(X(dx), Y(h))); g.stroke(); };
  const Cc = (g, [dx, h], r) => { g.beginPath(); g.arc(X(dx), Y(h), Math.max(r / R, 0.8), 0, Math.PI * 2); g.fill(); };
  const E = (g, [dx, h], rx, ry, rot = 0) => { g.beginPath(); g.ellipse(X(dx), Y(h), Math.max(rx / R, 0.8), Math.max(ry / R, 0.8), rot, 0, Math.PI * 2); g.fill(); };
  const box = (g, [x0, x1, h0, h1], r = 4) => { g.beginPath(); g.roundRect(X(x0), Y(h1), (x1 - x0) / R, (h1 - h0) / R, r / R); g.fill(); };   // [앞쪽 x0~x1, 높이 h0~h1] 둥근 네모
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const add = (a, v) => [a[0] + v[0], a[1] + v[1]];
  const dir = (deg, len) => [Math.cos(deg * Math.PI / 180) * len, Math.sin(deg * Math.PI / 180) * len];   // 0° = 앞, 90° = 위

  // ── 윤무겸 부위
  function leg(fr, L0, far) {   // L0 = { hip, knee, ankle }
    const pm = far ? 'pantsF' : 'pants';
    paint(fr, pm, g => { L(g, [L0.hip, L0.knee], 12); L(g, [L0.knee, add(L0.ankle, [0, 8])], 9); });   // 통 넓은 바지
    paint(fr, 'boots', g => {   // 중목 신발 + 발
      L(g, [lerp(L0.knee, L0.ankle, 0.42), L0.ankle], 9);
      const a = L0.ankle, t = L0.toe || 1;
      P(g, [[a[0] - 4 * t, a[1] + 3], [a[0] + 3 * t, a[1] + 3], [a[0] + 10 * t, a[1] - 1], [a[0] + 10 * t, a[1] - 5], [a[0] - 5 * t, a[1] - 5]]);   // 발바닥 = 바닥(h 0)
    });
  }
  function sleeve(fr, sh, el, wr, far) {
    paint(fr, far ? 'coatF' : 'coat', g => { L(g, [sh, el], 11); L(g, [el, wr], 10); }, { tex: 37 });
    paint(fr, 'bracer', g => { L(g, [lerp(el, wr, 0.55), wr], 7); });   // 가죽 팔토시
  }
  function hand(fr, wr, el, far, r = 3) { const d = [wr[0] - el[0], wr[1] - el[1]], n = Math.hypot(...d) || 1;
    paint(fr, far ? 'skinF' : 'skin', g => Cc(g, add(wr, [d[0] / n * 2.5, d[1] / n * 2.5]), r)); }
  function sword(fr, grip, ang, blade = 48) {   // grip = 손 자리, ang = 칼날 방향(도), blade = 칼날 길이 px
    const u = dir(ang, 1), back = add(grip, [-u[0] * 8, -u[1] * 8]), guard = add(grip, [u[0] * 4, u[1] * 4]);
    const tip = add(guard, [u[0] * blade, u[1] * blade]), n = [-u[1], u[0]];
    paint(fr, 'grip', g => L(g, [back, guard], 3));
    paint(fr, 'red', g => Cc(g, add(back, [-u[0] * 1.5, -u[1] * 1.5]), 1.6), { flat: true });   // 자루 끝 주홍 매듭
    paint(fr, 'steel', g => { g.lineCap = 'butt'; L(g, [guard, add(tip, [-u[0] * 4, -u[1] * 4])], 2.6);   // 칼날 (가는 끝이 칸에서 사라지지 않게 굵기를 고정하고 끝만 뾰족하게)
      P(g, [add(tip, [-u[0] * 5 + n[0] * 1.3, -u[1] * 5 + n[1] * 1.3]), add(tip, [u[0] * 0.6, u[1] * 0.6]), add(tip, [-u[0] * 5 - n[0] * 1.3, -u[1] * 5 - n[1] * 1.3])]); }, { flat: true });
    paint(fr, 'gold', g => L(g, [add(guard, [n[0] * 3, n[1] * 3]), add(guard, [-n[0] * 3, -n[1] * 3])], 2.6), { flat: true });   // 코등이
    return tip;
  }
  function sheathed(fr, hilt, ang) {   // 허리에 찬 칼 (칼집 + 앞으로 나온 자루)
    const u = dir(ang, 1), end = add(hilt, [u[0] * 50, u[1] * 50]);
    paint(fr, 'sheath', g => L(g, [add(hilt, [u[0] * 9, u[1] * 9]), end], 4));
    paint(fr, 'gold', g => { L(g, [add(hilt, [u[0] * 9, u[1] * 9]), add(hilt, [u[0] * 11, u[1] * 11])], 4.5); L(g, [add(end, [-u[0] * 3, -u[1] * 3]), end], 4.5); }, { flat: true });
    paint(fr, 'grip', g => L(g, [add(hilt, [-u[0] * 1, -u[1] * 1]), add(hilt, [u[0] * 8, u[1] * 8])], 3));
  }
  function torso(fr, p) {   // 도포 몸통·자락·속자락·띠·술·깃·망토
    const { C, Pv, legs } = p;
    const front = legs[0].ankle[0] >= legs[1].ankle[0] ? legs[0] : legs[1], rear = front === legs[0] ? legs[1] : legs[0];
    const mid = (front.knee[0] + rear.knee[0]) / 2, hem = p.hem || 20;
    paint(fr, 'coatF', g => P(g, [[Pv[0] + 3, Pv[1] + 6], [Pv[0] - 11, Pv[1] + 6], [rear.knee[0] - 15, hem + 6], [rear.knee[0] - 10, hem - 2], [mid, hem + 1]]), { tex: 41 });   // 뒷자락
    paint(fr, 'inner', g => P(g, [[Pv[0] - 1, Pv[1] + 2], [Pv[0] + 3, Pv[1] + 2], [mid + 4, hem - 3], [mid - 3, hem - 3]]));          // 갈라진 앞으로 보이는 누런 백색 속자락
    paint(fr, 'coat', g => P(g, [[Pv[0] + 11, Pv[1] + 6], [Pv[0] - 1, Pv[1] + 6], [mid - 1, hem + 2], [front.knee[0] + 8, hem - 1], [front.knee[0] + 13, hem + 9]]), { tex: 41 });   // 앞자락
    paint(fr, 'coat', g => P(g, [[C[0] - 11, C[1] + 2], [C[0] + 10, C[1]], [Pv[0] + 11, Pv[1] + 5], [Pv[0] - 11, Pv[1] + 5]]), { tex: 41 });   // 몸통
    paint(fr, 'inner', g => P(g, [[C[0] + 1, C[1] + 3], [C[0] + 7, C[1] + 2], [C[0] + 4, C[1] - 7]]));   // 흰 속깃 V
    paint(fr, 'red', g => L(g, [[C[0] + 7, C[1] - 1], [Pv[0] - 6, Pv[1] + 9]], 2), { flat: true });       // 주홍 가슴끈
    paint(fr, 'belt', g => P(g, [[Pv[0] - 12, Pv[1] + 9], [Pv[0] + 12, Pv[1] + 8], [Pv[0] + 12, Pv[1] + 3], [Pv[0] - 12, Pv[1] + 4]]));   // 가죽 띠
    paint(fr, 'gold', g => { P(g, [[Pv[0] + 3, Pv[1] + 9], [Pv[0] + 7, Pv[1] + 9], [Pv[0] + 7, Pv[1] + 3], [Pv[0] + 3, Pv[1] + 3]]); }, { flat: true });   // 띠 장식
    // 술(노리개) 두 줄: 금 매듭 + 주홍 술
    for (const [ox, len] of [[4, 13], [-2, 10]]) {
      const top = [Pv[0] + ox, Pv[1] + 3];
      paint(fr, 'gold', g => Cc(g, add(top, [0, -2]), 1.6), { flat: true });
      paint(fr, 'red', g => P(g, [add(top, [-1, -3]), add(top, [1.5, -3]), add(top, [2.5, -3 - len]), add(top, [-2, -3 - len])]));
    }
    // 어깨 망토 (해진 끝)
    paint(fr, 'mantle', g => P(g, [[C[0] + 11, C[1] + 2], [C[0] + 2, C[1] + 7], [C[0] - 12, C[1] + 5], [C[0] - 17, C[1] - 6], [C[0] - 15, C[1] - 15], [C[0] - 11, C[1] - 11],
      [C[0] - 7, C[1] - 16], [C[0] - 4, C[1] - 12], [C[0] - 1, C[1] - 15], [C[0] + 2, C[1] - 10], [C[0] + 7, C[1] - 9], [C[0] + 10, C[1] - 4]]), { tex: 13 });
  }
  function head(fr, Hc, tilt = 0) {   // Hc = 머리 중심, tilt = 앞으로 숙임(px)
    const hx = Hc[0], hh = Hc[1];
    paint(fr, 'hair', g => { E(g, [hx - 3, hh - 3], 6, 9); L(g, [[hx - 5, hh + 2], [hx - 10 - tilt, hh - 12]], 3); L(g, [[hx - 3, hh], [hx - 6, hh - 14]], 2.5); });   // 뒤로 흘러내린 머리
    paint(fr, 'skin', g => { E(g, [hx + 1, hh + 1], 7, 8); P(g, [[hx - 1, hh - 3], [hx + 7, hh - 3], [hx + 4, hh - 8], [hx + 1, hh - 8]]); });   // 얼굴·턱
    paint(fr, 'hair', g => { P(g, [[hx - 7, hh + 3], [hx - 6, hh + 8], [hx - 1, hh + 10], [hx + 6, hh + 9], [hx + 8, hh + 5], [hx + 3, hh + 6], [hx - 1, hh + 4], [hx - 3, hh - 1], [hx - 7, hh - 2]]);
      L(g, [[hx + 5, hh + 6], [hx + 7, hh - 2]], 1.6); L(g, [[hx + 2, hh + 6], [hx + 3, hh - 1]], 1.3); });   // 머리 위·앞머리 가닥
    paint(fr, 'skin', g => E(g, [hx - 2, hh], 1.6, 2.2));   // 귀
    paint(fr, 'hair', g => E(g, [hx - 2, hh + 12], 3.2, 3.6));   // 상투
    paint(fr, 'gold', g => P(g, [[hx - 5, hh + 10], [hx + 1, hh + 10], [hx + 1, hh + 13], [hx - 5, hh + 13]]), { flat: true });   // 금속 관
    paint(fr, 'red', g => { L(g, [[hx - 5, hh + 12], [hx - 11 - tilt, hh + 9]], 1.4); L(g, [[hx - 5, hh + 11], [hx - 10 - tilt, hh + 6]], 1.2); }, { flat: true });   // 붉은 끈
    // 눈·눈썹·입 (한 칸씩)
    const set = (dx, h, c) => { const i = Math.round(Y(h)) * W + Math.round(X(dx)); if (i >= 0 && i < W * H) fr.px[i] = c; };
    if (R === 1) { set(hx + 4, hh + 1, '#120d10'); set(hx + 5, hh + 1, '#120d10'); set(hx + 4, hh + 3, '#1a1414'); set(hx + 5, hh + 3, '#1a1414'); set(hx + 6, hh + 3, '#1a1414');
      set(hx + 5, hh - 5, '#8a5a44'); }
    else { set(hx + 2, hh + 1, '#120d10'); set(hx + 2, hh + 3, '#2a1a16'); set(hx + 4, hh + 3, '#2a1a16'); set(hx + 4, hh - 5, '#8a5a44'); }   // 2px: 눈 1칸을 얼굴 안쪽으로(앞 윤곽에 묻히지 않게) + 눈썹 2칸 + 입
  }
  // 윤무겸 한 칸
  function mugyeom(p) {
    if (R === 2 && p.nearArm.wr2) p = { ...p, nearArm: { el: p.nearArm.el2, wr: p.nearArm.wr2 } };   // 2px 판만 손 자리를 옮김 (칼날이 손에 가리지 않게)
    const fr = newFrame(), { C, Pv, Hc } = p;
    const shF = add(C, [-5, 1]), shN = add(C, [5, -1]);   // 먼 어깨·가까운 어깨
    // 먼 팔 → 먼 다리 → 가까운 다리 → (칼집) → 몸 → 머리 → 가까운 팔 → 칼 → 가까운 손
    sleeve(fr, shF, p.farArm.el, p.farArm.wr, true);
    if (!p.farArm.onGrip) hand(fr, p.farArm.wr, p.farArm.el, true);
    const legs = p.legs.map(l => ({ ...l, hip: add(Pv, [l.far ? -3 : 3, 0]) }));
    for (const l of legs.filter(l => l.far)) leg(fr, l, true);
    for (const l of legs.filter(l => !l.far)) leg(fr, l, false);
    if (p.sheath) sheathed(fr, p.sheath.hilt, p.sheath.ang);
    torso(fr, { ...p, legs });
    head(fr, Hc, p.tilt || 0);
    sleeve(fr, shN, p.nearArm.el, p.nearArm.wr, false);
    let tip = null;
    if (p.sword) tip = sword(fr, (R === 2 && p.sword.grip2) || p.sword.grip, p.sword.ang, (R === 2 && p.sword.blade2) || p.sword.blade);   // grip2·blade2: 2px 판 칼끝 56px(판정 57 이하)·칼날 45px 이상에 맞춘 손 자리·길이
    if (p.farArm.onGrip) hand(fr, p.farArm.wr, p.farArm.el, true);
    hand(fr, p.nearArm.wr, p.nearArm.el, false);
    return { fr, tip };
  }

  // ── 윤무겸 칸들 (dx = 몸 기준점 앞쪽 px, h = 바닥 위 px). 다리: { knee, ankle, far, toe }
  const lg = (knee, ankle, far, toe = 1) => ({ knee, ankle, far, toe });
  const MUG = {
    // 서기: 왼손은 칼집, 오른손은 자루에 (뽑을 준비)
    idle0: { C: [0, 81], Pv: [-1, 57], Hc: [2, 95], legs: [lg([-6, 31], [-9, 5], true), lg([6, 31], [8, 5], false)],
             farArm: { el: [-6, 67], wr: [1, 60] }, nearArm: { el: [6, 66], wr: [11, 62] }, sheath: { hilt: [13, 63], ang: 214 } },
    walk0: { C: [2, 80], Pv: [0, 56], Hc: [4, 94], legs: [lg([-5, 30], [-14, 7], true), lg([8, 31], [14, 5], false)],
             farArm: { el: [-4, 67], wr: [3, 60] }, nearArm: { el: [7, 66], wr: [12, 61] }, sheath: { hilt: [14, 62], ang: 212 } },
    walk1: { C: [2, 81], Pv: [0, 57], Hc: [4, 95], legs: [lg([3, 34], [-1, 13], true), lg([3, 32], [1, 5], false)],
             farArm: { el: [-5, 67], wr: [2, 60] }, nearArm: { el: [7, 66], wr: [12, 62] }, sheath: { hilt: [14, 63], ang: 215 } },
    walk2: { C: [2, 80], Pv: [0, 56], Hc: [4, 94], legs: [lg([8, 31], [13, 5], true), lg([-5, 30], [-14, 7], false)],
             farArm: { el: [-5, 66], wr: [2, 59] }, nearArm: { el: [7, 65], wr: [12, 61] }, sheath: { hilt: [14, 62], ang: 212 } },
    walk3: { C: [2, 81], Pv: [0, 57], Hc: [4, 95], legs: [lg([3, 32], [1, 5], true), lg([3, 34], [-1, 13], false)],
             farArm: { el: [-5, 67], wr: [2, 60] }, nearArm: { el: [7, 66], wr: [12, 62] }, sheath: { hilt: [14, 63], ang: 215 } },
    // 1·2타 준비: 칼을 오른 어깨 뒤로 높이 들어 올림, 몸을 뒤로 틂
    windup: { C: [-3, 80], Pv: [-2, 56], Hc: [-1, 94], legs: [lg([-9, 29], [-15, 5], true), lg([9, 30], [14, 5], false)],
              farArm: { el: [-1, 72], wr: [-6, 84], onGrip: true }, nearArm: { el: [3, 86], wr: [-4, 91] }, sword: { grip: [-5, 90], ang: 158, blade: 46 } },
    // 1타 내려베기: 가슴 앞에서 45° 앞 아래로 (칼끝 57, 높이 30)
    punch: { C: [3, 79], Pv: [0, 55], Hc: [6, 93], legs: [lg([-10, 28], [-18, 5], true), lg([12, 30], [17, 5], false)],
             farArm: { el: [7, 71], wr: [14, 68], onGrip: true }, nearArm: { el: [11, 75], wr: [18, 70] }, sword: { grip: [18, 69], ang: -43, blade: 50 } },
    // 2타 올려베기: 허리 앞에서 45° 앞 위로 (칼끝 57, 높이 84)
    punch2: { C: [2, 80], Pv: [0, 56], Hc: [4, 94], legs: [lg([-8, 29], [-13, 5], true), lg([10, 31], [14, 5], false)],
              farArm: { el: [-9, 70], wr: [-15, 63] }, nearArm: { el: [10, 63], wr: [17, 52] }, sword: { grip: [18, 51], ang: 42, blade: 49 } },
    // 3타 준비: 상체·어깨를 뒤로 당기고 칼을 오른 허리로 거둬 수평으로 겨눔, 왼손은 앞으로 뻗어 겨냥
    kickPrep: { C: [-22, 78], Pv: [-16, 55], Hc: [-22, 92], tilt: -1, legs: [lg([-22, 28], [-31, 5], true), lg([0, 30], [4, 5], false)],
                farArm: { el: [-6, 77], wr: [3, 76] }, nearArm: { el: [-22, 68], wr: [-17, 63] }, sword: { grip: [-16, 63], ang: 2, blade: 46 } },
    // 3타 찌르기: 앞발을 크게 내딛고 상체를 앞으로(준비보다 약 11px), 칼 수평 (칼끝 57, 칼날 46, 높이 약 61)
    kick: { C: [-6, 76], Pv: [-11, 51], Hc: [-1, 89], tilt: 2, legs: [lg([-25, 24], [-38, 5], true), lg([5, 27], [11, 5], false)],
            farArm: { el: [-20, 72], wr: [-28, 66] }, nearArm: { el: [-1, 68], wr: [6, 63], el2: [-6, 69], wr2: [1, 63] }, sword: { grip: [5, 61], ang: 0, blade: 50, grip2: [0, 61], blade2: 53 } },
    // 3타 회수: 칼끝을 앞 아래로 내리며 거두고 기본 자세로 돌아옴
    kickRecover: { C: [-4, 80], Pv: [-4, 56], Hc: [-2, 94], legs: [lg([-10, 30], [-15, 5], true), lg([5, 31], [8, 5], false)],
                   farArm: { el: [-9, 67], wr: [-4, 60] }, nearArm: { el: [3, 67], wr: [8, 62] }, sword: { grip: [8, 62], ang: -28, blade: 46 } },
  };
  const MUG_ORDER = ['idle0', 'walk0', 'walk1', 'walk2', 'walk3', 'windup', 'punch', 'punch2', 'kickPrep', 'kick', 'kickRecover'];

  // ── 도깨비 (07 도깨비 디자인을 게임 덩치에 맞춤, 키 117px)
  function dokkaebi(p) {
    const fr = newFrame(), { C, Pv, Hc } = p;
    const shF = add(C, [-9, 2]), shN = add(C, [8, -1]);
    const limb = (mat, a, b, c, w1, w2) => paint(fr, mat, g => { L(g, [a, b], w1); L(g, [b, c], w2); });
    // 먼 팔
    limb('dskinF', shF, p.farArm.el, p.farArm.wr, 13, 11);
    paint(fr, 'wrap', g => L(g, [lerp(p.farArm.el, p.farArm.wr, 0.45), p.farArm.wr], 11));
    paint(fr, 'dskinF', g => { if (p.farArm.box) return box(g, p.farArm.box); const c0 = add(p.farArm.wr, p.farArm.fist || [2, 0]); box(g, [c0[0] - 6, c0[0] + 6, c0[1] - 6, c0[1] + 6]); });
    // 다리 (맨발, 정강이 붕대)
    for (const l of p.legs) {
      const hip = add(Pv, [l.far ? -7 : 7, 0]), mat = l.far ? 'dskinF' : 'dskin';
      limb(mat, hip, l.knee, l.ankle, 15, 12);
      paint(fr, 'wrap', g => L(g, [lerp(l.knee, l.ankle, 0.35), add(l.ankle, [0, 2])], 12));
      paint(fr, mat, g => P(g, [add(l.ankle, [-6, 2]), add(l.ankle, [11, -1]), add(l.ankle, [12, -5]), add(l.ankle, [-6, -5])]));
    }
    // 몸통 (근육 덩어리) + 배
    // 몸 앞끝(주먹 제외)이 판정 hurtHalfWidth 27px 근처에 오게 배를 앞으로 크게 (2026-10-28, tests/sheets.js)
    paint(fr, 'dskin', g => { P(g, [[C[0] - 15, C[1] + 4], [C[0] + 16, C[1] + 2], [C[0] + 21, C[1] - 12], [Pv[0] + 20, Pv[1] + 4], [Pv[0] - 12, Pv[1] + 4], [C[0] - 16, C[1] - 12]]);
      E(g, [C[0] + 8, C[1] - 20], 17, 11); });
    paint(fr, 'dskin', g => { E(g, [C[0] + 6, C[1] - 8], 7, 5); E(g, [C[0] - 5, C[1] - 7], 6, 5); });   // 가슴 근육
    // 근육 결 (그림자 줄)
    paint(fr, 'dskinF', g => { L(g, [[C[0] + 1, C[1] - 4], [C[0] + 2, C[1] - 24]], 1.2); L(g, [[C[0] - 6, C[1] - 9], [C[0] + 9, C[1] - 10]], 1.2); }, { flat: true, noShade: true });
    // 새끼줄 띠 + 짚 치마 + 방울
    paint(fr, 'straw', g => P(g, [[Pv[0] - 15, Pv[1] + 6], [Pv[0] + 21, Pv[1] + 6], [Pv[0] + 26, Pv[1] - 16], [Pv[0] + 14, Pv[1] - 12], [Pv[0] + 7, Pv[1] - 18], [Pv[0] - 2, Pv[1] - 13],
      [Pv[0] - 8, Pv[1] - 19], [Pv[0] - 13, Pv[1] - 13], [Pv[0] - 19, Pv[1] - 17]]), { tex: 5 });
    paint(fr, 'rope', g => { L(g, [[Pv[0] - 15, Pv[1] + 6], [Pv[0] + 21, Pv[1] + 5]], 5); L(g, [[Pv[0] + 6, Pv[1] + 5], [Pv[0] + 9, Pv[1] - 8]], 2.5); });
    paint(fr, 'gold', g => { Cc(g, [Pv[0] + 9, Pv[1] - 10], 3); Cc(g, [Pv[0] - 9, Pv[1] + 1], 2.5); });
    // 머리: 갈기·뿔·얼굴
    const hx = Hc[0], hh = Hc[1];
    paint(fr, 'dhair', g => { E(g, [hx - 5, hh - 1], 11, 12); P(g, [[hx - 14, hh + 4], [hx - 22, hh - 6], [hx - 15, hh - 4], [hx - 19, hh - 14], [hx - 10, hh - 10], [hx - 8, hh - 18], [hx - 2, hh - 10]]); });
    paint(fr, 'horn', g => { P(g, [[hx - 4, hh + 8], [hx + 1, hh + 9], [hx + 2, hh + 15], [hx - 2, hh + 20], [hx - 3, hh + 15]]); P(g, [[hx - 11, hh + 7], [hx - 7, hh + 9], [hx - 8, hh + 15], [hx - 13, hh + 19], [hx - 12, hh + 13]]); });
    paint(fr, 'dskin', g => { E(g, [hx + 3, hh], 8, 9); P(g, [[hx + 2, hh - 4], [hx + 12, hh - 3], [hx + 9, hh - 10], [hx + 1, hh - 10]]); });
    paint(fr, 'dhair', g => P(g, [[hx + 1, hh - 7], [hx + 10, hh - 7], [hx + 8, hh - 14], [hx + 3, hh - 15], [hx - 2, hh - 11]]));   // 수염
    paint(fr, 'dhair', g => L(g, [[hx + 1, hh + 5], [hx + 10, hh + 4]], 2.2), { flat: true });   // 눈썹뼈 그늘
    paint(fr, 'eye', g => E(g, [hx + 7, hh + 2], 2.2, 1.5), { flat: true });
    paint(fr, 'dhair', g => P(g, [[hx + 5, hh - 4], [hx + 11, hh - 3], [hx + 10, hh - 6], [hx + 5, hh - 6]]), { flat: true });   // 벌린 입
    paint(fr, 'horn', g => P(g, [[hx + 6, hh - 6], [hx + 9, hh - 6], [hx + 8, hh - 3]]), { flat: true, noShade: true });   // 엄니
    // 가까운 팔
    limb('dskin', shN, p.nearArm.el, p.nearArm.wr, 14, 12);
    paint(fr, 'wrap', g => L(g, [lerp(p.nearArm.el, p.nearArm.wr, 0.45), p.nearArm.wr], 12));
    const nb = p.nearArm.box || (c0 => [c0[0] - 7, c0[0] + 6, c0[1] - 6, c0[1] + 6])(add(p.nearArm.wr, p.nearArm.fist || [3, 0]));
    paint(fr, 'dskin', g => box(g, nb));
    paint(fr, 'dskinF', g => L(g, [[nb[1] - 4, nb[3] - 2], [nb[1] - 4, nb[2] + 2]], 1.2), { flat: true, noShade: true });   // 주먹 마디
    return { fr };
  }
  const DOK = {
    // 공격 예고: 오른 주먹을 어깨 뒤로 크게 당기고 상체를 뒤로 젖힘, 왼팔은 앞으로
    windup: { C: [-8, 80], Pv: [-2, 48], Hc: [-9, 97], legs: [{ knee: [-13, 26], ankle: [-21, 6], far: true }, { knee: [11, 26], ankle: [17, 6] }],
              farArm: { el: [8, 66], wr: [18, 63], fist: [3, 0] }, nearArm: { el: [-20, 84], wr: [-26, 99], fist: [-1, 3] } },
    // 펀치: 오른팔을 앞으로 쭉 (주먹 끝 ≤ 52px), 몸을 앞으로 실음
    punch: { C: [4, 78], Pv: [0, 48], Hc: [8, 94], legs: [{ knee: [-12, 25], ankle: [-21, 6], far: true }, { knee: [14, 27], ankle: [19, 6] }],
             farArm: { el: [-14, 70], wr: [-12, 60], fist: [0, -3] }, nearArm: { el: [24, 77], wr: [38, 77], fist: [5, 0] } },
  };
  // 서기·걷기 (2026-10-28 추가): 가드 주먹은 코드 그림의 가드 주먹 판정 칸과 같은 자리·크기 ([앞쪽 x0~x1, 높이 h0~h1], tests/fists.js 의 판정 칸)
  //   서기 = 코드 idle0 (뒤 주먹 12~27·63~78, 앞 주먹 21~36·54~69), 걷기 = 코드 walk0 (각 3px 낮음 — 코드 idle1·walk2 도 3px 낮지만 시안은 idle1 = 서기 칸)
  DOK.idle0 = { C: [0, 80], Pv: [-1, 48], Hc: [3, 98], legs: [{ knee: [-10, 26], ankle: [-14, 6], far: true }, { knee: [10, 26], ankle: [13, 6] }],
                farArm: { el: [3, 63], wr: [12, 70], box: [12, 27, 63, 78] }, nearArm: { el: [10, 58], wr: [20, 61], box: [21, 36, 54, 69] } };
  DOK.walk0 = { C: [1, 78], Pv: [0, 46], Hc: [4, 96], legs: [{ knee: [-12, 25], ankle: [-20, 6], far: true }, { knee: [12, 27], ankle: [18, 8] }],
                farArm: { el: [3, 60], wr: [12, 67], box: [12, 27, 60, 75] }, nearArm: { el: [10, 55], wr: [20, 58], box: [21, 36, 51, 66] } };
  const DOK_ORDER = ['windup', 'punch', 'idle0', 'walk0'];

  // ── 시트 만들기: 칸들을 한 줄로
  function sheet(order, drawFn, poses) {
    const c = document.createElement('canvas'); c.width = W * order.length; c.height = H;
    const g = c.getContext('2d'), info = {};
    order.forEach((name, i) => {
      const { fr, tip } = drawFn(poses[name]);
      if (R > 1) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {   // 2px: 바깥 윤곽만 외곽선
        const i = y * W + x; if (!fr.edge[i] || !fr.px[i]) continue;
        const empty = (xx, yy) => xx < 0 || yy < 0 || xx >= W || yy >= H || !fr.px[yy * W + xx];
        if (empty(x - 1, y) || empty(x + 1, y) || empty(x, y - 1) || empty(x, y + 1)) fr.px[i] = fr.edge[i];
      }
      const img = g.createImageData(W, H);
      for (let k = 0; k < W * H; k++) { const col = fr.px[k]; if (!col) continue;
        const v = parseInt(col.slice(1), 16); img.data[k * 4] = v >> 16; img.data[k * 4 + 1] = (v >> 8) & 255; img.data[k * 4 + 2] = v & 255; img.data[k * 4 + 3] = 255; }
      g.putImageData(img, i * W, 0);
      info[name] = { col: i, tip: tip && [Math.round(tip[0]), Math.round(tip[1])] };
    });
    return { url: c.toDataURL('image/png'), info };
  }
  return {
    R, W, H, FX, FY, M, MUG, DOK, MUG_ORDER, DOK_ORDER,
    mugyeom: (order = MUG_ORDER) => sheet(order, mugyeom, MUG),
    dokkaebi: (order = DOK_ORDER) => sheet(order, dokkaebi, DOK),
  };
}
window.P1DRAFT = makeDrawer(1);
window.P1DRAFT2 = makeDrawer(2);   // 2px 시험
})();
