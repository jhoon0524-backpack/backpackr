// 「조선 퇴마전」 2D 파일럿 v2 — 5장 「사라진 장부」 스테이지 데이터.
// 설계 기준: 2d/DESIGN-BRIEF.md (v2, [v2-수정1] 포함) — 6장 공간 · 6-1 수치표 · 7장 조사 · 8장 추격 · 부록 A 엔딩.
// 규칙은 core.js, 여기에는 도형·좌표·수치·대사만 둔다. DOM 을 쓰지 않는다 (Node 에서 시험).
// 단위: 1u = 360폭 화면의 CSS 1px (확대 1배). 좌표 (x, y), 위가 y=0. 맵 480u × 1080u.
(function (root) {
  'use strict';

  // ── 도시 한 장 (480u × 1080u) ─────────────────────────────
  // 걸을 수 있는 땅 = 직사각형 합집합. 이어지는 곳은 몸 반지름(16u)의 두 배 이상 겹치게 둔다.
  // 골목 48u (한 몸 32u 지나감, 한 명이 서면 막힘) · 큰길 128u · 성문 쪽문 앞 96u
  const WALK = [
    { id: 'gateN', kind: 'gate', x0: 192, y0: -60, x1: 288, y1: 130 },
    { id: 'yardN', kind: 'yard', x0: 0, y0: 40, x1: 480, y1: 120 },
    { id: 'alleyW', kind: 'alley', x0: 0, y0: 40, x1: 48, y1: 1040 },
    { id: 'alleyE', kind: 'alley', x0: 432, y0: 40, x1: 480, y1: 1040 },
    { id: 'road', kind: 'road', x0: 176, y0: 40, x1: 304, y1: 1040 },
    { id: 'crossA', kind: 'alley', x0: 0, y0: 276, x1: 480, y1: 324 },
    { id: 'dead3', kind: 'dead', x0: 96, y0: 276, x1: 144, y1: 440 },
    { id: 'central', kind: 'alley', x0: 0, y0: 516, x1: 304, y1: 564 },
    { id: 'dead1', kind: 'dead', x0: 96, y0: 516, x1: 144, y1: 704 },
    { id: 'market', kind: 'market', x0: 270, y0: 440, x1: 480, y1: 640 },
    { id: 'crossC', kind: 'alley', x0: 0, y0: 776, x1: 480, y1: 824 },
    { id: 'dead2', kind: 'dead', x0: 336, y0: 876, x1: 480, y1: 924 },
    { id: 'yardS', kind: 'yard', x0: 0, y0: 960, x1: 480, y1: 1040 },
    { id: 'gateS', kind: 'gate', x0: 192, y0: 950, x1: 288, y1: 1140 },
  ];

  // 좌판 (통과 불가) — 시장 출발 첫 몇 걸음이 꺾인다
  const BLOCKS = [
    { id: 'stallA', kind: 'stall', x0: 312, y0: 486, x1: 356, y1: 512 },
    { id: 'stallB', kind: 'stall', x0: 396, y0: 470, x1: 426, y1: 500 },
    { id: 'stallC', kind: 'stall', x0: 330, y0: 588, x1: 372, y1: 614 },
  ];
  // 시장은 특별히 느리지 않다 (v2 표에 시장 감속 없음)
  const MARKET = null;

  // ── 길 그래프 (운반자·관군·동료 이동) ───────────────────────
  const NODES = {
    WN: [240, 40], NY: [240, 100], NYW: [24, 100], NYE: [456, 100],
    RA: [240, 300], AW: [24, 300], AE: [456, 300], D3J: [120, 300], D3: [120, 420],
    RC: [240, 540], MNW: [288, 458], CW: [24, 540], C1: [120, 540], D1: [120, 680], MK: [380, 540], ME: [456, 540],
    RCC: [240, 800], CCW: [24, 800], CCE: [456, 800], D2J: [456, 900], D2: [360, 900],
    SY: [240, 1000], SYW: [24, 1000], SYE: [456, 1000], WS: [240, 1040],
  };
  const EDGES = [
    ['WN', 'NY'], ['NY', 'NYW'], ['NY', 'NYE'], ['NY', 'RA'], ['NYW', 'AW'], ['NYE', 'AE'],
    ['AW', 'D3J'], ['D3J', 'RA'], ['D3J', 'D3'], ['RA', 'AE'], ['RA', 'RC'], ['AW', 'CW'], ['AE', 'ME'],
    ['CW', 'C1'], ['C1', 'RC'], ['C1', 'D1'], ['RC', 'MK'], ['MK', 'MNW'], ['MNW', 'RA'], ['MNW', 'RC'], ['MK', 'ME'], ['RC', 'RCC'],
    ['CW', 'CCW'], ['ME', 'CCE'], ['CCW', 'RCC'], ['RCC', 'CCE'], ['CCE', 'D2J'], ['D2J', 'D2'],
    ['D2J', 'SYE'], ['RCC', 'SY'], ['CCW', 'SYW'], ['SYW', 'SY'], ['SYE', 'SY'], ['SY', 'WS'],
  ];
  const DEAD_ENDS = [
    { id: 'd1', name: '①', node: 'D1' }, { id: 'd2', name: '②', node: 'D2' }, { id: 'd3', name: '③', node: 'D3' },
  ];

  // ── 성문 · 빗장 (6-1 성문 쪽 시간) ─────────────────────────
  // 운반자는 쪽문 빗장 자리(latch)에 붙어 성문 쪽을 보고(등은 마당 쪽) 빗장을 푼다.
  // 관군 지킴 자리 2곳 = 쪽문 앞 96u 를 다 막는다.
  const GATES = {
    N: { name: '북문', latch: [240, 40], face: { x: 0, y: -1 }, posts: [[216, 86], [264, 86]], front: [240, 110], node: 'WN' },
    S: { name: '남문', latch: [240, 1040], face: { x: 0, y: 1 }, posts: [[216, 994], [264, 994]], front: [240, 970], node: 'WS' },
  };

  // ── 인물 (8-1, 체력은 specs/battle.md 값) ─────────────────
  // atk.waits: 한 타 뒤 다음 타까지 기다리는 시간 (마지막 값 = 콤보 끝 쉼 포함)
  // atk.subdue: 운반자 제압치 (근접만. 콤보 마지막 타 3). atk.ranged = true 면 제압치 0
  const HEROES = [
    { id: 'yoon', name: '윤무겸', short: '윤', speed: 160, hp: 30, token: 'characters/yoon_battle.webp', portrait: 'characters/yoon_portrait.webp',
      atk: { kind: 'melee', reach: 50, arc: 1.1, dmg: [4, 4, 6], subdue: [2, 2, 3], waits: [0.3, 0.3, 0.4] },
      skill: { id: 'byeoksa', name: '벽사검', dash: 100, dmg: 10, subdue: 4 } },
    { id: 'hangyeol', name: '한결', short: '한', speed: 150, hp: 24, token: 'characters/hangyeol_battle.webp', portrait: 'characters/hangyeol_portrait.webp',
      atk: { kind: 'arrow', range: 220, dmg: [3], subdue: [0], waits: [0.5], ranged: true },
      skill: { id: 'gyeonje', name: '견제사격', range: 300, dmg: 8, slow: 0.4, slowT: 2.5, subdue: 0, ranged: true } },
    { id: 'yeoul', name: '여울', short: '여', speed: 190, hp: 34, token: 'characters/yeoul_battle.webp', portrait: 'characters/yeoul_portrait.webp',
      atk: { kind: 'melee', reach: 40, arc: 1.1, dmg: [3, 3], subdue: [2, 3], waits: [0.25, 0.55] },
      skill: { id: 'chukji', name: '축지격', dist: 140, dmg: 6, reach: 44, subdue: 4 } },
    { id: 'soun', name: '소운', short: '소', speed: 145, hp: 22, token: 'characters/soun_battle.webp', portrait: 'characters/soun_portrait.webp',
      atk: { kind: 'charm', range: 160, speed: 260, dmg: [4], subdue: [0], waits: [0.7], ranged: true },
      skill: { id: 'hwayeom', name: '화염부', ahead: 45, radius: 45, dmg: 12, subdue: 4 } },
  ];
  const SOLDIERS = [
    { id: 'sol1', name: '관군1', short: '관1', speed: 120, hp: 20, token: 'npcs/soldier_battle.webp' },
    { id: 'sol2', name: '관군2', short: '관2', speed: 120, hp: 20, token: 'npcs/soldier_battle.webp' },
  ];

  // 추격 시작 자리 (항상 같다, 7-3). 파티는 갈래 ① 입구, 관군은 객사 앞.
  const CHASE_START = {
    yoon: [120, 590], yeoul: [120, 632], hangyeol: [88, 540], soun: [152, 540],
    sol1: [196, 366], sol2: [196, 402], // 브리프 (220,380)(260,380) 은 큰길 가운데라 운반자가 두 몸 사이에 끼어 멈춘다 → 큰길 서쪽 가에 앞뒤로 (DESIGN-ISSUES v2)
    runner: [380, 540],
    control: 'yoon',
  };

  // 6-1 표 (설계값). 테스트가 비교한다.
  const DESIGN_TABLE = {
    runnerToGate: 4.9,       // 출발 준비 1.0 포함
    nothing: 11.9,           // 아무것도 안 함 → 탈출
    soldiersNorth: 16.9,     // 관군 2 → 북문(0.5초에 탭)만 → 탈출
    soldierToN: 2.6, soldierToS: 5.3,
    yoonToGate: 3.9, yeoulToGate: 3.3, hangyeolToGate: 4.1, sounToGate: 4.3,
  };

  // 등롱 (빛웅덩이). 성문 앞 마당이 가장 밝다 (전투 무대).
  const LANTERNS = [
    [200, 60, 110], [280, 60, 110], [200, 1020, 110], [280, 1020, 110],
    [240, 300, 90], [240, 540, 90], [240, 800, 90], [380, 540, 100], [120, 590, 60], [24, 440, 50], [456, 300, 50],
  ];

  // 건물 덩어리 (그림 전용 · 충돌은 WALK 밖이면 전부 막힘)
  const BUILDINGS = [
    { x0: 52, y0: 124, x1: 172, y1: 272, kind: 'office', name: '관아' },
    { x0: 308, y0: 124, x1: 428, y1: 272, kind: 'gaeksa', name: '객사' },
    { x0: 52, y0: 328, x1: 92, y1: 512, kind: 'town' },
    { x0: 148, y0: 328, x1: 172, y1: 512, kind: 'wall' },
    { x0: 96, y0: 444, x1: 144, y1: 512, kind: 'town' },
    { x0: 308, y0: 328, x1: 428, y1: 436, kind: 'town', name: '민가' },
    { x0: 52, y0: 568, x1: 92, y1: 772, kind: 'town', name: '민가' },
    { x0: 148, y0: 568, x1: 172, y1: 772, kind: 'wall' },
    { x0: 96, y0: 708, x1: 144, y1: 772, kind: 'town' },
    { x0: 308, y0: 644, x1: 428, y1: 772, kind: 'store', name: '창고' },
    { x0: 52, y0: 828, x1: 172, y1: 956, kind: 'town', name: '민가' },
    { x0: 308, y0: 828, x1: 428, y1: 872, kind: 'store' },
    { x0: 308, y0: 928, x1: 428, y1: 956, kind: 'store' },
    { x0: 308, y0: 876, x1: 332, y1: 924, kind: 'wall' },
  ];

  // ── 조사 (7장) ────────────────────────────────────────────
  // 객사 방 (360 × 420, 스크롤 없음). 방 안에서 바로 시작.
  const ROOM_SCENE = {
    w: 360, h: 420,
    walk: [{ id: 'floor', kind: 'yard', x0: 16, y0: 40, x1: 344, y1: 404 }, { id: 'back', kind: 'yard', x0: 150, y0: 0, x1: 210, y1: 80 }],
    blocks: [],
    start: { yoon: [180, 290] },
    companions: { hangyeol: [250, 372], yeoul: [320, 250], soun: [44, 300] },
    spots: [
      { id: 'bolt', name: '빗장', pos: [180, 392], note: '빗장 — 안에서 걸려 있다' },
      { id: 'bundle', name: '보따리', pos: [80, 160], note: '보따리 — 물건 그대로. 싸움 흔적·피 없음' },
      { id: 'hook', name: '출입패 걸이', pos: [300, 160], note: '출입패 걸이 — 관청 출입패만 없다' },
    ],
    spotRadius: 48,
    backDoor: [180, 30],
    introLineSec: 1.6,
  };
  // 뒷골목 (추격 맵 그대로). 흔적 3개, 가까이(60u) 가면 뛰는 중에 켜진다.
  const ALLEY_INVESTIGATION = {
    spawn: [340, 300],
    followers: [[380, 300], [416, 300], [452, 300]],
    traces: [
      { id: 't1', name: '발자국', pos: [300, 300] },
      { id: 't2', name: '관청 문서 조각', pos: [140, 300] },
      { id: 't3', name: '끌고 간 자국', pos: [24, 440] },
    ],
    omen: [220, 262],
    official: [120, 680],
    officialTalkRadius: 48,
    traceRadius: 60,
  };

  // ── 대사 (specs/chapter5.md 글자 그대로) ──────────────────
  const LINES = {
    intro: [
      ['hangyeol', '문은 안에서 잠겨 있었다고 합니다.'],
      ['yoon', '창은?'],
      ['hangyeol', '닫혀 있었습니다.'],
      ['yeoul', '그럼 귀신 짓 아니오?'],
      ['soun', '귀신이라면 문을 잠그고 갈 이유가 있겠소?'],
      ['yoon', '방부터 본다.'],
    ],
    gaeksaConclusion: [
      ['hangyeol', '끌려간 사람치곤 준비를 너무 잘했습니다.'],
      ['yoon', '스스로 나갔다는 건가.'],
    ],
    fragment: [['soun', '뭔가를 들고 나갔군.']],
    official: [
      ['official', '나는 사람을 죽이지 않았소.'],
      ['yoon', '무얼 넘겼지?'],
      ['official', '……'],
      ['soun', '봉인과 관계된 것이오?'],
      ['official', '…장부요.'],
      ['hangyeol', '무슨 장부?'],
      ['official', '청령현의 옛 봉인처가 적혀 있었소.'],
    ],
    runnerAppears: [['official', '저 자요!']],
    seal: [
      ['soun', '그건 평범한 장부가 아니오.'],
      ['soun', '봉인에 쓰던 문서요.'],
    ],
    subdued: [
      ['yoon', '누가 장부를 원했지?'],
      ['runner', '……'],
      ['hangyeol', '폐사찰도 네 짓인가?'],
      ['runner', '내가 한 일은 옮기는 것뿐이오.'],
      ['yoon', '누구에게?'],
      ['runner', '이미 늦었소.'],
    ],
    ledger: [
      ['soun', '…한 장이 없소.'],
      ['yoon', '어디지?'],
      ['soun', '나루터.'],
    ],
    report: [
      ['soldier', '나리!'],
      ['yoon', '무슨 일이냐.'],
      ['soldier', '나루터에서 급보입니다.'],
      ['hangyeol', '무슨 일이지?'],
      ['soldier', '강 건너에서 배 한 척이 들어왔는데…'],
      ['pause', ''],
      ['soldier', '사공이 없습니다.'],
      ['yoon', '사람은?'],
      ['soldier', '없습니다.'],
      ['soldier', '그런데 배 밑에서 사람이 두드리는 소리가 난답니다.'],
    ],
  };

  const SPEAKERS = {
    yoon: { name: '윤무겸', img: 'characters/yoon_portrait.webp' },
    hangyeol: { name: '한결', img: 'characters/hangyeol_portrait.webp' },
    yeoul: { name: '여울', img: 'characters/yeoul_portrait.webp' },
    soun: { name: '소운', img: 'characters/soun_portrait.webp' },
    official: { name: '관리', img: 'npcs/official_battle.webp' },
    runner: { name: '장부 운반자', img: 'enemies/ledger_runner.webp' },
    soldier: { name: '관군', img: 'npcs/soldier_battle.webp' },
  };


  const OBJECTIVES = {
    gaeksa: '사라진 관리의 흔적을 찾아라',
    exit: '객사 밖으로 나간 길을 찾아라',
    official: '골목 깊숙이 숨은 관리를 찾아라',
    chase: '장부 운반자를 제압하라',
  };

  const TEXT = {
    notebookBefore: '귀신이 데려갔다 → ?',
    notebookAfter: '스스로 나갔다',
    chapter6: '제6장 — 잠김',
    result: '관리 확보 · 장부 운반자 확보 · 봉인처 장부 일부 회수',
    runnerName: '장부 운반자',
    // UI 안내 문구 (인물 대사 아님, 브리프 10장)
    chaseHint: '빗장에 붙은 운반자를 쳐서 떼어 내라',
    capHint: '달리는 자는 붙잡을 수 없다 — 성문에서 쳐라',
  };

  const STAGE = {
    W: 480, H: 1080,
    WALK, BLOCKS, MARKET, NODES, EDGES, DEAD_ENDS, GATES,
    HEROES, SOLDIERS, CHASE_START, DESIGN_TABLE, LANTERNS, BUILDINGS,
    ROOM_SCENE, ALLEY_INVESTIGATION,
    LINES, SPEAKERS, OBJECTIVES, TEXT,
    EXITS: { N: { node: 'WN' }, S: { node: 'WS' } },
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = STAGE;
  else root.STAGE_CH5 = STAGE;
})(typeof globalThis !== 'undefined' ? globalThis : this);
