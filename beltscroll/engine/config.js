// 코드 쪽 상수를 모아두는 유일한 파일 (CLAUDE.md 2번).
// 캐릭터·이펙트·타격감·스테이지 수치는 여기 두지 않고 data/ JSON에 둔다.
export const CONFIG = {
  WIDTH: 640,
  HEIGHT: 360,
  STEP: 1 / 60,               // 고정 스텝 (초)
  MAX_STEPS_PER_TICK: 5,      // 탭 전환 후 복귀 시 따라잡기 상한
  DEFAULT_SEED: 1,
  DEFAULT_SCENE: 'empty',
  DEPTH_TOLERANCE: 24,        // 공격 판정 깊이(y) 허용치
  SHAKE_MARGIN: 32,           // 흔들림 때 화면 가장자리가 비지 않게 배경을 더 그리는 폭
  RAD_PER_DEG: Math.PI / 180,
  EASE_OUT_POWER: 2,          // 키프레임 보간 이즈아웃 강도
  DEBUG_BODY_COLOR: '#00ff66',   // H키 히트박스: 몸통
  DEBUG_ATTACK_COLOR: '#ff2050', // H키 히트박스: 공격 판정
};

// snap 검수 도구용 (콘택트 시트 글씨 영역)
export const SNAP = {
  LABEL_HEIGHT: 36,
  LABEL_FONT: '11px monospace',
  LABEL_LINE: 14,
  LABEL_PAD: 6,
  LABEL_BG: '#000000',
  LABEL_FG: '#ffffff',
  MAX_SEARCH_FRAMES: 1200,   // 타격 이벤트를 찾을 때 최대로 돌려보는 프레임
};
