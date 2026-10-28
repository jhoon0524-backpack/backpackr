'use strict';
// =====================================================================
// 디자인 에셋 (픽셀아트)
// 이미지 파일 없이 모든 그림을 코드로 그린다. 게임(index.html)과
// 에셋 모아보기(assets.html)가 같이 쓴다.
// 색을 바꾸고 싶으면 CHARACTERS 의 c(색 목록)만 고치면 된다.
// =====================================================================
const ART = (() => {
  const S = 3;               // 픽셀 1칸 = 화면 3px
  const SWORD_TIP = 18;      // 칼끝: 몸 중심 앞 18칸 (그 칸 오른쪽 끝 = 57px). index.html 의 1·2·3타 사거리가 이 값과 같아야 한다 (tests/reach.js)
  const THRUST_BACK = 5;     // 3타 찌르기 그림을 뒤로 물리는 칸 수 (칼날 16칸 = 48px 가 40칸 프레임 안에 들어가게)
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
    // ----- 조선 퇴마전 (설정화 assets/reference/03·02·07 참고. 몸 비율·포즈는 위 3종을 복제) -----
    // 윤무겸 (임시 전투 스프라이트): 설정화 03 기준 — 키 큰 체형·작은 머리, 상투와 금속 관, 얼굴 옆으로 흘러내린 머리,
    // 어깨 망토가 얹힌 먹색·남청 도포(정강이까지, 앞이 갈라져 누런 백색 속옷), 주홍 가슴끈·술, 가죽 팔토시, 중목 신발, 벽사검(평소 칼집, 공격 때 뽑음)
    // 색은 03 "주요 색상" 견본에서 뽑음: 먹색 #1b1b1a, 남청 #292c30(조금 푸르게), 회갈 #706255, 주홍 #913324(화면용으로 조금 밝게), 금속 #987c5c, 누런 백색 #e7dbc7
    mugyeom: {
      name: '윤무겸', style: 'mugyeom', sleeves: true, skirt: 10, sword: true,
      head: [6, 7], torso: [8, 10], legLen: 14, legW: 3, armW: 3, upper: 4, fore: 4,
      c: { skin: '#e2b48c', skinD: '#b08260', hair: '#141316', top: '#252a38', topD: '#1b1b1a', shirt: '#e7dbc7', inner: '#b9ae9b',
           pants: '#2c2a2e', pantsD: '#1c1b1e', boots: '#1b1b1a', bootsD: '#101010', accent: '#a83a2b',
           belt: '#4a3426', eye: '#1a1020', fist: '#e2b48c', fistD: '#b08260', gold: '#987c5c', sheath: '#1b1b1a',
           steel: '#c3ccd2', steelHi: '#f1f4f6', bracer: '#3a2a20' },
    },
    wongwi: {    // 원귀 (thug 복제): 흰 소복, 얼굴을 가린 긴 머리, 푸른 눈빛
      name: '원귀', style: 'wongwi', sleeves: true, skirt: 6,
      head: [7, 7], torso: [8, 8], legLen: 9, legW: 3, armW: 3, upper: 4, fore: 4,
      c: { skin: '#b4c0c6', skinD: '#87949b', hair: '#0f0f15', top: '#d6d2c6', topD: '#a29e92', shirt: '#eeebe2',
           pants: '#c9c5b9', pantsD: '#99958a', boots: '#87949b', bootsD: '#6a767d', accent: '#8fe6ff',
           belt: '#8c877b', eye: '#0a0a0e', fist: '#6a767d', fistD: '#4f5a60' },
    },
    dokkaebi: {  // 도깨비 (brute 복제): 붉은 몸, 큰 뿔, 헝클어진 머리, 새끼줄 띠와 방울. 윤무겸보다 위압적으로 — 어깨·몸통·팔을 넓고 두껍게 (오너 결정)
      name: '도깨비', style: 'dokkaebi',
      head: [9, 8], torso: [16, 13], legLen: 11, legW: 5, armW: 5, upper: 5, fore: 5,   // 팔 길이는 덩치와 같게: 주먹 끝 48px ≤ 공격 사거리 52px
      c: { skin: '#b5463b', skinD: '#842e27', shine: '#d66a5c', hair: '#1a1414', top: '#8c7a52', topD: '#6a5a3a',
           pants: '#3b3226', pantsD: '#2a231b', boots: '#c9b994', bootsD: '#9c8e6c', accent: '#d8b04a',
           belt: '#a08a5a', eye: '#f2d14a', fist: '#b5463b', fistD: '#842e27', horn: '#e6dcc2' },
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
  // 잡기·무릎·던지기용: 그림 포즈는 punch·stomp·windup·punch2 와 같고 칼을 뽑지 않는다 (맨손으로 붙잡음)
  // airKick: 점프 공격 — 칼 든 캐릭터도 발차기 그림 (3타 kick 칸은 칼 찌르기라 따로)
  // rush0·1: 적이 공격 직전 달려드는 그림 (팔은 예고 자세로 당긴 채 뜀). 정식 시트에 없으면 windup 칸
  POSES.rush0 = { near: [5, 0], far: [-4, 2], arm: 'windup', farArm: 'guard', lean: 2, bob: 1 };
  POSES.rush1 = { near: [-1, 2], far: [3, 0], arm: 'windup', farArm: 'guard', lean: 2 };
  const BARE = { hold: 'punch', knee: 'stomp', throwPrep: 'windup', throw: 'punch2', airKick: 'kick', rush0: 'windup', rush1: 'windup' };
  for (const [alias, base] of Object.entries(BARE)) if (!POSES[alias]) POSES[alias] = { ...POSES[base] };   // 따로 정의한 포즈(rush)는 그대로

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
    const k = def.c, R0 = painter(g);
    let shiftX = 0;   // 그림 전체를 가로로 옮김 (찌르기: 몸을 뒤로 물려 칼날을 길게)
    const R = (x, y, w, h, col) => R0(x + shiftX, y, w, h, col);
    const hit = { fists: [], blade: [] };   // 판정용 모양 (칸 좌표, 옮긴 뒤): 가드 주먹 사각형, 칼날 칸들
    c.hit = hit;
    // 칼 든 캐릭터: 공격 포즈(준비·1·2·3타·내려찍기)에서만 칼을 뽑는다. 잡기 별칭 포즈(hold 등)는 맨손
    const armed = !!def.sword && [POSES.windup, POSES.punch, POSES.punch2, POSES.kick, POSES.stomp].includes(pose);
    const swap = armed && pose.farArm === 'punch';   // 2타: 칼 든 손(앞팔)으로 벤다
    const thrust = armed && pose === POSES.kick;     // 3타: 발차기 대신 앞으로 내딛으며 찌르기 (점프 공격은 airKick 별칭으로 발차기 그대로)
    // 찌르기 자세: 앞발 크게 내딛고 뒷다리 뻗음, 어깨·상체를 앞으로(lean 2), 자세를 낮추고(bob 1), 반대 팔은 뒤로 젖혀 힘을 실음.
    // 칼끝은 57px 그대로 두고 칼날을 길게(16칸 = 48px) 보이려고 그림 전체를 THRUST_BACK 칸 뒤로 물린다 — 뒷다리가 길게 뻗은 깊은 찌르기
    if (thrust) { pose = { ...pose, near: [8, 0], far: [-5, 0], arm: 'punch', farArm: 'back', lean: 2, bob: 1 }; shiftX = -THRUST_BACK; }
    const nearSpec = pose.near;
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
      if (def.style === 'mugyeom') R(x2, hipY + len - 3, lw, 3, bc);   // 중목 신발
    }

    function arm(kind, sx, near) {
      const skin = near ? k.skin : k.skinD;
      const sleeve = def.sleeves ? (near ? k.top : k.topD) : skin;
      const fist = near ? k.fist : k.fistD;
      if (armed && near && kind === 'punch') {   // 칼끝은 몸 중심 앞 18칸(오른쪽 끝 57px) — 이 자리가 1·2·3타 판정 끝 (벽사검 사거리, 오너 결정). 40칸 프레임 오른쪽 끝(외곽선 1칸 남김)
        // 1타 내려베기: 가슴 앞 손에서 45° 앞 아래로 칼날 약 17칸 / 2타 올려베기: 허리 앞 손에서 45° 앞 위로
        // 3타 찌르기: 팔을 앞으로 쭉 뻗고 칼을 수평으로. 그림 전체를 THRUST_BACK 칸 뒤로 물려 칼끝은 같은 57px, 칼날은 16칸(48px)
        const dy = thrust ? 0 : swap ? -1 : 1, tip = CX + SWORD_TIP - shiftX;   // 옮긴 뒤 칼끝이 CX + SWORD_TIP 에 오게
        const hy0 = thrust ? sy + 1 : swap ? sy + 6 : sy;
        const gx = thrust ? sx + 3 + aw : tip - 12, n = tip - gx, fx = gx - aw, gy = hy0 + 1;
        R(Math.min(sx, fx) - 1, hy0, Math.max(2, fx - sx + 1), aw, sleeve); R(fx - 1, hy0, 1, aw, k.bracer);
        R(fx, hy0, aw, aw, fist);
        R(gx, gy - 1, 1, 3, k.gold);   // 코등이
        for (let i = 1; i <= n; i++) {
          const x = gx + i, y = gy + i * dy;
          R(x, y, 1, 1, k.steel); if (dy) R(x, y - dy, 1, 1, k.steel);   // 대각선은 2칸 두께로 끊김 없이
          hit.blade.push([x + shiftX, y]); if (dy) hit.blade.push([x + shiftX, y - dy]); else hit.blade.push([x + shiftX, y + 1]);
          if (i < n) { R(x, y - (dy || 1) * (dy ? 2 : 1), 1, 1, k.steelHi); hit.blade.push([x + shiftX, y - (dy || 1) * (dy ? 2 : 1)]); }   // 칼날 밝은 면도 칼날
        }
        if (thrust) { R(gx + 1, gy + 1, n - 1, 1, k.steel); R(tip, gy - 1, 1, 3, k.steelHi); }   // 찌르기: 칼날 3칸 두께 + 칼끝 번쩍임
        return;
      }
      if (armed && near && kind === 'windup') {   // 칼을 어깨 뒤로 들어 올림
        R(sx - u, sy, u + 1, aw, sleeve);
        R(sx - u, sy - f, aw, f, sleeve);
        R(sx - u, sy - f - aw + 1, aw, aw, fist);
        for (let i = 1; i <= 11; i++) R(sx - u - i, sy - f - aw + 1 - (i >> 1), 1, 1, i === 1 ? k.gold : k.steel);   // 칼을 어깨 뒤로 길게 젖힘
        return;
      }
      if (kind === 'guard') {        // 팔꿈치 굽히고 주먹은 얼굴 앞
        const ox = near ? 0 : 3, oy = near ? 0 : -3;
        R(sx + ox, sy, aw, u + 1, sleeve);
        R(sx + ox + aw - 1, sy + u - 1 + oy, f, aw - 1, sleeve);
        R(sx + ox + aw - 2 + f, sy + u - aw + oy, aw, aw, fist);
        hit.fists.push([sx + ox + aw - 2 + f + shiftX, sy + u - aw + oy, aw, aw]);   // 가드 주먹 (판정용)
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
        if (armed && near) for (let i = 1; i <= 12; i++) R(sx - 5 - i, sy + 6 + (i >> 1), 1, 1, i === 1 ? k.gold : k.steel);   // 칼을 뒤로 길게 늘어뜨림
      } else if (kind === 'up') {    // 점프할 때 위로
        R(sx + 1, sy - u + 1, aw, u, sleeve);
        R(sx + 2, sy - u - aw + 1, aw, aw, fist);
      }
    }

    function torso() {
      if (def.style === 'mugyeom') {   // 칼집: 허리에서 뒤 아래로 비스듬히 늘어짐 (몸통 뒤에 먼저 그림). 칼을 뽑았으면 손잡이 없음
        for (let i = 0; i < (thrust ? 9 : 14); i++) R(tx - i, hipY + bob - 2 + (i * 2 / 3 | 0), 1, 2, k.sheath);   // 찌르기는 뒤로 물린 만큼 짧게 (프레임 밖으로 안 나가게)
        if (!thrust) R(tx - 13, hipY + bob + 6, 1, 2, k.gold); R(tx - 7, hipY + bob + 2, 1, 2, k.gold);
        if (!armed) { R(tx + tw - 1, hipY + bob - 3, 4, 1, k.sheath); R(tx + tw - 1, hipY + bob - 4, 1, 3, k.gold); }
      }
      if (def.style === 'dokkaebi') {   // 맨몸 + 솟은 어깨 근육 + 어깨에 걸친 새끼줄 천
        R(tx, tTop, tw, th, k.skin);
        R(tx - 1, tTop + 1, tw + 2, 4, k.skin); R(tx + 1, tTop - 1, tw - 2, 1, k.skin);   // 어깨를 넓고 둥글게
        R(tx, tTop, 1, th, k.skinD); R(tx - 1, tTop + 1, 1, 4, k.skinD);
        R(tx + 3, tTop + 2, 3, 2, k.shine); R(tx + tw - 5, tTop + 5, 3, 1, k.skinD); R(tx + tw - 6, tTop + 8, 4, 1, k.skinD);   // 가슴·배 근육 그림자
        for (let i = 0; i < th - 1; i++) R(tx + 2 + Math.round(i * (tw - 5) / th), tTop + i, 3, 1, i % 3 ? k.top : k.topD);
      } else if (def.style === 'brute') {   // 민소매: 어깨가 드러남
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
        if (def.style === 'mugyeom' || def.style === 'wongwi') {   // 겹쳐 여민 깃 (흰 속깃이 V 로 보임)
          R(tx + tw - 3, tTop, 2, 1, k.shirt); R(tx + tw - 4, tTop + 1, 2, 1, k.shirt); R(tx + tw - 5, tTop + 2, 2, 1, k.shirt);
          R(tx + tw - 6, tTop + 3, 1, th - 3, k.topD);
        }
        if (def.style === 'mugyeom') {   // 어깨 망토(해진 끝) + 주홍 가슴끈
          R(tx - 1, tTop, tw + 1, 3, k.topD); R(tx - 1, tTop + 3, 1, 1, k.topD); R(tx + 2, tTop + 3, 1, 1, k.topD); R(tx + 5, tTop + 3, 1, 1, k.topD);
          for (let i = 0; i < 5; i++) R(tx + 1 + i, tTop + 3 + i, 1, 1, k.accent);
        }
      }
      const big = def.style === 'brute' || def.style === 'dokkaebi';
      const bh = big ? 2 : 1;
      R(tx, hipY + bob - bh, tw, bh, k.belt);
      if (big) R(tx + tw - 4, hipY + bob - 2, 2, 2, k.accent);   // 덩치 버클 / 도깨비 방울
      if (def.style === 'dokkaebi') R(tx + tw - 4, hipY + bob, 2, 1, k.accent);
      if (def.style === 'mugyeom') R(tx + tw - 3, hipY + bob - 1, 2, 1, k.gold);   // 허리 장식 (주홍 술은 자락 위에 그림)
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
      } else if (def.style === 'mugyeom') {   // 높은 상투(금속 관·동곳) + 얼굴 옆으로 흘러내린 가닥 + 뒤로 날리는 머리
        R(hx - 1, hy - 1, hw + 1, 2, k.hair);
        R(hx - 1, hy + 1, 2, 6, k.hair);
        R(hx + 1, hy - 4, 3, 3, k.hair); R(hx + 1, hy - 3, 3, 1, k.gold); R(hx + 2, hy - 5, 1, 1, k.gold);
        R(hx + hw - 2, hy + 1, 2, 1, k.hair); R(hx + 2, hy + 1, 1, 5, k.hair);   // 앞머리 + 귀 앞 가닥
        if (!hurt) R(hx + hw - 3, hy + 2, 2, 1, k.hair);   // 날카로운 눈썹
        R(hx - 3, hy - 2 - bob, 3, 1, k.hair); R(hx - 4, hy - 1 - bob, 2, 1, k.hair);
        R(hx - 1, hy - 3, 2, 1, k.accent);
      } else if (def.style === 'wongwi') {    // 얼굴을 가린 긴 머리, 틈으로 보이는 눈빛
        R(hx - 1, hy - 1, hw + 1, 3, k.hair);
        R(hx - 1, hy, 4, hh + 5, k.hair);
        R(hx + 3, hy + 1, 2, hh - 1, k.hair);
        R(hx + hw - 1, hy + 1, 1, 2, k.hair);
        if (!hurt) R(hx + hw - 2, hy + 3, 1, 1, k.accent);
      } else if (def.style === 'dokkaebi') {  // 굵게 휜 큰 뿔 2개 + 헝클어진 머리 + 수염 + 송곳니
        R(hx, hy - 3, 2, 3, k.horn); R(hx - 1, hy - 5, 2, 2, k.horn); R(hx - 1, hy - 6, 1, 1, k.horn);
        R(hx + hw - 3, hy - 3, 2, 3, k.horn); R(hx + hw - 2, hy - 5, 2, 2, k.horn); R(hx + hw - 1, hy - 6, 1, 1, k.horn);
        R(hx - 1, hy - 1, hw + 1, 2, k.hair); R(hx - 1, hy, 3, 6, k.hair);
        R(hx + hw - 4, hy + hh - 3, 5, 3, k.hair);
        if (!hurt) R(hx + hw - 2, hy + 3, 1, 1, k.eye);
        R(hx + hw - 1, hy + hh - 3, 1, 1, '#f4efe2');
      } else {                           // 대머리 + 수염
        R(hx + 3, hy, 2, 1, k.shine);
        R(hx + hw - 3, hy + 2, 3, 1, k.hair);
        R(hx + hw - 4, hy + hh - 3, 5, 3, k.hair);
        R(hx + 2, hy + hh - 1, hw - 2, 2, k.hair);
      }
    }

    function skirt() {   // 도포·소복 자락: 허리에서 넓어지며 내려옴 (발차기 때는 짧게)
      const len = nearSpec === 'kick' ? 2 : thrust ? 5 : def.skirt, mg = def.style === 'mugyeom';   // 찌르기는 내딛은 다리가 보이게 짧게
      for (let i = 0; i < len; i++) {
        const off = mg ? i >> 2 : i >> 1, x0 = tx - 1 - off, w = tw + 2 + off * 2;
        R(x0, hipY + bob + i, w, 1, i === len - 1 ? k.topD : k.top);
        if (mg && i > 0 && i < len - 1) R(x0 + w - 4, hipY + bob + i, 2, 1, k.inner);   // 앞이 갈라져 보이는 속옷
      }
      R(tx - 1, hipY + bob, 1, len, k.topD);
      if (mg) {   // 해진 끝단 + 주홍 술 2가닥 (자락 위)
        for (let x = tx - 1 - (len >> 2); x < tx + tw + 1 + (len >> 2); x += 3) R(x, hipY + bob + len, 1, 1, k.topD);
        const tl = Math.min(7, len + 1);
        R(tx + tw - 3, hipY + bob, 1, tl, k.accent); R(tx + tw - 1, hipY + bob + 1, 1, tl - 2, k.accent); R(tx + tw - 3, hipY + bob, 1, 1, k.gold);
      }
      if (def.style === 'wongwi') for (let x = tx - 2; x < tx + tw + 2; x += 2) R(x, hipY + bob + len, 1, 1, k.topD);   // 해진 끝단
    }

    // 뒤에 있는 것부터 그린다
    arm(swap ? 'guard' : pose.farArm, tx + 1, false);
    leg(pose.far, CX - lw, false);
    torso();
    leg(nearSpec, CX, true);
    if (def.skirt) skirt();
    head();
    arm(swap ? 'punch' : pose.arm, tx + Math.floor(tw / 2) - 1, true);
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
    if (def.style === 'mugyeom') { R(x - 1, y - hw, 3, hw, k.hair); R(x - 3, y - hw + 2, 2, 3, k.hair); R(x - 3, y - hw + 3, 2, 1, k.gold); R(x - 4, y - hw + 1, 1, 1, k.accent); }
    const coat = def.skirt ? Math.min(def.skirt, def.legLen - 2) : 0;   // 도포 자락이 다리를 덮음
    if (def.style === 'wongwi') { R(x - 5, y - hw + 1, 6, hw - 1, k.hair); R(x + 1, y - hw, 2, hw - 2, k.hair); }
    if (def.style === 'dokkaebi') { R(x - 1, y - hw, 3, hw, k.hair); R(x - 2, y - hw + 1, 2, 1, k.horn); R(x - 2, y - 3, 2, 1, k.horn); R(x + hh - 3, y - hw, 3, hw - 1, k.hair); }
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
    if (coat) { R(x, y - def.legW - 3, coat, def.legW + 3, k.top); R(x, y - 1, coat, 1, k.topD); }
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
    // 그림 키(칸, 외곽선 포함): 맨 위 불투명 줄 ~ 발바닥. 맞을 때 불꽃·체력바 높이에 쓴다 (판정과 무관). 서 있을 때·누웠을 때
    const tall = c => { const d = c.getContext('2d').getImageData(0, 0, FW, FH).data; let top = 0;
      while (top < FH && ![...Array(FW).keys()].some(x => d[(top * FW + x) * 4 + 3])) top++; return FOOT + 1 - top; };
    return { frames, flash, face, sheet: {}, height: tall(frames.idle0), downHeight: tall(frames.down) };
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

  // ----- 배경: 조선 마을 밤 (설정화 assets/reference/06·05·04 참고) -----
  function hanokRoof(R, cx, y, w, h, col, line, ridge) {   // 기와지붕: 아래로 넓어지고 처마 끝이 들림
    for (let i = 0; i < h; i++) {
      const rw = Math.round(w * 0.6 + w * 0.4 * (i / Math.max(1, h - 1)));
      R(cx - (rw >> 1), y + i, rw, 1, col);
      if (line && i > 1) for (let gx = cx - (rw >> 1) + 1; gx < cx + (rw >> 1); gx += 3) R(gx, y + i, 1, 1, line);   // 기와 고랑
    }
    R(cx - (w >> 1) - 2, y + h - 3, 3, 2, col); R(cx + (w >> 1) - 1, y + h - 3, 3, 2, col);   // 들린 처마 끝
    if (ridge) { R(cx - Math.round(w * 0.32), y - 1, Math.round(w * 0.64), 2, ridge); R(cx - Math.round(w * 0.32) - 1, y - 2, 2, 1, ridge); R(cx + Math.round(w * 0.32) - 1, y - 2, 2, 1, ridge); }
  }
  function lantern(g, R, x, y) {   // 처마에 매단 종이 등불 + 빛 번짐
    g.globalAlpha = 0.10; R(x - 6, y - 4, 15, 14, '#ffb35a'); R(x - 3, y - 7, 9, 20, '#ffb35a'); g.globalAlpha = 1;
    R(x + 1, y - 3, 1, 3, '#2a1c16');
    R(x, y, 3, 1, '#6b1f1a'); R(x - 1, y + 1, 5, 4, '#e8913a'); R(x, y + 1, 1, 4, '#ffd08a'); R(x, y + 5, 3, 1, '#6b1f1a');
  }

  function jSky(wu, hu) {
    const [c, g] = canvas(wu, hu); const R = painter(g); const r = rng(7);
    const bands = ['#0a0e1a', '#0d1322', '#11182b', '#151d33', '#1a233b', '#1f2941', '#252f46', '#2b354a'];
    const bh = Math.ceil(hu / bands.length);
    bands.forEach((col, i) => {
      R(0, i * bh, wu, bh, col);
      const next = bands[i + 1];
      if (next) for (let x = 0; x < wu; x += 2) { R(x, i * bh + bh - 1, 1, 1, next); if (x % 4 === 0) R(x + 1, i * bh + bh - 2, 1, 1, next); }
    });
    for (let i = 0; i < 40; i++) R(r() * wu | 0, r() * hu * 0.45 | 0, 1, 1, r() < 0.2 ? '#e8e4d6' : '#7d86a8');
    const mx = Math.round(wu * 0.78), my = 22;
    const disk = (rad, color) => { for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) if (dx * dx + dy * dy <= rad * rad + rad * 0.8) R(mx + dx, my + dy, 1, 1, color); };
    g.globalAlpha = 0.12; disk(14, '#efe6cc'); g.globalAlpha = 1;
    disk(9, '#efe6cc');
    R(mx - 3, my - 2, 3, 2, '#d6cba8'); R(mx + 2, my + 3, 2, 2, '#d6cba8');
    g.globalAlpha = 0.55;   // 달을 가로지르는 먹구름
    R(mx - 22, my + 3, 30, 2, '#1a2134'); R(mx - 6, my + 6, 34, 1, '#1a2134'); R(mx - 30, my - 8, 18, 1, '#1a2134');
    g.globalAlpha = 1;
    return c;
  }

  function jFar(wu, hu) {   // 겹겹 산 능선 + 소나무 + 가끔 탑
    const [c, g] = canvas(wu, hu); const R = painter(g); const r = rng(11);
    const ridge = (base, amp, col, seed) => {
      const q = rng(seed), p1 = q() * 6, p2 = q() * 6, ys = [];
      for (let x = 0; x < wu; x++) {
        const y = Math.round(base - amp * (0.55 + 0.3 * Math.sin(x / 37 + p1) + 0.15 * Math.sin(x / 13 + p2)));
        R(x, y, 1, hu - y, col); ys.push(y);
      }
      return ys;
    };
    ridge(hu - 22, 40, '#121a2c', 3);
    g.globalAlpha = 0.25; R(0, hu - 40, wu, 40, '#3a4560'); g.globalAlpha = 1;   // 산 사이 안개
    const near = ridge(hu - 6, 26, '#172036', 9);
    for (let x = 4; x < wu; x += 6 + (r() * 14 | 0)) {   // 능선 위 소나무
      const y = near[x], th = 4 + (r() * 4 | 0);
      for (let i = 0; i < th; i++) R(x - (i >> 1), y - th + i, 1 + (i >> 1) * 2, 1, '#121a2c');
    }
    for (let x = 60; x < wu; x += 180 + (r() * 120 | 0)) {   // 먼 탑 실루엣
      const y = near[Math.min(x, wu - 1)];
      R(x - 1, y - 22, 2, 22, '#121a2c');
      for (let k = 0; k < 4; k++) hanokRoof(R, x, y - 20 + k * 5, 12 - k * 2 + 6, 3, '#121a2c');
    }
    return c;
  }

  function jMid(wu, hu) {   // 뒷마을 지붕들 + 소나무
    const [c, g] = canvas(wu, hu); const R = painter(g); const r = rng(23);
    for (let x = -5; x < wu;) {
      const bw = 30 + (r() * 26 | 0), wallTop = hu - 18 - (r() * 14 | 0);
      if (r() < 0.25) {   // 소나무
        const tx0 = x + (bw >> 1), top = wallTop - 26;
        R(tx0, top + 10, 2, hu - top - 10, '#141820');
        for (let k = 0; k < 3; k++) R(tx0 - 9 + k * 2, top + k * 7, 20 - k * 3, 5, '#151d24');
        x += bw; continue;
      }
      R(x + 3, wallTop, bw - 6, hu - wallTop, '#1d2332');
      for (let wx = x + 6; wx < x + bw - 8; wx += 7) if (r() < 0.35) { R(wx, wallTop + 4, 4, 5, '#b9803a'); R(wx + 2, wallTop + 4, 1, 5, '#7a4f24'); }   // 불 켜진 창호
      hanokRoof(R, x + (bw >> 1), wallTop - 9, bw + 4, 9, '#161b27', '#11151e', '#1c2230');
      x += bw + 2 + (r() * 8 | 0);
    }
    return c;
  }

  function jFacade(wu, hu) {   // 캐릭터 바로 뒤 마을 길: 기와집·초가집·돌담·대나무·장독
    const [c, g] = canvas(wu, hu); const R = painter(g); const r = rng(42);
    const lamps = [];
    const stoneBase = (x, w, h) => {   // 주춧돌 줄
      R(x, hu - h, w, h, '#3c3a37');
      for (let sx = x; sx < x + w; sx += 4 + (r() * 3 | 0)) R(sx, hu - h, 3, h - 1, ['#5b5852', '#4f4c47', '#66625b'][r() * 3 | 0]);
    };
    for (let x = 0; x < wu;) {
      const kind = r();
      if (x > 0 && kind < 0.28) {   // 돌담 (기와 얹음) + 뒤로 대나무
        const ww = 34 + (r() * 30 | 0), wh = 18 + (r() * 4 | 0);
        for (let bx = x + 2; bx < x + ww - 2; bx += 3 + (r() * 3 | 0)) { const bh = 14 + (r() * 14 | 0); R(bx, hu - wh - bh, 1, bh, '#1e3328'); R(bx - 1, hu - wh - bh + 3, 3, 1, '#28432f'); }
        R(x, hu - wh, ww, wh, '#2e2c2a');
        for (let y = hu - wh + 1; y < hu; y += 4) for (let sx = x + ((y >> 2) % 2 ? 0 : 3); sx < x + ww; sx += 6) R(sx, y, 5, 3, ['#5d5a55', '#535049', '#67635c', '#4a4743'][r() * 4 | 0]);
        hanokRoof(R, x + (ww >> 1), hu - wh - 4, ww + 2, 4, '#252a33', '#1a1e26');
        if (r() < 0.6) for (let j = 0; j < 2 + (r() * 2 | 0); j++) { const jx = x + 4 + j * 7; R(jx, hu - 7, 6, 6, '#4a2c1e'); R(jx + 1, hu - 8, 4, 1, '#5a3626'); R(jx + 1, hu - 6, 1, 3, '#7a4a33'); }   // 장독
        x += ww; continue;
      }
      const giwa = kind < 0.68;
      const bw = giwa ? 70 + (r() * 30 | 0) : 56 + (r() * 22 | 0);
      const wallTop = hu - (giwa ? 34 : 28) - (r() * 4 | 0);
      stoneBase(x + 2, bw - 4, 4);
      const wall = giwa ? '#7c776b' : '#6e5a44', wallD = giwa ? '#625e53' : '#584634';
      R(x + 2, wallTop, bw - 4, hu - 4 - wallTop, wall);
      R(x + 2, wallTop + ((hu - 4 - wallTop) >> 1), bw - 4, (hu - 4 - wallTop) >> 1, wallD);   // 아래 반은 흙벽
      for (let px = x + 2; px < x + bw - 2; px += 18) R(px, wallTop, 2, hu - 4 - wallTop, '#3d2a1c');   // 기둥
      R(x + bw - 4, wallTop, 2, hu - 4 - wallTop, '#3d2a1c');
      R(x + 2, wallTop, bw - 4, 2, '#3d2a1c');   // 들보
      for (let dx = x + 6; dx + 12 < x + bw - 4; dx += 18) {   // 창호문: 불 켜진 한지 + 살
        const lit = r() < 0.55, dh = 14, dy = hu - 4 - dh - 2;
        R(dx - 1, dy - 1, 12, dh + 2, '#3d2a1c');
        R(dx, dy, 10, dh, lit ? '#e3b064' : '#5d564a');
        if (lit) R(dx, dy + dh - 5, 10, 5, '#c98d43');
        for (let lx = dx + 3; lx < dx + 10; lx += 3) R(lx, dy, 1, dh, lit ? '#7a4f24' : '#3d362d');
        for (let ly = dy + 3; ly < dy + dh; ly += 4) R(dx, ly, 10, 1, lit ? '#7a4f24' : '#3d362d');
      }
      if (giwa) hanokRoof(R, x + (bw >> 1), wallTop - 14, bw + 14, 14, '#262b35', '#1b1f27', '#30363f');
      else {   // 초가지붕: 둥근 짚 더미 + 새끼줄
        const rh = 13;
        for (let i = 0; i < rh; i++) { const rw = Math.round((bw + 10) * (0.55 + 0.45 * Math.sqrt(i / (rh - 1)))); R(x + (bw >> 1) - (rw >> 1), wallTop - rh + i, rw, 1, i < 2 ? '#9a8252' : '#7d6845'); }
        for (let i = 0; i < 3; i++) R(x - 3, wallTop - 2 - i * 4, bw + 6, 1, '#5e4d31');
        for (let fx = x - 4; fx < x + bw + 5; fx += 2) R(fx, wallTop, 1, 1 + (fx & 1), '#6a5738');   // 처마 짚 끝
      }
      for (const lx of [x + 6, x + bw - 9]) if (r() < 0.7) { lantern(g, R, lx, wallTop + 2); lamps.push(lx + 1); }
      x += bw;
    }
    return { c, lamps };
  }

  function jFloorEdge(R, wu) {   // 집 앞 디딤돌 줄 (질감 위에도 그림)
    R(0, 0, wu, 3, '#2e2c2a');
    const r = rng(77);
    for (let x = 0; x < wu; x += 5 + (r() * 4 | 0)) R(x, 0, 4 + (r() * 2 | 0), 2, ['#5d5a55', '#535049', '#67635c'][r() * 3 | 0]);
    R(0, 3, wu, 1, '#1d1914');
  }
  function jGlow(g, R, lamps) {   // 등불 빛이 바닥에 비침
    g.globalAlpha = 0.07;
    for (const lx of lamps) for (let dy = -7; dy <= 7; dy++) {
      const half = Math.round(Math.sqrt(1 - (dy / 7.5) ** 2) * 22);
      R(lx - half, 9 + dy, half * 2, 1, '#ffb35a');
    }
    g.globalAlpha = 1;
  }
  function jFloor(wu, hu, lamps) {   // 흙길 (그림 질감을 못 불러올 때 쓰는 코드 그림)
    const [c, g] = canvas(wu, hu); const R = painter(g); const r = rng(5);
    R(0, 0, wu, hu, '#3f3428');
    for (let i = 0; i < wu * 3; i++) R(r() * wu | 0, r() * hu | 0, 1, 1, ['#4a3d2e', '#352b21', '#47402f'][r() * 3 | 0]);
    for (let i = 0; i < wu / 6; i++) { const x = r() * wu | 0, y = 6 + (r() * (hu - 8) | 0); R(x, y, 3, 2, '#55524c'); R(x, y + 2, 3, 1, '#2a2620'); }   // 돌
    for (let i = 0; i < wu / 10; i++) R(r() * wu | 0, 6 + (r() * (hu - 8) | 0), 1, 1, ['#b5462a', '#d08a2a'][r() * 2 | 0]);   // 낙엽
    for (let x = 80; x < wu; x += 170 + (r() * 90 | 0)) { const y = 20 + (r() * 40 | 0); R(x, y, 14, 3, '#2a3550'); R(x + 3, y, 6, 1, '#6e86b8'); }   // 물웅덩이
    jFloorEdge(R, wu);
    jGlow(g, R, lamps);
    return c;
  }
  // 그림 질감(assets/joseon/floor_dirt.png)으로 바닥을 깐다. 질감은 원본 assets/reference/06 의 흙길 띠 3개(높이 330·560·760px)를
  // 150px 씩 겹쳐 서서히 섞고 끝을 처음과 이어 붙인 고리라, 뒤집지 않고 그대로 반복해도 이음매가 없다 (가로 801칸)
  function texturedFloor(img, wu, hu, lamps) {
    const [c, g] = canvas(wu, hu); const R = painter(g);
    R(0, 0, wu, hu, '#3f3428');
    for (let x = 0; x < wu; x += img.width) g.drawImage(img, x, 0, img.width, hu);
    jFloorEdge(R, wu);
    jGlow(g, R, lamps);
    return c;
  }

  // 스테이지 배경 한 벌. f = 카메라를 따라 움직이는 비율 (작을수록 멀리 있음). theme: 'joseon'(조선 마을) | 'street'(원래 밤거리)
  function buildStage({ W, H, groundTop, stageLength, theme = 'joseon' }) {
    const viewU = Math.ceil(W / S) + 2;
    const backU = Math.ceil(groundTop / S) + 1;
    const width = f => Math.ceil(((stageLength - W) * f + W) / S) + 4;
    const floorU = Math.ceil((H - groundTop) / S) + 1;
    if (theme === 'joseon') {
      const facade = jFacade(width(1), backU);
      return {
        sky: jSky(viewU, backU),
        layers: [
          { img: jFar(width(0.2), backU), f: 0.2 },
          { img: jMid(width(0.5), backU), f: 0.5 },
          { img: facade.c, f: 1 },
        ],
        floor: jFloor(width(1), floorU, facade.lamps),
        lamps: facade.lamps,
      };
    }
    const facade = buildFacade(width(1), backU);
    return {
      sky: buildSky(viewU, backU),
      layers: [
        { img: buildFar(width(0.2), backU), f: 0.2 },
        { img: buildMid(width(0.5), backU), f: 0.5 },
        { img: facade.c, f: 1 },
      ],
      floor: buildFloor(width(1), floorU, facade.lamps),
      lamps: facade.lamps,
    };
  }

  const characters = {};
  for (const [id, def] of Object.entries(CHARACTERS)) characters[id] = buildCharacter(def);

  // ----- 정식 캐릭터 스프라이트로 바꾸기 (규격: docs/sprite-spec.md, 목록: data/sprites.js) -----
  // 코드 그림은 임시 전투 스프라이트다. 시트를 불러오면 시트에 있는 동작만 바뀌고, 없는 동작은 코드 그림을 그대로 쓴다
  function useSpriteSheet(id, img, spec) {
    const set = characters[id];
    for (const [name, [col, row]] of Object.entries(spec.frames)) {
      const [c, g] = canvas(spec.frameW, spec.frameH);
      g.drawImage(img, col * spec.frameW, row * spec.frameH, spec.frameW, spec.frameH, 0, 0, spec.frameW, spec.frameH);
      set.sheet[name] = { img: c, flash: silhouette(c, '#ffffff') };
    }
    set.spec = spec;
    if (spec.height) set.sheetHeight = spec.height;
    if (spec.downHeight) set.sheetDownHeight = spec.downHeight;
    if (spec.face && set.sheet.idle0) {
      const [x, y, w, h] = spec.face, [c, g] = canvas(w, h);
      g.drawImage(set.sheet.idle0.img, x, y, w, h, 0, 0, w, h);
      set.sheetFace = c;
    }
  }
  // 정식 시트에만 있는 칸 (2026-10-28 P1, 3타 전용 준비·회수): 없으면 이 칸으로 (코드 그림도 이 칸)
  const SHEET_ONLY = { kickPrep: 'windup', kickRecover: 'idle0' };
  // 그릴 그림 한 장: { img, scale(화면 px / 그림 px), ax·ay(그림 안 발 기준점) }.
  // 별칭 칸(잡기·점프 공격·달려들기)이 시트에 없으면 원래 동작 칸을 쓴다. 단 칼 든 캐릭터는 시트의 원래 동작 칸이 칼 든 그림이라
  // 맨손 코드 그림(임시)을 쓴다 — 잡는 동안 칼이 보이거나 점프 공격이 찌르기로 보이지 않게
  function frameOf(id, name, flash) {
    const set = characters[id], armed = !!CHARACTERS[id].sword;
    const sh = set.sheet[name] || set.sheet[SHEET_ONLY[name]] || (!armed && set.sheet[BARE[name]]);
    if (sh) return { img: flash ? sh.flash : sh.img, scale: set.spec.scale, ax: set.spec.footX, ay: set.spec.footY };
    const code = set.frames[name] ? name : SHEET_ONLY[name] || name;
    return { img: (flash ? set.flash : set.frames)[code], scale: S, ax: CX, ay: FOOT };
  }
  // 판정용 모양 (코드 그림 기준): 가드 주먹 사각형 [x, y, w, h] 과 칼날 칸 [x, y] 들, 프레임 칸 좌표 (CX·FOOT 기준)
  function hitShapes(id, name) { const fr = characters[id].frames[name]; return (fr && fr.hit) || { fists: [], blade: [] }; }
  function heightOf(id, lying) {   // 화면 키 px (누워 있으면 누운 그림 높이. 시트에 height·downHeight 가 있으면 그 값)
    const set = characters[id];
    return lying ? set.sheetDownHeight || set.downHeight * S : set.sheetHeight || set.height * S;
  }
  function faceOf(id) {   // HUD 얼굴: 시트 얼굴은 높이 42px 로 맞춘다
    const set = characters[id];
    return set.sheetFace ? { img: set.sheetFace, scale: 42 / set.sheetFace.height } : { img: set.face, scale: S };
  }

  return { S, CX, FOOT, CHARACTERS, POSES, characters, sparks: buildSparks(), buildStage, texturedFloor, useSpriteSheet, frameOf, faceOf, heightOf, hitShapes, BARE, SWORD_TIP, text };
})();
