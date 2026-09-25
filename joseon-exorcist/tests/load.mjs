// index.html 을 읽고 core 스크립트를 Node vm 으로 실행해 Core 를 돌려준다.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

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
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(core.code + '\n;this.Core = Core;', ctx, { filename: 'core' });
  return ctx.Core;
}
