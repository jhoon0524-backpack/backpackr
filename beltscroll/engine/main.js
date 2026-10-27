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
addEventListener('keydown', (ev) => {
  if (KEYMAP[ev.code]) {
    held[KEYMAP[ev.code]] = true;
    ev.preventDefault();
  }
});
addEventListener('keyup', (ev) => {
  if (KEYMAP[ev.code]) held[KEYMAP[ev.code]] = false;
});

const debug = { hitboxes: false };
let world = createWorld(scene, seed);
for (let i = 0; i < startFrame; i++) stepWorld(world, scriptInput(scene, world.frame));
renderFrame(ctx, world, debug);

let acc = 0;
let last = performance.now();
function tick(now) {
  acc += Math.min((now - last) / 1000, CONFIG.STEP * CONFIG.MAX_STEPS_PER_TICK);
  last = now;
  if (!paused) {
    while (acc >= CONFIG.STEP) {
      stepWorld(world, { ...scriptInput(scene, world.frame), ...held });
      acc -= CONFIG.STEP;
    }
    renderFrame(ctx, world, debug);
  } else {
    acc = 0;
  }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

installSnapApi({ scene, frameInfo, worldPalette, createWorld, stepWorld, scriptInput, renderFrame });
