// 시험판 세로 화면 점검 (2026-11-04): node tools/ai-pilot/portrait_check.js <원본 index.html 경로> <시험판 index.html 경로>
//  폰 세로 3종(320·390·412)·폰 가로·태블릿 세로·PC 에서 원본/시험판: 세로 안내, 캔버스 크기, 공격↔점프 테두리 틈, 점프 왼끝↔스틱 오른끝 틈(+ 이어야), 상단 버튼의 게임 좌표 y, 세로 스크롤, 세로에서 조작 영역 빈 곳 탭 → 시작
const { chromium, devices } = require('playwright');
const C = [['S9+ 세로 320', devices['Galaxy S9+']], ['iPhone13 세로 390', devices['iPhone 13']], ['Pixel7 세로 412', devices['Pixel 7']],
  ['폰 가로 915x412', { viewport: { width: 915, height: 412 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true }],
  ['태블릿 세로 768x1024', devices['iPad (gen 7)']], ['PC 1440x900', { viewport: { width: 1440, height: 900 } }]];
(async () => {
  const b = await chromium.launch();
  for (const [label, dev] of C) for (const [ver, url] of [['원본', process.argv[2]], ['시험판', process.argv[3]]]) {
    const ctx = await b.newContext({ ...dev }); const p = await ctx.newPage(); await p.goto('file://' + url); await p.waitForTimeout(600);
    const r = await p.evaluate(() => {
      const bb = id => { const e = document.getElementById(id); const s = getComputedStyle(e); if (s.display === 'none') return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
      const cv = document.querySelector('canvas').getBoundingClientRect(); const a = bb('btnAttack'), j = bb('btnJump'), st = bb('stick'), f = bb('btnFull') || bb('btnSound');
      const gap = (a && j) ? Math.hypot(a.x + a.w / 2 - j.x - j.w / 2, a.y + a.h / 2 - j.y - j.h / 2) - a.w / 2 - j.w / 2 : null;
      return { rotate: getComputedStyle(document.getElementById('rotate')).display, canvas: [Math.round(cv.width), Math.round(cv.height)],
        btnGap: gap === null ? null : +gap.toFixed(1), jumpVsStick: (j && st) ? +(j.x - (st.x + st.w)).toFixed(1) : null,
        topBtnGameY: f ? Math.round((f.y - cv.y) / cv.height * 540) : null, scrollH: document.documentElement.scrollHeight - innerHeight };
    });
    let started = null;
    if (ver === '시험판' && /세로/.test(label) && dev.hasTouch) { const vp = p.viewportSize(); const cv = await p.locator('canvas').boundingBox();
      await p.touchscreen.tap(20, cv.y + cv.height + 30); await p.waitForTimeout(200); started = await p.evaluate(() => state); }
    console.log(label.padEnd(18), ver.padEnd(4), JSON.stringify(r), started ? '빈 곳 탭 → ' + started : '');
    await ctx.close();
  }
  await b.close();
})();
