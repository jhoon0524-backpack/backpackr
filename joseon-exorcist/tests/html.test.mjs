import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readHtml, scripts, loadCore } from './load.mjs';

test('모든 script 가 문법 오류 없이 읽힌다', () => {
  const list = scripts();
  assert.ok(list.length >= 2, 'core 와 ui 스크립트가 있어야 한다');
  for (const s of list) {
    assert.doesNotThrow(() => new vm.Script(s.code), `문법 오류: <script${s.attrs}>`);
  }
});

test('외부 주소를 불러오지 않는다', () => {
  const html = readHtml();
  const bad = html.match(/\b(?:src|href)\s*=\s*["']?\s*(?:https?:)?\/\//gi) || [];
  assert.deepEqual(bad, []);
  assert.equal(/@import/i.test(html), false, 'CSS @import 금지');
});

test('core 를 Node 에서 불러올 수 있다', () => {
  const Core = loadCore();
  assert.equal(typeof Core, 'object');
});

test('core 는 화면과 Math.random 을 직접 쓰지 않는다', () => {
  const core = scripts().find((s) => /id="core"/.test(s.attrs)).code;
  for (const word of ['document', 'window', 'Math.random']) {
    assert.equal(core.includes(word), false, `core 안에 ${word} 가 있다`);
  }
});
