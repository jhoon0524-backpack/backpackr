// 벽사검 사거리: 그림의 칼끝과 판정이 맞는지, 닿는 적만 맞는지, 뒤·다른 줄은 안 맞는지, 어느 거리에서 시작해도 1→2→3타가 이어지는지
const { GAME } = require('./paths');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(GAME); await p.waitForTimeout(300);
  const r = await p.evaluate(() => {
    window.realUpdate = update; update = () => {};
    const step = (n = 1, k = {}) => { for (let i = 0; i < n; i++) { Object.assign(pressed, k); realUpdate(); pressed = {}; k = {}; } };
    const mk = (type, x, y, extra = {}) => Object.assign({ type, ...ENEMY_TYPES[type], speed: 0, maxHp: 999, hp: 999, x, y, z: 0, vz: 0, dir: -1, hitstun: 0, down: 0, attack: 0, cooldown: 9999, dead: 0, flash: 0, entered: true, frozenUntil: 0, vx: 0, kbFriction: 0, invuln: 0, stomped: false, grabbed: false, thrown: null }, extra);
    const fresh = dir => { reset(); state = 'play'; waveState = 'fight'; cam = 0; time = 5; player.x = 480; player.y = 420; player.dir = dir; player.hp = 9999; };
    const out = {};
    // 1) 그림의 칼끝 (불투명 강철색 칸의 오른쪽 끝) vs 판정 끝
    const tipPx = n => { const c = ART.characters.mugyeom.frames[n], d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let t = -1;
      for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) { const i = (y * c.width + x) * 4; if (d[i + 3] && ((d[i] === 0xc3 && d[i + 1] === 0xcc) || (d[i] === 0xf1 && d[i + 1] === 0xf4))) t = Math.max(t, x); }
      return (t + 1 - ART.CX) * ART.S; };
    out['칼끝 vs 판정'] = ATTACKS.map((a, i) => `${i + 1}타 칼끝 ${tipPx(a.pose)} / 판정 ${a.reach} / 차이 ${Math.abs(tipPx(a.pose) - a.reach)}px`).join(' | ');
    // 2) 몸 앞면이 판정 끝 바로 안(1px)·바로 밖(1px) — 1타로, 적 2종 × 좌우. 적은 제자리(speed 0)에 세워 판정 순간 거리를 고정
    const one = (type, dx, dy, dir) => { fresh(dir); const e = mk(type, 480 + dir * dx, 420 + dy); enemies = [e]; const hp = e.hp; step(1, { KeyZ: true }); let f = 0; while (player.attack > 0 && f < 40) { step(); f++; } return e.hp < hp; };
    const res = [];
    for (const type of ['thug', 'brute']) for (const dir of [1, -1]) {
      const w2 = ENEMY_TYPES[type].w / 2, R = ATTACKS[0].reach;
      res.push(`${type}${dir > 0 ? '→' : '←'} 안${one(type, R + w2 - 1, 0, dir) ? '맞음' : '헛침'}·밖${one(type, R + w2 + 1, 0, dir) ? '맞음' : '헛침'}`);
    }
    out['몸 앞면 판정 끝 ±1px (1타)'] = res.join(' ');
    // 3) 뒤쪽·다른 줄
    out['뒤쪽 (적 중심 -9 / -11 / -30px)'] = ['thug', 'brute'].map(t => `${t} ${[9, 11, 30].map(d => one(t, -d, 0, 1) ? '맞음' : '헛침').join('/')}`).join(' ');
    out['다른 줄 (깊이 차 21 / 22 / 40px, 거리 40)'] = ['thug', 'brute'].map(t => `${t} ${[21, 22, 40].map(dy => one(t, 40, dy, 1) ? '맞음' : '헛침').join('/')}`).join(' ');
    // 4) 1→2→3타: 여러 거리에서 시작해 세 번 다 맞는지 (서 있는 적, 버튼 연타)
    const combo = (type, dx) => { fresh(1); const e = mk(type, 480 + dx, 420); enemies = [e]; const hits = []; let last = e.hp;
      for (let f = 0; f < 120 && hits.length < 3; f++) { step(1, f % 3 === 0 ? { KeyZ: true } : {}); if (e.hp < last) { hits.push(f); last = e.hp; } }
      return hits.length; };
    for (const type of ['thug', 'brute']) {
      const max = ATTACKS[0].reach + ENEMY_TYPES[type].w / 2 - 1, broken = [];
      for (let dx = 20; dx <= max; dx += 2) { const n = combo(type, dx); if (n < 3) broken.push(`${dx}:${n}`); }
      out[`콤보 ${type} 거리 20~${max}px`] = broken.length ? '끊김 ' + broken.join(' ') : '모두 3타';
    }
    return out;
  });
  for (const [k, v] of Object.entries(r)) console.log(k.padEnd(32), v);
  console.log('errors', errors); await b.close();
})();
