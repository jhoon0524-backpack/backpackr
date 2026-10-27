// 데이터 오타 알림: 정상 사본은 알림 0, 오타 사본은 해당 알림 1개
const { GAME, OUT, ROOT } = require('./paths');
const { chromium } = require('playwright'); const fs = require('fs'); const { pathToFileURL } = require('url');
const base = OUT + '/typo';
(async () => {
  const b = await chromium.launch();
  const cases = { '정상': s => s, '웨이브 적 이름 오타': (s, f) => f === 'waves.js' ? s.replace('"thug" }, { "type": "thug" }] }', '"thugg" }, { "type": "thug" }] }') : s, '그림 이름 오타': (s, f) => f === 'enemies.js' ? s.replace('"art": "brute"', '"art": "brut"') : s };
  for (const [name, fn] of Object.entries(cases)) {
    fs.rmSync(base, { recursive: true, force: true }); fs.mkdirSync(base + '/data', { recursive: true });
    for (const f of ['index.html', 'art.js']) fs.copyFileSync(ROOT + '/' + f, base + '/' + f);
    for (const f of ['enemies.js', 'waves.js', 'feel.js']) fs.writeFileSync(base + '/data/' + f, fn(fs.readFileSync(ROOT + '/data/' + f, 'utf8'), f));
    const p = await b.newPage(); const alerts = [], errors = [];
    p.on('dialog', d => { alerts.push(d.message()); d.dismiss(); }); p.on('pageerror', e => errors.push(e.message));
    await p.goto(pathToFileURL(base + '/index.html').href); await p.waitForTimeout(300);
    console.log(name.padEnd(14), JSON.stringify(alerts), 'killFlashMult', await p.evaluate(() => KILL_FLASH_MULT).catch(() => '-'), 'errors', errors.length); await p.close();
  }
  await b.close();
})();
