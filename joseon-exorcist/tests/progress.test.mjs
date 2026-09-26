import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './load.mjs';

const Core = loadCore();

test('처음: 깬 장 없음, 누계 0, 다음은 1장', () => {
  const p = Core.newProgress();
  assert.deepEqual(p, { v: 1, cleared: [], merit: 0 });
  assert.equal(Core.nextStage(p), 'ch1');
});

test('이기면 누계에 더하고 다음 장으로', () => {
  const p = Core.applyResult(Core.newProgress(), 'ch1', 'win', 5);
  assert.deepEqual(p, { v: 1, cleared: ['ch1'], merit: 5 });
  assert.equal(Core.nextStage(p), 'ch2');
  assert.equal(Core.rankFor(p.merit).name, '정9품');
});

test('지면 그대로 (다시하기)', () => {
  const p = Core.applyResult(Core.newProgress(), 'ch1', 'lose', 5);
  assert.deepEqual(p, Core.newProgress());
  assert.equal(Core.nextStage(p), 'ch1');
});

test('같은 장을 두 번 이겨도 한 번만 더한다', () => {
  let p = Core.applyResult(Core.newProgress(), 'ch1', 'win', 5);
  p = Core.applyResult(p, 'ch1', 'win', 8);
  assert.equal(p.merit, 5);
});

test('모든 장을 깨면 다음 장은 없음 (준비 중)', () => {
  let p = Core.applyResult(Core.newProgress(), 'ch1', 'win', 6);
  p = Core.applyResult(p, 'ch2', 'win', 4);
  assert.equal(Core.nextStage(p), 'ch3', 'v0.7: 2장 뒤 3장');
  p = Core.applyResult(p, 'ch3', 'win', 6);
  assert.equal(p.merit, 16);
  assert.equal(Core.nextStage(p), null);
});

test('원본 진행 상태는 바뀌지 않는다', () => {
  const p = Core.newProgress();
  Core.applyResult(p, 'ch1', 'win', 3);
  assert.deepEqual(p, Core.newProgress());
});

test('저장 값 검사: 망가진 값은 버린다', () => {
  assert.deepEqual(Core.checkProgress({ v: 1, cleared: ['ch1'], merit: 4 }), { v: 1, cleared: ['ch1'], merit: 4 });
  for (const bad of [null, 'x', {}, { v: 2, cleared: [], merit: 0 }, { v: 1, cleared: ['ch9'], merit: 0 }, { v: 1, cleared: [], merit: -1 }]) {
    assert.equal(Core.checkProgress(bad), null, JSON.stringify(bad));
  }
});

test('장 순서의 모든 장이 게임 안에 있다', () => {
  for (const id of Core.CAMPAIGN) assert.ok(Core.STAGES[id], id);
});

// ── 기존 저장 호환 (specs/immersion.md 11장): 업데이트로 진행·공적·품계가 후퇴하지 않는다 ──
test('이전 판(사람 공적이 있던 때)의 누계는 다시 계산하지 않고 그대로 읽는다', () => {
  const old = { v: 1, cleared: ['ch1', 'ch2'], merit: 13 }; // 1장 8 + 2장 5(무녀 2 포함)
  const p = Core.checkProgress(JSON.parse(JSON.stringify(old)));
  assert.deepEqual(p, old);
  assert.equal(Core.rankFor(p.merit).name, '종8품');
  assert.equal(Core.nextStage(p), 'ch3', '2장까지 깬 이전 저장은 3장으로 이어진다');
});

test('깬 장을 다시 이겨도 누계·진행은 줄지도 늘지도 않는다', () => {
  const p = { v: 1, cleared: ['ch1', 'ch2'], merit: 13 };
  assert.deepEqual(Core.applyResult(p, 'ch2', 'win', 0), p);
  assert.deepEqual(Core.applyResult(p, 'ch1', 'lose', 0), p);
});

test('새 저장: 빈 진행에서 1장부터', () => {
  const p = Core.newProgress();
  assert.deepEqual(p, { v: 1, cleared: [], merit: 0 });
  assert.equal(Core.nextStage(p), 'ch1');
});
