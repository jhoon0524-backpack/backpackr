// 도깨비 걷기 → 공격 예고 → 돌진 → 펀치 연속 프레임 (코드 그림 vs 시안 시트), PC 화면 그대로 + 예고 자세만 실루엣(검은 그림자)으로.
// 쓰는 법: node tools/p1-draft/dokkaebi-seq.js <코드 그림 버전 index.html 주소> → docs/p1/dokkaebi-seq.png
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), { pathToFileURL } = require('url');
const ROOT = path.join(__dirname, '..', '..'), OUT = path.join(ROOT, 'tests', 'out', 'dokseq'), DOCS = path.join(ROOT, 'docs', 'p1');
const CODE_URL = process.argv[2];
if (!CODE_URL) { console.log('코드 그림 버전 index.html 주소를 주세요'); process.exit(1); }
const VERS = [['code', CODE_URL, '지금 코드 그림'], ['sheet', pathToFileURL(path.join(ROOT, 'index.html')).href, '시안 시트 (서기·걷기·예고·펀치 4칸)']];
(async () => {
  fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(DOCS, { recursive: true });
  const b = await chromium.launch(); const rows = {};
  for (const [vid, url] of VERS) {
    const ctx = await b.newContext({ viewport: { width: 960, height: 540 } }); const p = await ctx.newPage(); await p.goto(url); await p.waitForTimeout(700);
    // 도깨비가 300px 밖에서 걸어와 예고 → 돌진 → 펀치. 2프레임마다 한 장, 공격 끝까지
    const frames = await p.evaluate(() => {
      window.realUpdate = update; update = () => {};
      reset(); state = 'play'; waveState = 'fight'; cam = 0; time = 5; player.x = 380; player.y = 430; player.dir = 1; player.hp = 9999; player.invuln = 0;
      const e = Object.assign({ type: 'brute', ...ENEMY_TYPES.brute, maxHp: 999, hp: 999, x: 600, y: 430, z: 0, vz: 0, dir: -1, hitstun: 0, down: 0, attack: 0, cooldown: 0, dead: 0, flash: 0, entered: true, frozenUntil: 0, vx: 0, kbFriction: 0, invuln: 0, stomped: false, grabbed: false, thrown: null });
      enemies = [e]; window.E = e; const list = []; let f = 0, started = -1;
      while (f < 400) { realUpdate(); f++; if (e.attack > 0 && started < 0) started = f; if (started < 0 && Math.abs(e.x - player.x) > 160) continue;
        if (started > 0 && e.attack === 0 && f > started + 4) break; if (f % 2 === 0) list.push({ f, attack: e.attack, name: frameName(e, false), x: Math.round(e.x - player.x) }); }
      const firstAtk = list.findIndex(x => x.attack > 0);   // 걷기는 예고 직전 6장만
      return list.filter((x, i) => i >= firstAtk - 6);
    });
    // 다시 같은 판을 돌리며 해당 프레임에서 그림을 찍음 (판은 시드 고정이라 같다)
    const shots = [];
    for (const fr of frames) {
      await p.evaluate(target => { if (window.__f === undefined || target < window.__f) {
          reset(); state = 'play'; waveState = 'fight'; cam = 0; time = 5; player.x = 380; player.y = 430; player.dir = 1; player.hp = 9999; player.invuln = 0;
          const e = Object.assign({ type: 'brute', ...ENEMY_TYPES.brute, maxHp: 999, hp: 999, x: 600, y: 430, z: 0, vz: 0, dir: -1, hitstun: 0, down: 0, attack: 0, cooldown: 0, dead: 0, flash: 0, entered: true, frozenUntil: 0, vx: 0, kbFriction: 0, invuln: 0, stomped: false, grabbed: false, thrown: null });
          enemies = [e]; window.__f = 0; }
        while (window.__f < target) { realUpdate(); window.__f++; } draw(); }, fr.f);
      const file = path.join(OUT, `${vid}-${fr.f}.png`);
      await p.screenshot({ path: file, clip: { x: 330, y: 300, width: 230, height: 150 } });
      shots.push({ ...fr, file });
    }
    rows[vid] = shots; await ctx.close();
  }
  const img = f => `<img style="width:230px;image-rendering:pixelated" src="data:image/png;base64,${fs.readFileSync(f).toString('base64')}">`;
  const html = '<div style="padding:10px"><div style="font-size:16px">도깨비: 걷기 → 공격 예고 → 돌진 → 펀치 (PC 화면 그대로, 2프레임마다 한 장)</div>' +
    VERS.map(([vid, , label]) => `<div style="margin:10px 0 4px;color:${vid === 'sheet' ? '#fc6' : '#ddd'}">${label}</div><div style="display:flex;flex-wrap:wrap;gap:4px;width:1900px">` +
      rows[vid].map(s => `<div style="text-align:center">${img(s.file)}<div>${s.name}${s.attack ? ' ' + s.attack : ''} · ${s.x}px</div></div>`).join('') + '</div>').join('') + '</div>';
  const ctx = await b.newContext({ viewport: { width: 1920, height: 400 } }); const p = await ctx.newPage();
  await p.setContent(`<html><body style="margin:0;background:#15151c;color:#ddd;font:13px monospace">${html}</body></html>`); await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(DOCS, 'dokkaebi-seq.png'), fullPage: true });
  console.log(VERS.map(([v]) => `${v}: ${rows[v].map(s => s.name).join(' ')}`).join('\n'));
  await b.close();
})();
