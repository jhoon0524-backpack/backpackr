// 데이터 파일만 고쳐 새 적(boss: brute 그림, 넘어뜨림)을 웨이브 1에 넣었을 때 동작하는지 (사본에서, 실제 게임은 안 고침)
const { GAME, OUT, ROOT } = require('./paths');
const { chromium } = require('playwright'); const fs = require('fs'); const { pathToFileURL } = require('url');
const base = OUT + '/addtest';
fs.rmSync(base, { recursive: true, force: true }); fs.mkdirSync(base + '/data', { recursive: true });
for (const f of ['index.html', 'art.js', 'data/feel.js']) fs.copyFileSync(ROOT + '/' + f, base + '/' + f);
fs.writeFileSync(base + '/data/enemies.js', fs.readFileSync(ROOT + '/data/enemies.js', 'utf8').replace('"knockdown": true }\n};', '"knockdown": true },\n  "boss":  { "hp": 120, "speed": 1.2, "w": 46, "h": 84, "dmg": 20, "score": 900, "windup": 34, "art": "brute", "knockdown": true }\n};'));
fs.writeFileSync(base + '/data/waves.js', fs.readFileSync(ROOT + '/data/waves.js', 'utf8').replace('{ "lockX": 300,  "enemies": [{ "type": "thug" }, { "type": "thug" }] }', '{ "lockX": 300,  "enemies": [{ "type": "boss" }, { "type": "thug" }] }'));
(async () => {
  const b = await chromium.launch(); const errors = [];
  const p = await b.newPage(); p.on('pageerror', e => errors.push(e.message)); p.on('dialog', d => { errors.push('알림: ' + d.message()); d.dismiss(); });
  await p.goto(pathToFileURL(base + '/index.html').href); await p.waitForTimeout(200); await p.keyboard.press('Enter');
  const r = await p.evaluate(() => { window.realUpdate = update; update = () => {};
    reset(); state = 'play'; let f = 0;
    keys.ArrowRight = true; while (!enemies.length && f < 600) { realUpdate(); f++; } keys.ArrowRight = false;
    const boss = enemies.find(e => e.type === 'boss');
    const got = boss && { hp: boss.hp, maxHp: boss.maxHp, dmg: boss.dmg, art: boss.art, knockdown: boss.knockdown };
    // boss 만 남기고 가만히 맞아 본다
    enemies = enemies.filter(e => e.type === 'boss'); player.hp = 999; let downed = false, hurt = 0, drawn = true;
    for (let i = 0; i < 1200 && !downed; i++) { const h = player.hp; realUpdate(); if (player.hp < h) hurt = h - player.hp; if (player.down > 0) downed = true; if (i % 20 === 0) { try { draw(); } catch (e) { drawn = e.message; } } }
    return { spawned: got, hurt, downed, drawn };
  });
  console.log(JSON.stringify(r), 'errors', errors); await b.close();
})();
