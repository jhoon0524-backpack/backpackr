// index.html 을 읽고 core 스크립트를 실행해 Core 를 돌려준다.
// vm 의 새 context 는 Array·Object 가 달라 deepStrictEqual 이 실패하므로 같은 영역에서 Function 으로 실행한다.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const htmlPath = fileURLToPath(new URL('../index.html', import.meta.url));

export function readHtml() {
  return readFileSync(htmlPath, 'utf8');
}

export function scripts(html = readHtml()) {
  const out = [];
  const re = /<script([^>]*)>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))) out.push({ attrs: m[1], code: m[2] });
  return out;
}

export function loadCore() {
  const core = scripts().find((s) => /id="core"/.test(s.attrs));
  if (!core) throw new Error('<script id="core"> 가 없다');
  return new Function(core.code + '\n;return Core;')();
}
