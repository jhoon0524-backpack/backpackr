// 검사가 사거리 밖에서 적을 일방적으로 제압하는지 (비교: BEFORE_URL=file:///.../index.html node dominance.js)
// A) 제자리 연타: 주인공은 서서 3프레임마다 Z (적 쪽을 봄), 적 1명이 300px 밖에서 걸어옴 (보통 AI), 900프레임
// B) 자동 플레이(determ 와 같은 봇) 클리어까지: 남은 체력, 맞은 횟수
const { chromium } = require('playwright');
const { GAME } = require('./paths');
const BEFORE = process.env.BEFORE_URL;   // 비교할 예전 버전 index.html 주소 (없으면 지금 버전만)
(async () => {
  const b = await chromium.launch();
  for (const [label, url] of [...(BEFORE ? [['바꾸기 전', BEFORE]] : []), ['지금', GAME]]) {
    const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(url); await p.waitForTimeout(300);
    const r = await p.evaluate(() => {
      window.realUpdate = update; update = () => {};
      const mk = (type, x, extra = {}) => Object.assign({ type, ...ENEMY_TYPES[type], maxHp: ENEMY_TYPES[type].hp, x, y: 420, z: 0, vz: 0, dir: -1, hitstun: 0, down: 0, attack: 0, cooldown: 60, dead: 0, flash: 0, entered: true, frozenUntil: 0, vx: 0, kbFriction: 0, invuln: 0, stomped: false, grabbed: false, thrown: null }, extra);
      const out = {};
      for (const [name, types] of [['원귀 1', ['thug']], ['도깨비 1', ['brute']], ['원귀 2', ['thug', 'thug']], ['원귀+도깨비', ['thug', 'brute']]]) {
        reset(); state = 'play'; waveState = 'fight'; cam = 0; time = 5; player.x = 400; player.y = 420; player.dir = 1; player.hp = 9999;
        enemies = types.map((t, i) => mk(t, 700 + i * 60, { y: 420 + (i ? 4 : 0) }));
        let windups = 0, hurt = 0, firstHitDist = null, kill = null, hp0 = player.hp, prevAtk = enemies.map(() => 0), prevHp = enemies.map(e => e.hp);
        for (let f = 0; f < 900; f++) {
          if (f % 3 === 0) pressed.KeyZ = true;
          realUpdate(); pressed = {};
          enemies.forEach((e, i) => { if (e.attack > 0 && prevAtk[i] === 0) windups++; prevAtk[i] = e.attack;
            if (e.hp < prevHp[i] && firstHitDist === null) firstHitDist = Math.round(Math.abs(e.x - player.x)); prevHp[i] = e.hp; });
          if (player.hp < hp0) { hurt++; hp0 = player.hp; }
          if (kill === null && enemies.every(e => e.dead || e.hp <= 0)) kill = f;
          player.dir = 1;
        }
        out[name] = { 적_공격예고: windups, 주인공_맞음: hurt, 첫_명중_거리: firstHitDist, 전멸_프레임: kill };
      }
      // B) 자동 플레이
      reset(); state = 'play'; let f = 0, hits = 0, hp0 = player.hp;
      while (state === 'play' && f < 30000) {
        for (const k in keys) keys[k] = false;
        const live = enemies.filter(e => !e.dead && e.down === 0); let pr = {};
        if (!live.length) keys.ArrowRight = true;
        else { live.sort((a, c) => Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(c.x - player.x, c.y - player.y));
          const e = live[0], dx = e.x - player.x, dy = e.y - player.y;
          if (Math.abs(dy) > 8) keys[dy > 0 ? 'ArrowDown' : 'ArrowUp'] = true;
          if (Math.abs(dx) > 44) keys[dx > 0 ? 'ArrowRight' : 'ArrowLeft'] = true;
          else if (f % 7 === 0) { if ((dx > 0) !== (player.dir > 0)) keys[dx > 0 ? 'ArrowRight' : 'ArrowLeft'] = true; else pr = { KeyZ: true }; } }
        Object.assign(pressed, pr); realUpdate(); pressed = {}; f++;
        if (player.hp < hp0) { hits++; } hp0 = player.hp;
      }
      for (const k in keys) keys[k] = false;
      out['자동 플레이'] = { 결과: state, 프레임: f, 남은_체력: player.hp, 맞은_횟수: hits };
      return out;
    });
    console.log('==', label); for (const [k, v] of Object.entries(r)) console.log('  ', k.padEnd(10), JSON.stringify(v)); if (errs.length) console.log(errs);
    await p.close();
  }
  await b.close();
})();
