// 봇 차단이 있는 페이지를 헤드리스 Chromium으로 읽는다.
// 사용: node fetch.js <url> <outfile>  → STATUS/TITLE/---TEXT---(본문)/---LINKS---(링크) 형식으로 저장
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
(async () => {
  const url = process.argv[2], out = process.argv[3];
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ locale: 'ko-KR', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36' });
  const p = await ctx.newPage();
  let status;
  try { const r = await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }); status = r && r.status(); } catch (e) { status = 'ERR ' + e.message.split('\n')[0]; }
  await p.waitForTimeout(6000);
  const text = await p.evaluate(() => document.body ? document.body.innerText : '');
  const links = await p.evaluate(() => [...document.querySelectorAll('a')].map(a => (a.innerText.trim().replace(/\s+/g, ' ').slice(0, 120)) + ' => ' + a.href).filter(s => !s.startsWith(' =>')));
  require('fs').writeFileSync(out, `STATUS ${status}\nTITLE ${await p.title()}\n---TEXT---\n${text}\n---LINKS---\n${links.join('\n')}`);
  console.log(url, status, text.length);
  await b.close();
})();
