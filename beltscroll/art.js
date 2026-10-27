'use strict';
// =====================================================================
// 디자인 에셋 (픽셀아트)
// 이미지 파일 없이 모든 그림을 코드로 그린다. 게임(index.html)과
// 에셋 모아보기(assets.html)가 같이 쓴다.
// 색을 바꾸고 싶으면 CHARACTERS 의 c(색 목록)만 고치면 된다.
// =====================================================================
const ART = (() => {
  const S = 3;               // 픽셀 1칸 = 화면 3px
  const FW = 40, FH = 40;    // 캐릭터 프레임 한 장 크기 (칸)
  const CX = 20, FOOT = 38;  // 프레임 안 기준점: 몸 중심, 발바닥
  const INK = '#0e0b16';     // 외곽선 색

  // ----- 도구 -----
  function rng(seed) {       // 시드 고정 난수: 매번 같은 거리 풍경이 나온다
    let s = seed >>> 0;
    return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  }
  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    return [c, g];
  }
  function painter(g) {
    return (x, y, w, h, color) => { g.fillStyle = color; g.fillRect(Math.round(x), Math.round(y), w, h); };
  }
  function outline(c) {      // 그림 둘레에 1칸 외곽선
    const g = c.getContext('2d'), w = c.width, h = c.height;
    const d = g.getImageData(0, 0, w, h).data;
    const solid = i => d[i * 4 + 3] > 0;
    g.fillStyle = INK;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (solid(i)) continue;
      if ((x > 0 && solid(i - 1)) || (x < w - 1 && solid(i + 1)) || (y > 0 && solid(i - w)) || (y < h - 1 && solid(i + w))) g.fillRect(x, y, 1, 1);
    }
  }
  function silhouette(c, color) {   // 맞았을 때 번쩍이는 흰 실루엣
    const [s, g] = canvas(c.width, c.height);
    g.drawImage(c, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
    return s;
  }

  // ----- 캐릭터 -----
  // head/torso: [가로, 세로] 칸. legLen 다리 길이, armW 팔 두께, upper/fore 윗팔/아랫팔 길이
  const CHARACTERS = {
    player: {
      name: '주인공', style: 'player',
      head: [7, 7], torso: [8, 9], legLen: 10, legW: 3, armW: 3, upper: 4, fore: 4,
      c: { skin: '#f2c193', skinD: '#c98d5e', hair: '#2b1d16', top: '#2f7de1', topD: '#1f55a3', shirt: '#f1efe9',
           pants: '#2c3352', pantsD: '#1c2138', boots: '#7a4524', bootsD: '#552f18', accent: '#e23b3b',
           belt: '#191419', eye: '#1a1020', fist: '#f1efe9', fistD: '#bdb8ad' },
    },
    thug: {
      name: '잡졸', style: 'thug', sleeves: true,
      head: [7, 7], torso: [8, 8], legLen: 9, legW: 3, armW: 3, upper: 4, fore: 4,
      c: { skin: '#e7b48a', skinD: '#b9845c', hair: '#4fd16a', top: '#c8323c', topD: '#8d1e27', shirt: '#2a2a2a',
           pants: '#4a5a78', pantsD: '#33405a', boots: '#2a2a2a', bootsD: '#1a1a1a', accent: '#111111',
           belt: '#5a3a20', eye: '#111111', fist: '#e7b48a', fistD: '#b9845c' },
    },
    brute: {
      name: '덩치', style: 'brute',
      head: [8, 7], torso: [13, 11], legLen: 10, legW: 4, armW: 4, upper: 5, fore: 5,
      c: { skin: '#c98a5c', skinD: '#985f39', shine: '#e3a77a', hair: '#3a2416', top: '#7b4fc9', topD: '#563596',
           pants: '#3b302c', pantsD: '#29211e', boots: '#1d1a1a', bootsD: '#121010', accent: '#e8b33a',
           belt: '#1d1a1a', eye: '#111111', fist: '#c98a5c', fistD: '#985f39' },
    },
  };

  // 동작(포즈). near/far = 앞다리/뒷다리 [앞뒤 위치, 들어 올림], arm/farArm = 팔 모양,
  // bob = 상체가 내려가는 정도, lean = 상체 기울기
  const POSES = {
    idle0:  { near: [1, 0],  far: [-2, 0], arm: 'guard',  farArm: 'guard' },
    idle1:  { near: [1, 0],  far: [-2, 0], arm: 'guard',  farArm: 'guard', bob: 1 },
    walk0:  { near: [3, 0],  far: [-3, 0], arm: 'guard',  farArm: 'guard', bob: 1 },
    walk1:  { near: [0, 0],  far: [0, 2],  arm: 'guard',  farArm: 'guard' },
    walk2:  { near: [-3, 0], far: [3, 0],  arm: 'guard',  farArm: 'guard', bob: 1 },
    walk3:  { near: [0, 2],  far: [0, 0],  arm: 'guard',  farArm: 'guard' },
    windup: { near: [2, 0],  far: [-3, 0], arm: 'windup', farArm: 'guard', lean: -1 },
    punch:  { near: [3, 0],  far: [-3, 0], arm: 'punch',  farArm: 'guard', lean: 1 },
    punch2: { near: [3, 0],  far: [-3, 0], arm: 'guard',  farArm: 'punch', lean: 1 },
    kick:   { near: 'kick',  far: [-2, 0], arm: 'back',   farArm: 'guard', lean: -1 },
    jump:   { near: [2, 3],  far: [-2, 4], arm: 'up',     farArm: 'guard' },
    stomp:  { near: [6, 3],  far: [-3, 0], arm: 'back',   farArm: 'guard', lean: -1 },   // 쓰러진 적 내려찍기 (4단계 추가)
    hurt:   { near: [-1, 0], far: [-4, 0], arm: 'back',   farArm: 'back',  lean: -2, bob: 1, face: 'hurt' },
  };

  function geometry(def, pose = {}) {
    const [hw, hh] = def.head, [tw, th] = def.torso;
    const bob = pose.bob || 0, lean = pose.lean || 0;
    const hipY = FOOT - def.legLen;
    const tTop = hipY - th + bob;
    const tx = CX - Math.floor(tw / 2) + lean;
    const hx = CX - Math.floor(hw / 2) + 1 + lean;
    const hy = tTop - hh + 1;
    return { hw, hh, tw, th, bob, hipY, tTop, tx, hx, hy };
  }

  function drawPose(def, pose) {
    const [c, g] = canvas(FW, FH);
    const R = painter(g), k = def.c;
    const { hw, hh, tw, th, bob, hipY, tTop, tx, hx, hy } = geometry(def, pose);
    const lw = def.legW, aw = def.armW, u = def.upper, f = def.fore;
    const sy = tTop + 1;

    function leg(spec, hipX, near) {
      const pc = near ? k.pants : k.pantsD, bc = near ? k.boots : k.bootsD;
      if (spec === 'kick') {   // 앞으로 쭉 뻗은 다리
        R(hipX, hipY - 1, def.legLen, lw, pc);
        R(hipX, hipY - 2 + lw, def.legLen, 1, k.pantsD);
        R(hipX + def.legLen, hipY - 2, 2, lw + 2, bc);
        return;
      }
      const [dx, lift] = spec;
      const len = def.legLen - 2 - lift, up = Math.ceil(len / 2);
      const x1 = hipX + Math.round(dx / 2), x2 = hipX + dx;
      R(x1, hipY, lw, up, pc);
      R(x2, hipY + up, lw, len - up, pc);
      if (near) { R(x1, hipY, 1, up, k.pantsD); R(x2, hipY + up, 1, len - up, k.pantsD); }
      R(x2, hipY + len, lw + 1, 2, bc);   // 신발 (앞코가 1칸 나옴)
    }

    function arm(kind, sx, near) {
      const skin = near ? k.skin : k.skinD;
      const sleeve = def.sleeves ? (near ? k.top : k.topD) : skin;
      const fist = near ? k.fist : k.fistD;
      if (kind === 'guard') {        // 팔꿈치 굽히고 주먹은 얼굴 앞
        const ox = near ? 0 : 3, oy = near ? 0 : -3;
        R(sx + ox, sy, aw, u + 1, sleeve);
        R(sx + ox + aw - 1, sy + u - 1 + oy, f, aw - 1, sleeve);
        R(sx + ox + aw - 2 + f, sy + u - aw + oy, aw, aw, fist);
      } else if (kind === 'punch') { // 앞으로 쭉
        R(sx, sy, u + f, aw, sleeve);
        if (near) R(sx, sy + aw - 1, u + f, 1, def.sleeves ? k.topD : k.skinD);
        R(sx + u + f, sy - 1, aw + 1, aw + 1, fist);
      } else if (kind === 'windup') { // 주먹을 뒤로 당김 (적의 공격 예고)
        R(sx - u, sy, u + 1, aw, sleeve);
        R(sx - u, sy - f, aw, f, sleeve);
        R(sx - u, sy - f - aw + 1, aw, aw, fist);
      } else if (kind === 'back') {  // 뒤로 젖혀짐
        R(sx - 1, sy + 1, aw, 3, sleeve);
        R(sx - 3, sy + 3, aw, 3, sleeve);
        R(sx - 5, sy + 5, aw, aw, fist);
      } else if (kind === 'up') {    // 점프할 때 위로
        R(sx + 1, sy - u + 1, aw, u, sleeve);
        R(sx + 2, sy - u - aw + 1, aw, aw, fist);
      }
    }

    function torso() {
      if (def.style === 'brute') {   // 민소매: 어깨가 드러남
        R(tx, tTop, tw, th, k.skin);
        R(tx, tTop, 1, th, k.skinD);
        R(tx + 1, tTop + 3, tw - 2, th - 3, k.top);
        R(tx + 2, tTop, 2, 3, k.top); R(tx + tw - 4, tTop, 2, 3, k.top);
        R(tx + 1, tTop + 3, 1, th - 3, k.topD);
      } else {
        R(tx, tTop, tw, th, k.top);
        R(tx, tTop, 1, th, k.topD);
        if (def.style === 'player') { R(tx + tw - 3, tTop + 1, 2, th - 2, k.shirt); R(tx + tw - 4, tTop + 1, 1, th - 2, k.topD); }
        if (def.style === 'thug') { R(tx + 1, tTop, tw - 2, 1, k.topD); R(tx + tw - 2, tTop + 1, 1, th - 1, k.shirt); }
      }
      const bh = def.style === 'brute' ? 2 : 1;
      R(tx, hipY + bob - bh, tw, bh, k.belt);
      if (def.style === 'brute') R(tx + tw - 4, hipY + bob - 2, 2, 2, k.accent);
      R(tx + 1, hipY + bob, tw - 2, 2, k.pants);   // 골반
    }

    function head() {
      const hurt = pose.face === 'hurt';
      R(hx, hy, hw, hh, k.skin);
      R(hx, hy, 2, hh, k.skinD);
      R(hx + 2, hy + hh, 3, 1, k.skinD);           // 목
      R(hx + hw, hy + 3, 1, 2, k.skin);            // 코
      if (hurt) { R(hx + hw - 3, hy + 3, 2, 1, k.eye); R(hx + hw - 2, hy + hh - 2, 2, 1, '#5a1a22'); }
      else { R(hx + hw - 2, hy + 3, 1, 2, k.eye); R(hx + hw - 2, hy + hh - 2, 2, 1, k.skinD); }
      if (def.style === 'player') {    // 뾰족 머리 + 빨간 머리띠
        R(hx - 1, hy - 1, hw + 1, 3, k.hair);
        R(hx - 1, hy, 3, 5, k.hair);
        R(hx, hy - 2, 1, 1, k.hair); R(hx + 2, hy - 2, 2, 1, k.hair); R(hx + 5, hy - 2, 1, 1, k.hair);
        R(hx - 1, hy + 2, hw + 1, 1, k.accent);
        R(hx - 3, hy + 2, 2, 1, k.accent); R(hx - 5, hy + 3 - bob, 2, 1, k.accent);
      } else if (def.style === 'thug') { // 초록 모히칸 + 선글라스
        R(hx, hy, hw - 1, 2, k.skinD);
        R(hx + 1, hy - 3, 4, 3, k.hair); R(hx + 2, hy - 4, 2, 1, k.hair);
        if (!hurt) { R(hx + 3, hy + 2, hw - 2, 2, k.accent); R(hx + hw - 1, hy + 2, 1, 1, '#9be7ff'); }
      } else {                           // 대머리 + 수염
        R(hx + 3, hy, 2, 1, k.shine);
        R(hx + hw - 3, hy + 2, 3, 1, k.hair);
        R(hx + hw - 4, hy + hh - 3, 5, 3, k.hair);
        R(hx + 2, hy + hh - 1, hw - 2, 2, k.hair);
      }
    }

    // 뒤에 있는 것부터 그린다
    arm(pose.farArm, tx + 1, false);
    leg(pose.far, CX - lw, false);
    torso();
    leg(pose.near, CX, true);
    head();
    arm(pose.arm, tx + Math.floor(tw / 2) - 1, true);
    return c;
  }

  function drawDown(def) {   // 뒤로 넘어져 누운 모습 (머리가 뒤쪽)
    const [c, g] = canvas(FW, FH);
    const R = painter(g), k = def.c;
    const [hw, hh] = def.head, [tw, th] = def.torso;
    const thick = Math.max(5, Math.round(tw * 0.6));
    const y = FOOT;
    let x = CX - Math.floor((hh + th + def.legLen + 2) / 2);
    R(x, y - hw, hh, hw, k.skin);
    R(x, y - 2, hh, 2, k.skinD);
    R(x + 3, y - hw - 1, 1, 1, k.skin);
    R(x + 2, y - hw + 1, 2, 1, k.eye);
    if (def.style === 'player') { R(x - 1, y - hw, 3, hw, k.hair); R(x + 2, y - hw, 1, hw, k.accent); }
    if (def.style === 'thug') R(x - 3, y - hw + 1, 3, 4, k.hair);
    if (def.style === 'brute') R(x + hh - 3, y - hw, 3, hw - 1, k.hair);
    x += hh;
    R(x, y - thick, th, thick, k.top);
    R(x, y - 1, th, 1, k.topD);
    R(x + th - 1, y - thick, 1, thick, k.belt);
    R(x + 1, y - thick - 1, th - 2, def.armW - 1, def.sleeves ? k.top : k.skin);
    R(x + th - 2, y - thick - 2, def.armW, def.armW - 1, k.fist);
    x += th;
    R(x, y - def.legW - 2, def.legLen, def.legW, k.pantsD);
    R(x, y - def.legW, def.legLen, def.legW, k.pants);
    R(x + def.legLen, y - def.legW - 4, 2, def.legW + 4, k.boots);
    return c;
  }

  function buildCharacter(def) {
    const frames = {};
    for (const [name, pose] of Object.entries(POSES)) frames[name] = drawPose(def, pose);
    frames.down = drawDown(def);
    for (const name in frames) outline(frames[name]);
    const flash = {};
    for (const name in frames) flash[name] = silhouette(frames[name], '#ffffff');
    // HUD 용 얼굴 사진 (팔 없이 그린 뒤 머리만 잘라낸다)
    const bust = drawPose(def, { ...POSES.idle0, arm: 'none', farArm: 'none' });
    outline(bust);
    const { hw, hh, hx, hy } = geometry(def);
    const [face, fg] = canvas(hw + 8, hh + 7);
    fg.drawImage(bust, hx - 4, hy - 4, hw + 8, hh + 7, 0, 0, hw + 8, hh + 7);
    return { frames, flash, face };
  }

  // ----- 타격 이펙트 (3장) -----
  function buildSparks() {
    const shapes = [
      R => { R(5, 3, 1, 5, '#fff'); R(3, 5, 5, 1, '#fff'); R(5, 5, 1, 1, '#ffe066'); },
      R => {
        R(5, 0, 1, 11, '#ffd34d'); R(0, 5, 11, 1, '#ffd34d'); R(5, 2, 1, 7, '#fff'); R(2, 5, 7, 1, '#fff');
        for (const [x, y] of [[2, 2], [8, 2], [2, 8], [8, 8]]) R(x, y, 1, 1, '#ff8a3d');
        for (const [x, y] of [[3, 3], [7, 3], [3, 7], [7, 7]]) R(x, y, 1, 1, '#ffd34d');
        R(4, 4, 3, 3, '#fff');
      },
      R => {
        R(5, 0, 1, 2, '#ff8a3d'); R(5, 9, 1, 2, '#ff8a3d'); R(0, 5, 2, 1, '#ff8a3d'); R(9, 5, 2, 1, '#ff8a3d');
        for (const [x, y] of [[1, 1], [9, 1], [1, 9], [9, 9]]) R(x, y, 1, 1, '#ffd34d');
      },
    ];
    return shapes.map(draw => { const [c, g] = canvas(11, 11); draw(painter(g)); return c; });
  }

  // ----- 간판용 3x5 픽셀 글꼴 -----
  const GLYPHS = {
    A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
    E: '111100110100111', G: '011100101101011', H: '101101111101101', L: '100100100100111',
    M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100',
    R: '110101110101101', T: '111010010010010', U: '101101101101111', W: '101101111111101',
    Y: '101101010010010', Z: '111001010100111', 2: '110001010100111', 4: '101101111001001',
  };
  function text(R, str, x, y, color) {
    for (const ch of str) {
      const gl = GLYPHS[ch];
      if (gl) for (let i = 0; i < 15; i++) if (gl[i] === '1') R(x + i % 3, y + ((i / 3) | 0), 1, 1, color);
      x += 4;
    }
  }
  function neon(g, R, x, y, word, color) {
    const w = word.length * 4 + 3, h = 9;
    g.globalAlpha = 0.2; R(x - 2, y - 2, w + 4, h + 4, color); g.globalAlpha = 1;
    R(x, y, w, h, '#15101f');
    R(x, y, w, 1, color); R(x, y + h - 1, w, 1, color); R(x, y, 1, h, color); R(x + w - 1, y, 1, h, color);
    text(R, word, x + 2, y + 2, '#ffffff');
  }

  // ----- 배경 -----
  function buildSky(wu, hu) {
    const [c, g] = canvas(wu, hu); const R = painter(g); const r = rng(7);
    const bands = ['#0f1029', '#16163a', '#1f1b48', '#2c2056', '#3f2660', '#5a2d66', '#7a3767', '#9a4566'];
    const bh = Math.ceil(hu / bands.length);
    bands.forEach((col, i) => {
      R(0, i * bh, wu, bh, col);
      const next = bands[i + 1];
      if (next) for (let x = 0; x < wu; x += 2) { R(x, i * bh + bh - 1, 1, 1, next); if (x % 4 === 0) R(x + 1, i * bh + bh - 2, 1, 1, next); }
    });
    for (let i = 0; i < 60; i++) R(r() * wu | 0, r() * hu * 0.5 | 0, 1, 1, r() < 0.2 ? '#ffffff' : '#8f8ac9');
    const mx = Math.round(wu * 0.78), my = 22;
    const disk = (rad, color) => { for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) if (dx * dx + dy * dy <= rad * rad + rad * 0.8) R(mx + dx, my + dy, 1, 1, color); };
    g.globalAlpha = 0.12; disk(13, '#f4e6c1'); g.globalAlpha = 1;
    disk(9, '#f4e6c1');
    R(mx - 3, my - 2, 3, 2, '#d9c79e'); R(mx + 2, my + 3, 2, 2, '#d9c79e'); R(mx + 4, my - 4, 1, 1, '#d9c79e');
    return c;
  }

  function buildFar(wu, hu) {
    const [c, g] = canvas(wu, hu); const R = painter(g); const r = rng(11);
    for (let x = 0; x < wu;) {
      const bw = 12 + (r() * 20 | 0), top = hu - 25 - (r() * 40 | 0);
      R(x, top, bw, hu - top, '#1d1834');
      if (r() < 0.3) { R(x + (bw >> 1), top - 6, 1, 6, '#1d1834'); R(x + (bw >> 1), top - 7, 1, 1, '#ff4d4d'); }
      for (let wy = top + 3; wy < hu - 4; wy += 4) for (let wx = x + 2; wx < x + bw - 2; wx += 3) if (r() < 0.12) R(wx, wy, 1, 2, '#4a3f7a');
      x += bw + (r() * 3 | 0);
    }
    return c;
  }

  function buildMid(wu, hu) {
    const [c, g] = canvas(wu, hu); const R = painter(g); const r = rng(23);
    const walls = ['#2a2142', '#231d38', '#1f2440', '#2d2238'];
    const lights = ['#f2c94c', '#8fd3ff', '#ff9ad5', '#f2c94c'];
    for (let x = -5; x < wu;) {
      const bw = 30 + (r() * 30 | 0), top = 18 + (r() * 35 | 0);
      R(x, top, bw, hu - top, walls[r() * walls.length | 0]);
      R(x, top, 1, hu - top, '#3a2f57');
      R(x - 1, top, bw + 2, 2, '#15111f');
      const lit = lights[r() * lights.length | 0];
      for (let wy = top + 5; wy < hu - 6; wy += 6) for (let wx = x + 3; wx < x + bw - 4; wx += 5) R(wx, wy, 3, 4, r() < 0.3 ? lit : '#17132a');
      const roof = r();
      if (roof < 0.3) {          // 물탱크
        const wx = x + 5 + (r() * (bw - 15) | 0);
        R(wx, top - 9, 7, 6, '#3b2d4a'); R(wx - 1, top - 10, 9, 1, '#4b3b5c');
        R(wx + 1, top - 3, 1, 3, '#15111f'); R(wx + 5, top - 3, 1, 3, '#15111f');
      } else if (roof < 0.5) {   // 옥상 광고판
        const wx = x + 3, bwid = Math.min(bw - 6, 24);
        R(wx + 3, top - 4, 1, 4, '#15111f'); R(wx + bwid - 4, top - 4, 1, 4, '#15111f');
        R(wx, top - 14, bwid, 10, '#15111f');
        R(wx + 1, top - 13, bwid - 2, 8, ['#e0457b', '#3fb6c9', '#f2a33a'][r() * 3 | 0]);
        R(wx + 3, top - 11, bwid - 6, 1, '#ffffffaa'); R(wx + 3, top - 9, (bwid - 6) >> 1, 1, '#ffffffaa');
      }
      x += bw + 2 + (r() * 6 | 0);
    }
    return c;
  }

  function buildFacade(wu, hu) {   // 캐릭터 바로 뒤 거리의 가게들
    const [c, g] = canvas(wu, hu); const R = painter(g); const r = rng(42);
    const walls = [['#6b3440', '#552733'], ['#4a3a5e', '#382b49'], ['#3d4a63', '#2e3a50'], ['#6a4b38', '#533928']];
    const signs = [['BAR', '#ff4fa3'], ['HOTEL', '#4fd8ff'], ['24H', '#ffd34d'], ['GYM', '#7dff6a'], ['PAWN', '#ff8a3d'], ['CLUB', '#c77dff']];
    const tags = [['ZAP', '#ff4fa3'], ['YO', '#4fd8ff'], ['RAD', '#7dff6a'], ['POW', '#ffd34d']];
    for (let x = 0; x < wu;) {
      if (x > 0 && r() < 0.25) {   // 골목
        const aw = 10 + (r() * 6 | 0);
        R(x, hu - 30, aw, 30, '#120f1c');
        R(x + 1, hu - 9, aw - 2, 7, '#2d5a3a'); R(x + 1, hu - 9, aw - 2, 1, '#3f7a50');
        x += aw; continue;
      }
      const bw = 60 + (r() * 40 | 0), top = hu - 40 - (r() * 16 | 0);
      const [wall, mortar] = walls[r() * walls.length | 0];
      R(x, top, bw, hu - top, wall);
      for (let y = top + 3; y < hu; y += 3) {   // 벽돌 무늬
        R(x, y, bw, 1, mortar);
        for (let bx = x + ((y / 3 | 0) % 2 ? 0 : 3); bx < x + bw; bx += 6) R(bx, y - 2, 1, 2, mortar);
      }
      R(x - 1, top - 3, bw + 2, 3, '#251d33'); R(x - 1, top - 3, bw + 2, 1, '#6b5a80');   // 처마
      const gy = hu - 22;                       // 1층 높이
      for (let wx = x + 5; wx + 10 < x + bw; wx += 13) for (let wy = top + 5; wy + 10 < gy - 2; wy += 12) {
        const on = r() < 0.45;
        R(wx - 1, wy - 1, 9, 11, '#1a1424');
        R(wx, wy, 7, 9, on ? '#f6d06b' : '#231c35');
        if (on) { R(wx, wy + 5, 7, 4, '#d9a441'); R(wx + 1, wy + 1, 2, 3, '#fff1b8'); }
        R(wx + 3, wy, 1, 9, '#1a1424');
        R(wx - 2, wy + 10, 11, 1, '#4a3d5a');
      }
      R(x, gy - 1, bw, 1, '#1a1424');
      const kind = r();
      if (kind < 0.45) {          // 불 켜진 가게 + 줄무늬 차양
        const sx0 = x + 4, sw = bw - 22;
        R(sx0 - 1, gy + 3, sw + 2, 16, '#1a1424');
        R(sx0, gy + 4, sw, 14, '#ffe3a1'); R(sx0, gy + 12, sw, 6, '#e8b860');
        for (let ix = sx0 + 3; ix < sx0 + sw - 4; ix += 7) { const ih = 4 + (r() * 5 | 0); R(ix, gy + 18 - ih, 4, ih, '#7a4a3a'); }
        const awn = ['#d94848', '#3a8fd9', '#3fae6a'][r() * 3 | 0];
        for (let ax = sx0 - 2; ax < sx0 + sw + 2; ax++) R(ax, gy, 1, 4, ((ax - sx0) >> 1) % 2 ? awn : '#f1ece0');
        R(x + bw - 15, gy + 2, 11, 20, '#1a1424'); R(x + bw - 14, gy + 3, 9, 19, '#3a2a35'); R(x + bw - 13, gy + 4, 7, 7, '#ffe3a1');
      } else if (kind < 0.75) {   // 셔터 + 낙서
        R(x + 3, gy + 1, bw - 6, 2, '#3c394a');
        R(x + 4, gy + 3, bw - 8, 19, '#77748a');
        for (let y = gy + 4; y < hu; y += 2) R(x + 4, y, bw - 8, 1, '#5d5a70');
        const [tag, tc] = tags[r() * tags.length | 0];
        const tx0 = x + 8 + (r() * (bw - 30) | 0);
        text(R, tag, tx0 + 1, gy + 9, '#2a2733'); text(R, tag, tx0, gy + 8, tc);
      } else {                    // 클럽 입구 + 포스터
        const dx = x + (bw >> 1) - 6;
        R(dx - 1, gy + 1, 14, 21, '#6b5a80'); R(dx, gy + 2, 12, 20, '#140f1c');
        R(dx + 5, gy - 3, 2, 2, '#ffe9a8');
        for (const px of [x + 5, x + bw - 13]) { R(px, gy + 5, 8, 11, '#f1ece0'); R(px + 1, gy + 6, 6, 6, ['#e0457b', '#3fb6c9', '#f2a33a'][r() * 3 | 0]); R(px + 1, gy + 13, 6, 1, '#555'); }
      }
      if (r() < 0.6) {            // 네온 간판
        const [word, col] = signs[r() * signs.length | 0];
        const w = word.length * 4 + 3;
        if (w < bw - 8) neon(g, R, x + ((bw - w) >> 1), gy - 13, word, col);
      }
      x += bw;
    }
    const lamps = [];             // 가로등
    for (let lx = 40; lx < wu; lx += 120 + (r() * 30 | 0)) {
      R(lx, hu - 46, 2, 46, '#1c1826'); R(lx - 1, hu - 3, 4, 3, '#1c1826');
      R(lx, hu - 46, 8, 2, '#1c1826'); R(lx + 6, hu - 44, 4, 2, '#fff3b0');
      g.globalAlpha = 0.07;
      for (let i = 0; i < 40; i++) R(lx + 8 - i * 0.3, hu - 42 + i, 2 + i * 0.6, 1, '#fff3b0');
      g.globalAlpha = 1;
      lamps.push(lx + 8);
    }
    return { c, lamps };
  }

  function buildFloor(wu, hu, lamps) {
    const [c, g] = canvas(wu, hu); const R = painter(g); const r = rng(5);
    R(0, 0, wu, 14, '#4f4a5c');               // 인도
    R(0, 0, wu, 1, '#221d2c');
    R(0, 7, wu, 1, '#403b4d');
    for (let x = 0; x < wu; x += 12) { R(x, 1, 1, 6, '#403b4d'); R(x + 6, 8, 1, 6, '#403b4d'); }
    R(0, 14, wu, 1, '#9a94ab'); R(0, 15, wu, 2, '#615c73');   // 연석
    R(0, 17, wu, hu - 17, '#2e2b37');         // 도로
    for (let i = 0; i < wu * 2; i++) R(r() * wu | 0, 17 + (r() * (hu - 17) | 0), 1, 1, r() < 0.5 ? '#383544' : '#25222e');
    for (let x = 4; x < wu; x += 34) R(x, 46, 16, 2, '#b8a24a');   // 차선
    for (let x = 60; x < wu; x += 150 + (r() * 80 | 0)) {
      const y = 22 + (r() * 45 | 0);
      if (r() < 0.5) { R(x, y, 10, 4, '#1e1c26'); R(x + 1, y + 1, 8, 2, '#3a3746'); }       // 맨홀
      else { R(x, y, 14, 3, '#3a4a6e'); R(x + 2, y, 6, 1, '#6a7fb0'); }                      // 물웅덩이
    }
    g.globalAlpha = 0.08;                     // 가로등 불빛이 바닥에 비침
    for (const lx of lamps) for (let dy = -9; dy <= 9; dy++) {
      const half = Math.round(Math.sqrt(1 - (dy / 9.5) ** 2) * 28);
      R(lx - half, 10 + dy, half * 2, 1, '#fff3b0');
    }
    g.globalAlpha = 1;
    return c;
  }

  // 스테이지 배경 한 벌. f = 카메라를 따라 움직이는 비율 (작을수록 멀리 있음)
  function buildStage({ W, H, groundTop, stageLength }) {
    const viewU = Math.ceil(W / S) + 2;
    const backU = Math.ceil(groundTop / S) + 1;
    const width = f => Math.ceil(((stageLength - W) * f + W) / S) + 4;
    const facade = buildFacade(width(1), backU);
    return {
      sky: buildSky(viewU, backU),
      layers: [
        { img: buildFar(width(0.2), backU), f: 0.2 },
        { img: buildMid(width(0.5), backU), f: 0.5 },
        { img: facade.c, f: 1 },
      ],
      floor: buildFloor(width(1), Math.ceil((H - groundTop) / S) + 1, facade.lamps),
    };
  }

  const characters = {};
  for (const [id, def] of Object.entries(CHARACTERS)) characters[id] = buildCharacter(def);

  return { S, CX, FOOT, CHARACTERS, POSES, characters, sparks: buildSparks(), buildStage, text };
})();
