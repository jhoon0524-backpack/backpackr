import { CONFIG, SNAP } from './config.js';

// tools/snap.js가 브라우저 안에서 부르는 검수용 함수들.
// 화면에 떠 있는 게임과 별개로 새 월드를 시드 고정으로 돌려서 찍는다.
export function installSnapApi(api) {
  const { scene, createWorld, stepWorld, scriptInput, renderFrame, frameInfo, worldPalette } = api;

  // 장면을 처음부터 돌려 n번째 타격(hit) 이벤트가 난 프레임을 찾는다.
  function findHit(seed, n) {
    const w = createWorld(scene, seed);
    while (w.frame < SNAP.MAX_SEARCH_FRAMES) {
      stepWorld(w, scriptInput(scene, w.frame));
      const hits = w.events.filter((e) => e.type === 'hit');
      if (hits.length >= n) return hits[n - 1].frame;
    }
    return null;
  }

  const stripLabel = (info) => [
    `F${info.frame}  time x${info.timeScale}`,
    `shake ${info.shakeX},${info.shakeY}  enemyX ${info.enemyX}`,
  ];

  // frames: 오름차순 프레임 번호 목록. 각 프레임을 찍어 가로로 이어붙인다.
  // labels: null(글씨 없음) | 'strip'(수치) | 칸별 문자열 배열
  function capture(seed, frames, labels) {
    const labelFn = labels === 'strip' ? stripLabel : Array.isArray(labels) ? (_, i) => [labels[i]] : null;
    const w = createWorld(scene, seed);
    const cell = document.createElement('canvas');
    cell.width = CONFIG.WIDTH;
    cell.height = CONFIG.HEIGHT;
    const cctx = cell.getContext('2d');
    const hasLabels = !!labelFn;
    const sheet = document.createElement('canvas');
    sheet.width = CONFIG.WIDTH * frames.length;
    sheet.height = CONFIG.HEIGHT + (hasLabels ? SNAP.LABEL_HEIGHT : 0);
    const sctx = sheet.getContext('2d');
    sctx.fillStyle = SNAP.LABEL_BG;
    sctx.fillRect(0, 0, sheet.width, sheet.height);
    const infos = [];
    frames.forEach((f, i) => {
      while (w.frame < f) stepWorld(w, scriptInput(scene, w.frame));
      renderFrame(cctx, w);
      sctx.drawImage(cell, CONFIG.WIDTH * i, 0);
      const info = frameInfo(w);
      infos.push(info);
      if (hasLabels) {
        sctx.fillStyle = SNAP.LABEL_FG;
        sctx.font = SNAP.LABEL_FONT;
        labelFn(info, i).forEach((line, li) => {
          sctx.fillText(line, CONFIG.WIDTH * i + SNAP.LABEL_PAD, CONFIG.HEIGHT + SNAP.LABEL_LINE * (li + 1));
        });
      }
    });
    return { png: sheet.toDataURL('image/png'), infos, events: w.events, palette: worldPalette(w), cellHeight: CONFIG.HEIGHT };
  }

  // 장면 전체를 돌리며 프레임별 수치를 모은다 (타격감 판정용).
  function trace(seed, frames) {
    const w = createWorld(scene, seed);
    const rows = [];
    while (w.frame < frames) {
      stepWorld(w, scriptInput(scene, w.frame));
      rows.push({ ...frameInfo(w), xs: w.entities.map((e) => e.x) });
    }
    return { rows, events: w.events };
  }

  window.__game = { findHit, capture, trace };
  window.__snapReady = true;
}
