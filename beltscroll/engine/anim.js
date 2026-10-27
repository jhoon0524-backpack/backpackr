import { CONFIG } from './config.js';

// 키프레임 사이를 이즈아웃으로 보간한다.
// 각 키: { dur: 도착까지 프레임, hold: 머무는 프레임, root: {x,y,rot}, parts: { 파츠id: {rot,x,y,sx,sy} } }
// 첫 키의 출발점은 loop면 마지막 키, 아니면 기본자세(모든 값 0, 스케일 1).

const DEFAULTS = { rot: 0, x: 0, y: 0, sx: 1, sy: 1 };
const NEUTRAL = { root: {}, parts: {} };

const easeOut = (u) => 1 - Math.pow(1 - u, CONFIG.EASE_OUT_POWER);
const val = (t, k) => (t && t[k] !== undefined ? t[k] : DEFAULTS[k]);

function blend(a = {}, b = {}, e) {
  const out = {};
  for (const k of Object.keys(DEFAULTS)) {
    const va = val(a, k);
    const vb = val(b, k);
    out[k] = va + (vb - va) * e;
  }
  return out;
}

export function poseLength(pose) {
  return pose.keys.reduce((s, k) => s + k.dur + (k.hold || 0), 0);
}

export function samplePose(pose, partIds, t) {
  const total = poseLength(pose);
  let time = pose.loop ? t % total : Math.min(t, total);
  let index = 0;
  let e = 1;
  let inHold = false;
  for (let i = 0; i < pose.keys.length; i++) {
    const k = pose.keys[i];
    const span = k.dur + (k.hold || 0);
    if (time < span || i === pose.keys.length - 1) {
      index = i;
      inHold = time >= k.dur;
      e = k.dur > 0 ? easeOut(Math.min(time / k.dur, 1)) : 1;
      break;
    }
    time -= span;
  }
  const to = pose.keys[index];
  const from = index > 0 ? pose.keys[index - 1] : pose.loop ? pose.keys[pose.keys.length - 1] : NEUTRAL;
  const parts = {};
  for (const id of partIds) parts[id] = blend(from.parts?.[id], to.parts?.[id], e);
  return { root: blend(from.root, to.root, e), parts, key: to, index, inHold, done: !pose.loop && t >= total };
}
