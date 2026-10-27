import { CONFIG } from './config.js';
import { createRng } from './rng.js';
import { get } from './data.js';
import { samplePose } from './anim.js';
import { spawnEffect, updateEffect } from './effects.js';

const easeOut = (u) => 1 - Math.pow(1 - u, CONFIG.EASE_OUT_POWER);

function makeEntity(spec, role, id) {
  const def = get('characters', spec.char);
  return {
    id, role, def,
    x: spec.x, y: spec.y, facing: spec.facing || 1,
    state: 'idle', t: 0, pose: 'idle',
    hp: def.hp, flash: 0, knock: null, attack: null,
  };
}

export function createWorld(scene, seed) {
  const stage = get('stages', scene.stage);
  const entities = [];
  if (scene.player) entities.push(makeEntity(scene.player, 'player', 0));
  (scene.enemies || []).forEach((e, i) => entities.push(makeEntity(e, 'enemy', i + 1)));
  return {
    scene, stage, seed,
    rng: createRng(seed),
    frame: 0,
    entities,
    effects: [],
    events: [],
    hitstop: 0,
    timeScale: 1,
    shake: { t: 0, frames: 0, amp: 0, x: 0, y: 0 },
    prevInput: {},
  };
}

// 장면 JSON의 스크립트 입력: [{ at, for, hold: ['attack', 'left', ...] }]
export function scriptInput(scene, frame) {
  const input = {};
  for (const s of scene.input || []) {
    if (frame >= s.at && frame < s.at + (s.for || 1)) for (const k of s.hold) input[k] = true;
  }
  return input;
}

function setState(e, state, pose) {
  e.state = state;
  e.pose = pose;
  e.t = 0;
}

export function currentPose(e) {
  const pose = e.def.poses[e.pose];
  return samplePose(pose, e.def.parts.map((p) => p.id), e.t);
}

function updatePlayer(w, e, input, pressed) {
  if (e.state === 'hurt') return;
  if (e.state === 'attack') {
    if (currentPose(e).done) setState(e, 'idle', 'idle');
    return;
  }
  if (pressed.attack && e.def.attacks?.length) {
    setState(e, 'attack', e.def.attacks[0].pose);
    e.attack = { index: 0, hit: new Set() };
  }
}

function updateHurt(e) {
  if (e.state !== 'hurt') return;
  if (e.knock) {
    const k = e.knock;
    k.t++;
    e.x = k.from + k.dist * easeOut(Math.min(k.t / k.frames, 1));
    if (k.t >= k.frames) e.knock = null;
  }
  if (e.t >= e.def.hurtFrames) setState(e, 'idle', 'idle');
}

function attackBox(e) {
  const hb = e.def.attacks[e.attack.index].hitbox;
  const s = e.def.scale || 1;
  const x0 = e.x + e.facing * hb.x * s;
  const x1 = e.x + e.facing * (hb.x + hb.w) * s;
  return { left: Math.min(x0, x1), right: Math.max(x0, x1), top: e.y - (hb.y + hb.h) * s, bottom: e.y - hb.y * s };
}

export function bodyBox(e) {
  const b = e.def.body;
  const s = e.def.scale || 1;
  return { left: e.x - (b.w / 2) * s, right: e.x + (b.w / 2) * s, top: e.y - b.h * s, bottom: e.y };
}

export function activeAttackBox(e) {
  if (e.state !== 'attack') return null;
  const p = currentPose(e);
  return p.key.hit && p.inHold ? attackBox(e) : null;
}

function applyHit(w, attacker, target) {
  const atk = attacker.def.attacks[attacker.attack.index];
  const feel = get('feel', atk.feel);
  attacker.attack.hit.add(target.id);
  target.hp -= atk.damage;
  target.facing = -attacker.facing;
  target.flash = feel.flash;
  target.knock = { from: target.x, dist: feel.knockback.dist * attacker.facing, frames: feel.knockback.frames, t: 0 };
  setState(target, 'hurt', 'hurt');
  w.hitstop = feel.hitstop;
  w.shake = { t: feel.shake.frames, frames: feel.shake.frames, amp: feel.shake.amp, x: 0, y: 0 };
  const box = attackBox(attacker);
  const tb = bodyBox(target);
  const hx = attacker.facing > 0 ? Math.max(box.left, tb.left) + (box.right - box.left) * 0.25 : Math.min(box.right, tb.right) - (box.right - box.left) * 0.25;
  const hy = (box.top + box.bottom) / 2;
  w.effects.push(spawnEffect(get('effects', atk.effect), hx, hy, attacker.facing, w.rng));
  w.events.push({ type: 'hit', frame: w.frame, attacker: attacker.id, target: target.id, attack: attacker.attack.index, feel: feel.id });
}

function detectHits(w) {
  for (const a of w.entities) {
    const box = activeAttackBox(a);
    if (!box) continue;
    for (const t of w.entities) {
      if (t === a || t.role === a.role || a.attack.hit.has(t.id)) continue;
      const tb = bodyBox(t);
      const overlapX = box.left < tb.right && box.right > tb.left;
      if (overlapX && Math.abs(a.y - t.y) <= CONFIG.DEPTH_TOLERANCE) applyHit(w, a, t);
    }
  }
}

function updateShake(w) {
  const s = w.shake;
  if (s.t <= 0) {
    s.x = 0;
    s.y = 0;
    return;
  }
  const amp = s.amp * (s.t / s.frames);
  s.x = Math.round((w.rng.next() * 2 - 1) * amp);
  s.y = Math.round((w.rng.next() * 2 - 1) * amp);
  s.t--;
}

export function stepWorld(w, input) {
  w.frame++;
  const pressed = {};
  for (const k of Object.keys(input)) pressed[k] = input[k] && !w.prevInput[k];
  w.prevInput = { ...input };

  for (const e of w.entities) if (e.flash > 0) e.flash--;
  if (w.hitstop > 0) {
    w.hitstop--;
    w.timeScale = 0;
  } else {
    w.timeScale = 1;
    for (const e of w.entities) {
      e.t++;
      if (e.role === 'player') updatePlayer(w, e, input, pressed);
      updateHurt(e);
    }
    detectHits(w);
  }
  for (const fx of w.effects) updateEffect(fx);
  w.effects = w.effects.filter((fx) => !fx.done);
  updateShake(w);
}

export function frameInfo(w) {
  const enemy = w.entities.find((e) => e.role === 'enemy');
  return {
    frame: w.frame,
    timeScale: w.timeScale,
    shakeX: w.shake.x,
    shakeY: w.shake.y,
    enemyX: enemy ? Math.round(enemy.x * 100) / 100 : null,
  };
}
