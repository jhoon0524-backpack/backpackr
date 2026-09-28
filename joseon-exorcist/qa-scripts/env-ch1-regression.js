// 1장 환경 회귀 (ENV-PHASE-A · POLISH-A · POLISH-A2 기준, ENV-PHASE-B 뒤 현행화) — 헤드리스 크롬 360×740 (DPR 2)
// 확인: 환경 작업 전(eb2c703) 대비 맵·통과 64칸·M/K·판 크기·유닛 크기 동일 / 1장 칸 그림 규칙 / 이동·공격 강조 / 표식 /
//       환경 타일 이음새 (기획자 확정 기준: 실제 게임 표시 크기에서 인위적 반복 세로 이음새가 보이지 않는가 — lib/seamcheck.js) /
//       그림 실패 fallback / 장마다 자기 장 환경 그림만 요청 (1장 ch1 · 2장 ch2 · 3장 ch3 · 4~5장 없음, 서로 섞이지 않음)
// 실행: 1) joseon-exorcist 폴더를 http 로 띄운다 (기본 http://127.0.0.1:8765/index.html, NEW_URL 로 바꿈)
//       2) 환경 작업 전 기준판: `git show eb2c703:joseon-exorcist/index.html` 을 빈 폴더에 index.html 로 두고 assets 를 연결해 띄운다
//          (기본 http://127.0.0.1:8766/index.html, OLD_URL 로 바꿈)
//       3) NODE_PATH=$(npm root -g) node qa-scripts/env-ch1-regression.js   (playwright 필요, 크롬 경로는 PW_CHROMIUM)
// 캡처는 OUT (기본: 임시 폴더) 에만 쓴다 — 저장소의 qa-shots 는 덮어쓰지 않는다
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), os = require('os');
const seamCheck = require('./lib/seamcheck.js')();
const NEW = process.env.NEW_URL || 'http://127.0.0.1:8765/index.html', OLD = process.env.OLD_URL || 'http://127.0.0.1:8766/index.html';
const OUT = (process.env.OUT || path.join(os.tmpdir(), 'joseon-qa-env-ch1')) + '/';
fs.mkdirSync(OUT, { recursive: true });
const FIN = OUT;
const R = [];
const rec = (sec, item, ok, note = '') => { R.push(ok); console.log(`[${sec}] ${ok ? 'PASS' : 'FAIL'} — ${item}${note ? ' (' + note + ')' : ''}`); };
const SEEN = ['news:ch1', 'news:ch2', 'news:ch3', 'news:ch3b', 'news:ch4'];
const CH = { ch1: { region: 'heukseok', cleared: [], merit: 0 }, ch2: { region: 'yeougol', cleared: ['ch1'], merit: 3 }, ch3: { region: 'seonang', cleared: ['ch1', 'ch2'], merit: 7 }, ch4: { region: 'pyesachal', cleared: ['ch1', 'ch2', 'ch3'], merit: 13 }, ch5: { region: 'keungoeul', cleared: ['ch1', 'ch2', 'ch3', 'ch4'], merit: 19 } };
async function page(url, block) {
  const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium', args: ['--no-proxy-server'] });
  const p = await b.newPage({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const errs = [], reqs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && !/favicon/.test(m.location().url || '') && errs.push(m.text()));
  p.on('request', (r) => reqs.push(r.url().split('/assets/')[1] || ''));
  if (block) await p.route(block, (r) => r.abort());
  await p.goto(url);
  return { b, p, errs, reqs };
}
async function start(p, ch) {
  await p.evaluate(([c, seen]) => { localStorage.clear(); if (c.cleared.length) localStorage.setItem('joseon-exorcist.progress', JSON.stringify({ v: 1, cleared: c.cleared, merit: c.merit, training: {} })); localStorage.setItem('joseon-exorcist.world', JSON.stringify({ v: 1, seen })); localStorage.setItem('joseon-exorcist.tips', JSON.stringify(['M', 'K', 'E'])); }, [CH[ch], SEEN]);
  await p.reload();
  await p.evaluate(() => { const nb = Core.newBattle; Core.newBattle = function () { const s = nb.apply(this, arguments); if (arguments.length > 1) window.__s = s; return s; }; });
  if (await p.isVisible('#btn-continue')) { await p.click('#btn-continue'); await p.waitForTimeout(400); }
  else { await p.click('#btn-new'); await p.waitForTimeout(300); if (await p.isVisible('#btn-new-yes')) await p.click('#btn-new-yes'); await p.waitForSelector('#btn-mission.on', { timeout: 20000 }); await p.click('#btn-mission'); await p.waitForTimeout(600); }
  if (await p.isVisible('#world-news')) { await p.click('#world-news-ok'); await p.waitForTimeout(300); }
  await p.click(`#world-nodes .node[data-id="${CH[ch].region}"]`); await p.waitForTimeout(250);
  await p.click('#world-sheet .row button.go'); await p.waitForTimeout(500);
  if (await p.isVisible('#ask')) { await p.click('#ask-no'); await p.waitForTimeout(400); }
  for (let i = 0, q = 0; i < 120 && q < 6; i++) { if (await p.isVisible('#scene')) { q = 0; await p.click('#scene'); await p.waitForTimeout(80); } else { q++; await p.waitForTimeout(250); } }
  for (let i = 0, q = 0; i < 60 && q < 4; i++) { q = (await p.evaluate(() => document.querySelectorAll('.toast').length)) ? 0 : q + 1; await p.waitForTimeout(500); }
  await p.waitForTimeout(600);
}
const cell = (p, r, c) => p.click(`#board .cell[data-r="${r}"][data-c="${c}"]`);
const measure = (p) => p.evaluate(() => {
  const s = Core.STAGES.ch1, pass = [], mk = [];
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { pass.push(Core.isPassable(__s, r, c) ? 1 : 0); const t = Core.terrainAt(__s, r, c); if (t === 'M' || t === 'K') mk.push(t + r + c); }
  const br = document.getElementById('board').getBoundingClientRect();
  const units = {}; document.querySelectorAll('#board .unit').forEach((t) => { const u = t.getBoundingClientRect(), cr = t.closest('.cell').getBoundingClientRect(), a = t.querySelector('.art'), ar = a && a.getBoundingClientRect(), img = t.querySelector('.art img');
    units[t.dataset.id] = { w: +u.width.toFixed(2), h: +u.height.toFixed(2), occ: +(u.width * u.height / (cr.width * cr.height)).toFixed(4), art: ar ? +ar.width.toFixed(2) : 0, tf: img ? getComputedStyle(img).transform : '', pos: t.closest('.cell').dataset.r + ',' + t.closest('.cell').dataset.c }; });
  return { map: s.map.join('/'), pass: pass.join(''), mk: mk.join(','), board: [+br.width.toFixed(2), +br.height.toFixed(2)], cells: document.querySelectorAll('#board .cell').length, units };
});
const clip = (p, cellsRC, pad = 4) => p.evaluate(([cs, pad]) => { const rs = cs.map(([r, c]) => document.querySelector(`#board .cell[data-r="${r}"][data-c="${c}"]`).getBoundingClientRect()); const x = Math.max(0, Math.min(...rs.map((r) => r.left)) - pad), y = Math.max(0, Math.min(...rs.map((r) => r.top)) - pad); return { x, y, width: Math.min(360 - x, Math.max(...rs.map((r) => r.right)) - x + pad), height: Math.max(...rs.map((r) => r.bottom)) - y + pad }; }, [cellsRC, pad]);
// 선택 해제용: 아군에게서 가장 먼 빈 칸 (가까운 칸은 행동 중 아군이 그리로 움직인다)
const far = (p) => p.evaluate(() => { let best = null, bd = -1; const al = __s.units.filter((u) => u.side === 'ally' && u.alive);
  for (let r = 0; r < __s.rows; r++) for (let c = 0; c < __s.cols; c++) { if (!Core.isPassable(__s, r, c) || Core.unitAt(__s, r, c)) continue; const d = Math.min(...al.map((u) => Math.abs(u.r - r) + Math.abs(u.c - c))); if (d > bd) { bd = d; best = [r, c]; } }
  return best; });
const shot = (p, n, c) => p.screenshot({ path: OUT + n + '.png', clip: c });
const hlAfter = (p, sel) => p.evaluate((sel) => { const c = document.querySelector(sel); if (!c) return null; const s = getComputedStyle(c, '::after'); return s.backgroundColor + ' | ' + s.boxShadow + ' | z' + s.zIndex; }, sel);
(async () => {
  // ── 작업 전 (eb2c703) ──
  let o = await page(OLD); await start(o.p, 'ch1'); const before = await measure(o.p);
  // 이동 범위 강조 (작업 전)
  const hlMoveOld = await hlAfter(o.p, '#board .cell.hl-move'); // 시작하면 첫 아군이 자동 선택되어 이동 범위가 켜져 있다
  await o.b.close();
  // ── 작업 후 ──
  const { b, p, errs, reqs } = await page(NEW);
  const titleEnv = reqs.filter((u) => /environment\//.test(u)).length;
  await start(p, 'ch1');
  const after = await measure(p);
  rec('동일', '1장 맵 문자열 작업 전후 동일', before.map === after.map, after.map);
  rec('동일', 'Core.isPassable 64칸 전부 동일', before.pass === after.pass && after.pass.length === 64, after.pass);
  rec('동일', 'M/K 좌표 동일', before.mk === after.mk, after.mk);
  rec('동일', '판(board) 전체 폭·높이 동일 · 8×8 칸 64개', JSON.stringify(before.board) === JSON.stringify(after.board) && after.cells === 64, JSON.stringify(after.board));
  const ids = Object.keys(before.units);
  const same = ids.every((id) => after.units[id] && ['w', 'h', 'occ', 'art', 'tf', 'pos'].every((k) => after.units[id][k] === before.units[id][k]));
  rec('유닛 크기', '유닛 ' + ids.length + '개 전부 폭·높이·칸 점유율·그림 상자·확대값·자리 작업 전후 동일', same && ids.length >= 10, ids.map((id) => id + ' ' + after.units[id].w + '×' + after.units[id].h + ' ' + Math.round(after.units[id].occ * 100) + '%').join(' / '));
  const typesCovered = ['yoon', 'dallae', 'dokkaebi', 'jangsan', 'bulgasari', 'heuklin'].every((t) => ids.some((id) => id.indexOf(t) === 0));
  rec('유닛 크기', '대표 종류 포함 (아군·달래·도깨비·장산범·불가사리·흑린)', typesCovered);
  // 배경 그림
  const env = await p.evaluate(() => [...document.querySelectorAll('#board .cell')].map((c) => ({ r: +c.dataset.r, c: +c.dataset.c, t: Core.terrainAt(__s, +c.dataset.r, +c.dataset.c), env: c.classList.contains('env-ch1'), bg: (c.style.backgroundImage.match(/env_(\w+)\.webp/) || [])[1], color: getComputedStyle(c).backgroundColor })));
  const expect = (t, r, c) => t === '.' ? ((r * 3 + c) % 4 === 0 ? 'path' : 'dirt') : t === 'D' ? ((r + c) % 2 === 0 ? 'block_house' : 'block_rock') : t === 'M' ? 'shrine' : t === 'K' ? 'spring' : null;
  rec('배경', '64칸 모두 env-ch1 · 좌표 규칙대로 그림 (. 흙/길 · D 집/바위 · M 서낭당 · K 약수터)', env.length === 64 && env.every((x) => x.env && x.bg === expect(x.t, x.r, x.c)), [...new Set(env.map((x) => x.t + ':' + x.bg))].join(' '));
  rec('배경', '그림 뒤 지형 색은 그대로 (실패 시 fallback)', env.every((x) => x.color !== 'rgba(0, 0, 0, 0)'));
  const loaded = await p.evaluate(() => [...new Set(performance.getEntriesByType('resource').map((e) => e.name).filter((n) => /environment\/ch1/.test(n)).map((n) => n.split('/').pop()))]);
  rec('배경', '환경 그림 6개 모두 불러옴', loaded.length === 6, loaded.join(','));
  rec('배경', '첫 화면(장 시작 전)에는 환경 그림을 부르지 않음', titleEnv === 0, 'title env requests ' + titleEnv);
  const envReq1 = [...new Set(reqs.filter((u) => /^environment\//.test(u)))];
  rec('장 구분', '1장은 1장 환경 그림(ch1/)만 요청 — 다른 장 환경 섞이지 않음', envReq1.length === 6 && envReq1.every((u) => /^environment\/ch1\//.test(u)), envReq1.join(','));
  const mk = await p.evaluate(() => [...document.querySelectorAll('#board .mark')].map((m) => m.textContent + ':' + getComputedStyle(m).opacity + ':' + (getComputedStyle(m).textShadow !== 'none' ? 'shadow' : '-') + ':' + getComputedStyle(m).backgroundColor));
  rec('표식', '🏮💧 = 진하기 0.72 + 그림자 · 표식 상자 색 그대로 · 🛖 0.2 그림자 없음 (삭제·교체 없음)', mk.length === 11 && mk.every((x) => /^🛖/.test(x) ? /:0\.2:-:/.test(x) : /:0\.72:shadow:/.test(x)) && new Set(mk.map((x) => x.split(':').pop())).size === 1, mk.join(' '));
  // 그림 끝 검은 띠: 가장자리 16px 평균 밝기 / 가운데 밝기
  // 이음새 (기획자 확정 기준): 실제 판의 칸 크기·칸 사이 틈으로 1장 환경 그림 6개를 판정
  const geo = await p.evaluate(() => { const c = document.querySelector('#board .cell').getBoundingClientRect(), n = document.querySelector('#board .cell[data-c="1"]').getBoundingClientRect(); return { cell: +c.width.toFixed(2), gap: +(n.left - c.right).toFixed(2) }; });
  for (const n of ['dirt', 'path', 'block_house', 'block_rock', 'shrine', 'spring']) {
    const r = await p.evaluate(`(${seamCheck.toString()})('assets/environment/ch1/env_${n}.webp', ${geo.cell}, ${geo.gap})`);
    rec('이음새', `env_${n}: 게임 크기(칸 ${geo.cell}px · 틈 ${geo.gap}px)에서 반복 세로 이음새 없음 — 끝 띠 ≤ 틈 너비 · 틈과 떨어진 안쪽 선 없음`, r.ok, `끝 띠 왼 ${r.edgeL}px · 오른 ${r.edgeR}px · 안쪽 선 ${r.inner || '없음'}`);
  }
  await p.screenshot({ path: FIN + 'board-final.png' });
  await p.screenshot({ path: FIN + 'rock-clean-final.png', clip: await clip(p, [[4, 4], [5, 5]], 8) });
  await p.screenshot({ path: FIN + 'spring-clean-final.png', clip: await clip(p, [[3, 2], [3, 4]], 10) });
  // 1~8 캡처
  await shot(p, '01-start-clean');
  await shot(p, '02-dirt-no-band', await clip(p, [[3, 4], [4, 7]]));
  await shot(p, '03-shrine-no-band', await clip(p, [[0, 2], [0, 5]], 8));
  await shot(p, '05-shrine-mark', await clip(p, [[0, 3], [0, 4]], 10));
  await shot(p, '06-spring-mark', await clip(p, [[3, 2], [3, 4]], 10));
  // 9. 이동 범위 (시작 때 자동 선택된 첫 아군)
  await shot(p, '04-move-highlight');
  const hlMoveNew = await hlAfter(p, '#board .cell.hl-move');
  const nMove = await p.evaluate(() => document.querySelectorAll('#board .cell.hl-move').length);
  rec('강조', '1장 환경 칸 이동 범위 = 청회색 .35 + 테두리 1px .72 (조금 진하게) · 층 그대로', hlMoveNew === 'rgba(126, 156, 176, 0.35) | rgba(150, 182, 202, 0.72) 0px 0px 0px 1px inset | z0' && nMove > 0, hlMoveNew + ' · ' + nMove + '칸 (작업 전 ' + hlMoveOld + ')');
  // 10. 공격 범위: 윤무겸을 도깨비 옆으로
  await p.evaluate(() => { const y = __s.units.find((u) => u.id === 'yoon'); y.r = 0; y.c = 0; y.acted = false; y.from = null; }); // 도깨비(0,1) 바로 옆
  await cell(p, ...(await far(p))); await p.waitForTimeout(200); await cell(p, 0, 0); await p.waitForTimeout(250); await cell(p, 0, 0); await p.waitForTimeout(400);
  await p.click('#btn-attack'); await p.waitForTimeout(300);
  await shot(p, '10-attack-range');
  const hlAtk = await hlAfter(p, '#board .cell.hl-attack');
  await shot(p, '07-attack-vs-move');
  rec('강조', '공격 강조 그대로 (주홍 .38 · 2px) · 이동(.35 · 1px)보다 강한 위계 유지', hlAtk === 'rgba(166, 61, 50, 0.38) | rgb(208, 96, 79) 0px 0px 0px 2px inset | z0', hlAtk);
  const top = await p.evaluate(() => { const u = document.querySelector('#board .unit'), bar = u.querySelector('.hpbar'), k = document.querySelector('#board .unit .kind'); return { unitZ: getComputedStyle(u).zIndex, hpZ: getComputedStyle(bar).zIndex, kindVis: !!k && getComputedStyle(k).visibility === 'visible' }; });
  rec('강조', '유닛·HP·종류 표식 층 그대로 (유닛 z1 · HP z2)', top.unitZ === '1' && top.hpZ === '2' && top.kindVis, JSON.stringify(top));
  await p.click('#btn-cancel').catch(() => {}); await p.keyboard.press('Escape').catch(() => {});
  // 11. 한 턴 진행 뒤 달래·적·아군
  await cell(p, ...(await far(p))); await p.waitForTimeout(200);
  await p.click('#btn-end'); await p.waitForFunction(() => __s.phase === 'ally' || __s.result !== null, null, { timeout: 40000 }).catch(() => {}); await p.waitForTimeout(1500);
  await shot(p, '11-battle');
  const after2 = await measure(p);
  rec('유닛 크기', '턴 진행 뒤에도 유닛 크기 동일', Object.keys(after2.units).every((id) => before.units[id] ? after2.units[id].w === before.units[id].w && after2.units[id].h === before.units[id].h : after2.units[id].w === before.units.yoon.w), 'turn ' + (await p.evaluate(() => __s.turn)));
  rec('기타', '가로 스크롤 없음 · 콘솔 오류 없음', !(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)) && errs.length === 0, errs.slice(0, 2).join(' / '));
  await b.close();
  // 12. 환경 그림 실패
  const f = await page(NEW, '**/assets/environment/**');
  await start(f.p, 'ch1');
  const fb = await f.p.evaluate(() => [...document.querySelectorAll('#board .cell')].slice(0, 64).map((c) => getComputedStyle(c).backgroundColor));
  const t0 = await f.p.evaluate(() => __s.turn);
  await f.p.screenshot({ path: OUT + '08-fallback.png' });
  await f.p.click('#btn-end'); await f.p.waitForFunction((t0) => (__s.phase === 'ally' && __s.turn > t0) || __s.result !== null, t0, { timeout: 40000 }).catch(() => {});
  const t1 = await f.p.evaluate(() => __s.turn);
  rec('fallback', '환경 그림 실패 → 기존 지형 색 · 유닛 그림 그대로 · 턴 진행 · 팝업 없음', new Set(fb).size >= 4 && (await f.p.evaluate(() => document.querySelectorAll('#board .unit .art img').length)) > 0 && t1 === t0 + 1 && !(await f.p.isVisible('#ask')), [...new Set(fb)].join(' ') + ' turn ' + t0 + '→' + t1);
  rec('fallback', '스크립트 오류 없음', f.errs.every((e) => /Failed to load resource|ERR_FAILED/.test(e)));
  await f.b.close();
  // 다른 장: 자기 장 환경 그림만 (2장 ch2 7개 · 3장 ch3 7개 · 4장 ch4 6개 · 5장 ch5 7개) · 1장 전용 보정(이동 강조 · 🏮💧 그림자)이 번지지 않음
  // (3장은 ENV-PHASE-C 에서 서낭당 🏮 에만 같은 그림자를 따로 허용받았다)
  for (const ch of ['ch2', 'ch3', 'ch4', 'ch5']) {
    const x = await page(NEW); await start(x.p, ch);
    const e = await x.p.evaluate(() => ({ cells: document.querySelectorAll('#board .cell').length, ch1: document.querySelectorAll('#board .cell.env-ch1').length, ch2: document.querySelectorAll('#board .cell.env-ch2').length, ch3: document.querySelectorAll('#board .cell.env-ch3').length, ch4: document.querySelectorAll('#board .cell.env-ch4').length, ch5: document.querySelectorAll('#board .cell.env-ch5').length, bg: [...document.querySelectorAll('#board .cell')].filter((c) => c.style.backgroundImage).length }));
    const envReq = [...new Set(x.reqs.filter((u) => /^environment\//.test(u)))];
    const gm = await hlAfter(x.p, '#board .cell.hl-move');
    const shadow = await x.p.evaluate((ch) => [...document.querySelectorAll('#board .mark')].some((m) => getComputedStyle(m).textShadow !== 'none' && !(ch === 'ch3' && m.closest('.cell').classList.contains('t-shrine'))), ch);
    const has = ch === 'ch2' || ch === 'ch3' || ch === 'ch4' || ch === 'ch5', n = ch === 'ch4' ? 6 : has ? 7 : 0;
    const own = has ? envReq.length === n && envReq.every((u) => u.indexOf('environment/' + ch + '/') === 0) && e[ch] === e.cells && e.bg === e.cells && ['ch1', 'ch2', 'ch3', 'ch4', 'ch5'].filter((k) => k !== ch).every((k) => e[k] === 0)
      : envReq.length === 0 && e.ch1 === 0 && e.ch2 === 0 && e.ch3 === 0 && e.ch4 === 0 && e.ch5 === 0 && e.bg === 0;
    rec('장 구분', ch + (has ? ': ' + ch.slice(2) + '장 환경 그림(' + ch + '/)만 요청 · 모든 칸 env-' + ch + ' · 다른 장 환경 섞이지 않음' : ': 환경 그림 요청 0 · env 클래스 0 (아직 환경 없는 장)'), own, JSON.stringify(e) + ' / 요청 ' + (envReq.join(',') || '없음'));
    rec('장 구분', ch + ': 1장 전용 보정 없음 — 이동 강조 전역값 · 지형 표식 그림자 없음' + (ch === 'ch3' ? ' (3장 서낭당 🏮 제외)' : ''), gm === hlMoveOld && !shadow, (gm || '이동 강조 없음') + ' / 그림자 ' + shadow);
    await x.b.close();
  }
  console.log(`PASS ${R.filter(Boolean).length} FAIL ${R.filter((x) => !x).length}`);
})();
