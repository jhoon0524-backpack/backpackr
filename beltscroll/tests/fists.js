// 적 가드 주먹 판정 (2026-10-28 오너 결정): 서 있기·걷기 그림에서 몸 앞끝 밖으로 나온 주먹에 칼날이 실제로 겹치면 명중.
// 자세별·타별로 "그림에서 계산한 경계" 1px 안은 맞고 경계·1px 밖은 헛치는지, 다른 자세(예고·펀치·달려들기)는 주먹 판정이 없는지,
// 높이가 어긋나면 헛치는지, 몸 폭(hurtHalfWidth)·뒤쪽 규칙은 그대로인지. 벽사검객(조선) 전용 — 격투가는 주먹 판정을 쓰지 않는다
const { GAME } = require('./paths');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errors = [];
  const p = await b.newPage();
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(GAME.replace(/([?&])theme=[^&]*&?/, '$1')); await p.waitForTimeout(300);
  const r = await p.evaluate(() => {
    window.realUpdate = update; update = () => {};
    const step = (n = 1, k = {}) => { for (let i = 0; i < n; i++) { Object.assign(pressed, k); realUpdate(); pressed = {}; k = {}; } };
    const mk = (type, x, extra = {}) => Object.assign({ type, ...ENEMY_TYPES[type], speed: 0, maxHp: 999, hp: 999, x, y: 420, z: 0, vz: 0, dir: -1, hitstun: 0, down: 0, attack: 0, cooldown: 9999, dead: 0, flash: 0, entered: true, frozenUntil: 0, vx: 0, kbFriction: 0, invuln: 0, stomped: false, grabbed: false, thrown: null }, extra);
    const fresh = () => { reset(); state = 'play'; waveState = 'fight'; cam = 0; time = 5; player.x = 480; player.y = 420; player.dir = 1; player.hp = 9999; };
    // 적 그림을 한 자세로 고정 (주인공 그림은 그대로)
    const realFrame = frameName; let forced = null;
    window.frameName = (f, isPlayer) => (!isPlayer && forced) ? forced : realFrame(f, isPlayer);
    // n타째를 dx 거리의 적에게: 1타부터 이어 맞히지 않으면 2·3타가 안 나오므로, 앞 타는 몸에 닿는 거리에서 맞히고 마지막 타 직전에 적을 (앞 타로 내디딘) 주인공 앞 dx 로 옮긴다
    const swing = (type, n, dx, pose) => {
      fresh(); forced = pose; const e = mk(type, 480 + 40); enemies = [e];
      for (let k = 1; k <= n; k++) {
        if (k === n) { player.lunge = 0; e.x = player.x + dx; e.y = player.y; e.hitstun = 0; e.vx = 0; }
        const hp = e.hp; step(1, { KeyZ: true }); let f = 0;
        while (player.attack > 0 && e.hp === hp && f < 40) { step(); f++; }
        if (k === n) { forced = null; return e.hp < hp; }
        while (player.attack > 0) step();
        e.down = 0; e.hitstun = 0; e.z = 0; e.vz = 0;
      }
    };
    // 그림 칸에서 직접 계산한 경계: 칼날 칸과 주먹 칸이 높이로 겹치는 쌍 중 가장 먼 거리 (이 거리 미만이면 겹침)
    const S = ART.S, CX = ART.CX, FOOT = ART.FOOT;
    const bound = (type, n, pose, useHeight = true) => {
      const fists = ART.hitShapes(ENEMY_TYPES[type].art, pose).fists, blade = ART.hitShapes(PLAYER_ART, ATTACKS[n - 1].pose).blade;
      let best = -Infinity;
      for (const [fx, fy, fw, fh] of fists) for (const [bx, by] of blade) {
        const fh0 = (FOOT + 1 - fy - fh) * S, fh1 = (FOOT + 1 - fy) * S, bh0 = (FOOT - by) * S, bh1 = (FOOT + 1 - by) * S;
        if (useHeight && !(Math.max(fh0, bh0) < Math.min(fh1, bh1))) continue;
        best = Math.max(best, (bx + 1 - CX) * S + (fx + fw - CX) * S);
      }
      return best;
    };
    const out = {};
    const bodyMax = t => ATTACKS[0].reach + hurtHalf(ENEMY_TYPES[t]);   // 몸 판정만으로 닿는 거리 (미만)
    out['기준'] = `몸 판정 끝 = 칼끝 ${ATTACKS[0].reach} + 몸 앞끝 ${hurtHalf(ENEMY_TYPES.thug)}/${hurtHalf(ENEMY_TYPES.brute)} = 적 중심 ${bodyMax('thug')}/${bodyMax('brute')}px 미만`;
    // 1) 자세별 주먹 칸 (가드 자세만 판정에 쓰임)
    for (const t of ['thug', 'brute']) {
      const art = ENEMY_TYPES[t].art;
      out[`${t} 주먹 앞끝(그림)`] = ['idle0', 'idle1', 'walk0', 'walk1', 'walk2', 'walk3', 'windup', 'rush0', 'rush1', 'punch'].map(pose => {
        const f = ART.hitShapes(art, pose).fists, front = f.length ? Math.max(...f.map(([fx, , fw]) => (fx + fw - CX) * S)) : null;
        return `${pose} ${front === null ? '-' : front + 'px'}${GUARD_POSE.test(pose) ? '' : '(판정없음)'}`;
      }).join(' ');
    }
    // 2) 경계: 가드 자세 × 1·2·3타. 경계-1 맞음 / 경계 헛침 / 경계+1 헛침 (몸 판정 끝보다 경계가 안쪽이면 몸 판정이 결정 → "몸")
    const bad = [];
    for (const t of ['thug', 'brute']) for (const pose of ['idle0', 'idle1', 'walk0', 'walk1', 'walk2', 'walk3']) {
      const row = [];
      for (const n of [1, 2, 3]) {
        const B = bound(t, n, pose), Bflat = bound(t, n, pose, false), M = bodyMax(t);
        if (B <= M) { const ok = swing(t, n, M - 1, pose) && !swing(t, n, M + 1, pose); row.push(`${n}타 몸${ok ? '' : '✗'}${Bflat > M ? `(높이 무시하면 ${Bflat})` : ''}`); if (!ok) bad.push(`${t} ${pose} ${n}타`); continue; }
        const a = swing(t, n, B - 1, pose), c = swing(t, n, B, pose), d = swing(t, n, B + 1, pose), ok = a && !c && !d;
        row.push(`${n}타 ${B}px${ok ? '' : '✗'}`); if (!ok) bad.push(`${t} ${pose} ${n}타 (${a}/${c}/${d})`);
      }
      out[`${t} ${pose} 경계`] = row.join(' · ');
    }
    // 3) 가드가 아닌 자세: 가드 자세에서 맞던 가장 먼 거리에서도 헛침 (주먹 판정 없음)
    for (const t of ['thug', 'brute']) {
      const far = Math.max(...['idle0', 'idle1', 'walk0', 'walk1', 'walk2', 'walk3'].flatMap(pose => [1, 2, 3].map(n => bound(t, n, pose)))) - 1;
      if (far <= bodyMax(t)) { out[`${t} 다른 자세`] = '주먹이 몸 앞끝 밖으로 안 나옴 (주먹 판정 영향 없음)'; continue; }
      const res = ['windup', 'rush0', 'rush1', 'punch'].map(pose => `${pose} ${[1, 2, 3].map(n => swing(t, n, far, pose) ? '맞음' : '헛침').join('/')}`);
      out[`${t} 다른 자세 (거리 ${far}, 1/2/3타)`] = res.join(' ');
      if (res.some(s => s.includes('맞음'))) bad.push(`${t} 다른 자세`);
    }
    // 4) 높이: 가로로는 겹치는 칼날·주먹을 주인공 높이만 올려 어긋나게 하면 헛침 (함수 직접 확인)
    fresh(); forced = 'idle0';
    const e = mk('brute', 480 + bound('brute', 3, 'idle0') - 1); enemies = [e];
    const at = z => fistHit({ ...player, z }, e, ATTACKS[2]);
    out['높이 (도깨비 idle0, 3타 경계-1, 주인공 높이 0/15/30/45)'] = [0, 15, 30, 45].map(z => at(z) ? '맞음' : '헛침').join('/');
    forced = null;
    // 5) 뒤쪽: 도깨비가 등 뒤 11px 에서 주인공 쪽을 보고 주먹이 칼날과 겹쳐도 헛침 (몸 판정의 뒤쪽 규칙과 같이)
    fresh(); forced = 'idle0'; const back = mk('brute', 480 - 11, { dir: 1 }); enemies = [back];
    out['뒤쪽 11px 도깨비(주인공 쪽 봄)'] = [1, 2, 3].map(n => fistHit(player, back, ATTACKS[n - 1]) ? '맞음' : '헛침').join('/');
    forced = null;
    out['결과'] = bad.length ? '어긋남 ' + bad.join(', ') : '모두 경계대로';
    return out;
  });
  for (const [k, v] of Object.entries(r)) console.log(k.padEnd(34), v);
  console.log('errors', errors); await b.close();
})();
