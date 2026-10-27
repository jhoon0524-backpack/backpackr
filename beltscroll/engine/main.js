import { CONFIG } from './config.js';
import { get } from './data.js';
import { createWorld, stepWorld, scriptInput, frameInfo } from './world.js';
import { renderFrame, worldPalette } from './render.js';
import { installSnapApi } from './snapshot.js';

// URL: ?scene=<이름>&frame=<N>&seed=<수>&paused=1
const params = new URLSearchParams(location.search);
const sceneId = params.get('scene') || CONFIG.DEFAULT_SCENE;
const seed = Number(params.get('seed') ?? CONFIG.DEFAULT_SEED);
const startFrame = Number(params.get('frame') ?? 0);
let paused = params.get('paused') === '1';

const scene = get('scenes', sceneId);
const canvas = document.getElementById('screen');
canvas.width = CONFIG.WIDTH;
canvas.height = CONFIG.HEIGHT;
const ctx = canvas.getContext('2d');

function fitToWindow() {
  const k = Math.max(1, Math.floor(Math.min(innerWidth / CONFIG.WIDTH, innerHeight / CONFIG.HEIGHT)));
  canvas.style.width = `${CONFIG.WIDTH * k}px`;
  canvas.style.height = `${CONFIG.HEIGHT * k}px`;
}
addEventListener('resize', fitToWindow);
fitToWindow();

// 키 입력
const KEYMAP = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', KeyZ: 'attack' };
const held = {};
const tapped = {}; // 프레임 사이에 눌렀다 뗀 짧은 입력도 다음 프레임에 한 번 반영한다
const debug = { hitboxes: false, feel: 'basic' };
addEventListener('keydown', (ev) => {
  if (KEYMAP[ev.code]) {
    held[KEYMAP[ev.code]] = true;
    tapped[KEYMAP[ev.code]] = true;
    ev.preventDefault();
  }
  if (ev.repeat) return;
  if (ev.code === 'KeyF') debug.feel = debug.feel === 'basic' ? 'strong' : 'basic';
  if (ev.code === 'KeyH') debug.hitboxes = !debug.hitboxes;
  if (ev.code === 'KeyS') startReplay();
});
addEventListener('keyup', (ev) => {
  if (KEYMAP[ev.code]) held[KEYMAP[ev.code]] = false;
});

// 매 프레임 입력을 기록해 둔다. S키 재생은 같은 시드로 처음부터 이 기록을 다시 돌려서 만든다.
const inputLog = [];
let world = createWorld(scene, seed);
function liveStep(input) {
  inputLog[world.frame] = input;
  stepWorld(world, input);
}
for (let i = 0; i < startFrame; i++) liveStep(scriptInput(scene, world.frame));

let replay = null;
function startReplay() {
  const hit = world.events.filter((e) => e.type === 'hit').at(-1);
  if (!hit) return;
  const rw = createWorld(scene, seed);
  const from = Math.max(0, hit.frame - CONFIG.REPLAY_BEFORE);
  while (rw.frame < from) stepWorld(rw, inputLog[rw.frame]);
  replay = { world: rw, end: Math.min(world.frame, hit.frame + CONFIG.REPLAY_AFTER) };
}

function drawHud(w) {
  const lines = [`FEEL ${debug.feel.toUpperCase()} [F]  HITBOX ${debug.hitboxes ? 'ON' : 'OFF'} [H]  SLOW REPLAY [S]`];
  if (replay) lines.push(`REPLAY x${CONFIG.REPLAY_SPEED}  F${w.frame}`);
  ctx.font = CONFIG.HUD_FONT;
  lines.forEach((t, i) => {
    const y = CONFIG.HUD_Y + CONFIG.HUD_LINE * i;
    ctx.fillStyle = CONFIG.HUD_SHADOW;
    ctx.fillText(t, CONFIG.HUD_X + 1, y + 1);
    ctx.fillStyle = CONFIG.HUD_COLOR;
    ctx.fillText(t, CONFIG.HUD_X, y);
  });
}

function draw(w) {
  renderFrame(ctx, w, debug);
  if (!paused) drawHud(w);
}
draw(world);

let acc = 0;
let last = performance.now();
function tick(now) {
  const dt = Math.min((now - last) / 1000, CONFIG.STEP * CONFIG.MAX_STEPS_PER_TICK);
  last = now;
  if (paused) {
    acc = 0;
  } else if (replay) {
    acc += dt * CONFIG.REPLAY_SPEED;
    while (acc >= CONFIG.STEP && replay) {
      stepWorld(replay.world, inputLog[replay.world.frame]);
      acc -= CONFIG.STEP;
      if (replay.world.frame >= replay.end) {
        draw(replay.world);
        replay = null;
        acc = 0;
      }
    }
    if (replay) draw(replay.world);
  } else {
    acc += dt;
    while (acc >= CONFIG.STEP) {
      const input = { ...scriptInput(scene, world.frame), feel: debug.feel };
      for (const k of Object.keys(held)) if (held[k] || tapped[k]) input[k] = true;
      for (const k of Object.keys(tapped)) delete tapped[k];
      liveStep(input);
      acc -= CONFIG.STEP;
    }
    draw(world);
  }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

installSnapApi({ scene, frameInfo, worldPalette, createWorld, stepWorld, scriptInput, renderFrame });
