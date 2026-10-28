// 여러 적을 상대할 때 3타(가드 주먹 판정)가 적의 공격 예고를 부당하게 끊는지 (2026-10-28 오너 지시).
// 같은 판을 가드 주먹 판정 켬/끔 두 번 돌려 비교: 적 예고 시작 수, 예고 도중 맞아 끊긴 수, 주먹 판정으로만 맞은 수(그중 예고 중이던 적),
// 예고 직전(쿨다운 끝·예고 거리 안)에 주먹 판정으로만 맞은 수, 주인공 피격 수. 벽사검객(조선) 전용
const { GAME } = require('./paths');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errors = [];
  const p = await b.newPage();
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(GAME.replace(/([?&])theme=[^&]*&?/, '$1')); await p.waitForTimeout(300);
  const r = await p.evaluate(() => {
    window.realUpdate = update; update = () => {};
    const realFist = fistHit, realInFront = inFront;
    const mk = (type, x, extra = {}) => Object.assign({ type, ...ENEMY_TYPES[type], maxHp: ENEMY_TYPES[type].hp, hp: ENEMY_TYPES[type].hp, x, y: 420, z: 0, vz: 0, dir: -1, hitstun: 0, down: 0, attack: 0, cooldown: 60, dead: 0, flash: 0, entered: true, frozenUntil: 0, vx: 0, kbFriction: 0, invuln: 0, stomped: false, grabbed: false, thrown: null }, extra);
    // 주인공: 가장 가까운 서 있는 적 쪽으로 돌아서며 3프레임마다 Z (제자리). 'chase' 면 가까운 적에게 44px 까지 다가감
    const run = (px, list, frames, fistOn, chase) => {
      reset(); state = 'play'; waveState = 'fight'; cam = 0; time = 5; player.x = px; player.y = 420; player.dir = 1; player.hp = 9999;
      enemies = list.map(([t, off, dy = 0, extra = {}]) => mk(t, px + off, { y: 420 + dy, dir: off > 0 ? -1 : 1, ...extra }));
      const st = { 예고: 0, 끊김: 0, 주먹만_명중: 0, 주먹만_예고중: 0, 주먹만_예고직전: 0, 피격: 0 };
      window.fistHit = (pp, e, a) => {
        if (!fistOn) return false;
        const hit = realFist(pp, e, a);
        if (hit && !realInFront(pp, e, a.reach, a.body)) { st.주먹만_명중++; if (e.attack > 0) st.주먹만_예고중++;
          else if (e.cooldown <= 0 && Math.abs(e.x - pp.x) <= attackStartOf(e)) st.주먹만_예고직전++; }
        return hit;
      };
      const prevAtk = enemies.map(() => 0); let hp0 = player.hp;
      for (let f = 0; f < frames; f++) {
        for (const k in keys) keys[k] = false;
        const live = enemies.filter(e => !e.dead && e.down === 0 && e.hp > 0).sort((a, c) => Math.abs(a.x - player.x) - Math.abs(c.x - player.x));
        if (live.length && player.attack === 0) {
          player.dir = live[0].x >= player.x ? 1 : -1;
          if (chase) { const dx = live[0].x - player.x, dy = live[0].y - player.y; if (Math.abs(dy) > 8) keys[dy > 0 ? 'ArrowDown' : 'ArrowUp'] = true; if (Math.abs(dx) > 44) keys[dx > 0 ? 'ArrowRight' : 'ArrowLeft'] = true; }
        }
        if (f % 3 === 0) pressed.KeyZ = true;
        realUpdate(); pressed = {};
        enemies.forEach((e, i) => {
          if (e.attack > 0 && prevAtk[i] === 0) st.예고++;
          if (prevAtk[i] > 8 && e.attack === 0 && !e.dead) st.끊김++;   // 타격(attack 8) 전에 공격이 취소됨 = 맞아서 끊김
          prevAtk[i] = e.attack;
        });
        if (player.hp < hp0) { st.피격++; hp0 = player.hp; }
      }
      window.fistHit = realFist;
      return st;
    };
    const scen = [
      // 앞 원귀를 콤보로 치는 동안 같은 줄 뒤쪽에 도깨비가 85~92px 에 서 있음 (쿨다운 끝 → 곧 예고)
      ...[86, 89, 92].map(d => [`원귀 40 + 도깨비 ${d} (같은 줄, 곧 예고)`, 480, [['thug', 40, 0, { cooldown: 9999, speed: 0 }], ['brute', d, 0, { cooldown: 0, speed: 0 }]], 300, false]),
      ...[94, 98, 102].map(d => [`원귀 40 + 도깨비 ${d} (예고 안 함, 측정 확인용)`, 480, [['thug', 40, 0, { cooldown: 9999, speed: 0 }], ['brute', d, 0, { cooldown: 9999, speed: 0 }]], 300, false]),
      ['원귀 2 + 도깨비 1 (한쪽)', 480, [['thug', 200], ['thug', 260, 4], ['brute', 300, -4]], 1200, false],
      ['원귀 2 + 도깨비 2 (양쪽)', 480, [['thug', 260], ['brute', 330, 6], ['thug', -300, -6], ['brute', -380, 3]], 1200, false],
      ['도깨비 3 (한쪽)', 480, [['brute', 200], ['brute', 270, 4], ['brute', 340, -4]], 1500, false],
      ['원귀 2 + 도깨비 2 (쫓아가며)', 480, [['thug', 260], ['brute', 330, 6], ['thug', -300, -6], ['brute', -380, 3]], 1500, true],
    ];
    const out = {};
    // 도깨비(같은 줄, 94~102px — 주인공이 1·2타로 약 10px 내디딘 뒤 3타 때 85~92px)의 쿨다운 끝 시점을 0~80프레임으로 바꿔 가며:
    // 3타가 예고 직전(쿨다운 끝·예고 거리 안)의 도깨비를 주먹 판정으로만 맞히는 경우가 있는지
    for (const d of [94, 98, 102]) { const sweep = [];
      for (let cd = 0; cd <= 80; cd++) { const st = run(480, [['thug', 40, 0, { cooldown: 9999, speed: 0 }], ['brute', d, 0, { cooldown: cd, speed: 0 }]], 200, true, false);
        if (st.주먹만_명중) sweep.push(`${cd}:${st.주먹만_예고직전 ? '예고직전' : '쿨다운중'}`); }
      out[`도깨비 ${d} 쿨다운 0~80 (주먹만 명중)`] = sweep.join(' ') || '없음'; }
    for (const [name, px, list, frames, chase] of scen) {
      const on = run(px, list, frames, true, chase), off = run(px, list, frames, false, chase);
      out[name] = `켬 ${JSON.stringify(on)} | 끔 예고 ${off.예고} 끊김 ${off.끊김} 피격 ${off.피격}`;
    }
    return out;
  });
  for (const [k, v] of Object.entries(r)) console.log(k.padEnd(28), v);
  console.log('errors', errors); await b.close();
})();
