import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './load.mjs';

const Core = loadCore();
const ORDER = ['금', '목', '토', '수', '화'];

test('순환 금 > 목 > 토 > 수 > 화 > 금: 이기면 ×1.5', () => {
  for (let i = 0; i < 5; i++) {
    assert.equal(Core.elementMultiplier(ORDER[i], ORDER[(i + 1) % 5]), 1.5, `${ORDER[i]}→${ORDER[(i + 1) % 5]}`);
  }
});

test('대상이 이기면 ×0.7', () => {
  for (let i = 0; i < 5; i++) {
    assert.equal(Core.elementMultiplier(ORDER[(i + 1) % 5], ORDER[i]), 0.7, `${ORDER[(i + 1) % 5]}→${ORDER[i]}`);
  }
});

test('그 외 관계는 ×1 (같은 속성, 두 칸 떨어진 속성)', () => {
  for (let i = 0; i < 5; i++) {
    assert.equal(Core.elementMultiplier(ORDER[i], ORDER[i]), 1);
    assert.equal(Core.elementMultiplier(ORDER[i], ORDER[(i + 2) % 5]), 1);
    assert.equal(Core.elementMultiplier(ORDER[i], ORDER[(i + 3) % 5]), 1);
  }
});

test("'없음' 은 어느 쪽이든 ×1", () => {
  for (const e of ORDER) {
    assert.equal(Core.elementMultiplier('없음', e), 1);
    assert.equal(Core.elementMultiplier(e, '없음'), 1);
  }
});

test('기획서 예시', () => {
  assert.equal(Core.elementMultiplier('금', '목'), 1.5, '윤무겸→도깨비');
  assert.equal(Core.elementMultiplier('화', '수'), 0.7, '소운→흑린');
  assert.equal(Core.elementMultiplier('토', '수'), 1.5, '여울→흑린');
});
