// 「조선 퇴마전」 2D 파일럿 — 5장 「사라진 장부」 스테이지 데이터.
// 설계 기준: DESIGN-BRIEF (6장 공간 구조 · 6-1 시작 수치 · 7장 조사 · 부록 A 엔딩).
// 규칙은 core.js 에 있고, 여기에는 도형·좌표·대사만 둔다. DOM 을 쓰지 않는다 (Node 에서 시험).
// 단위: 1u = 360폭 화면의 CSS 1px. 좌표 (x, y), 위가 y=0.
(function (root) {
  'use strict';

  // ── 도시 한 장 (360u × 2160u) ─────────────────────────────
  // 걸을 수 있는 땅 = 직사각형들의 합집합. 서로 겹치게 두어 교차점이 끊기지 않게 한다.
  // kind: gate(성문 72u) · yard(마당) · road(큰길 120u) · alley(골목 30u) · dead(막다른 갈래) · market(시장)
  const WALK = [
    { id: 'gateN', kind: 'gate', x0: 144, y0: -90, x1: 216, y1: 110 },
    { id: 'yardN', kind: 'yard', x0: 0, y0: 48, x1: 360, y1: 120 },
    { id: 'alleyW', kind: 'alley', x0: 0, y0: 48, x1: 30, y1: 2112 },
    { id: 'road', kind: 'road', x0: 120, y0: 48, x1: 240, y1: 2112 },
    { id: 'alleyE1', kind: 'alley', x0: 330, y0: 48, x1: 360, y1: 930 },
    { id: 'crossA', kind: 'alley', x0: 0, y0: 465, x1: 360, y1: 495 },
    { id: 'dead3', kind: 'dead', x0: 60, y0: 300, x1: 90, y1: 495 },
    { id: 'central', kind: 'alley', x0: 0, y0: 1065, x1: 150, y1: 1095 },
    { id: 'yard1', kind: 'dead', x0: 48, y0: 1060, x1: 112, y1: 1140 },
    // 갈래 ① 마당과 중앙 가로골목이 만나는 모서리를 둥글게 (대각선으로 밀어도 걸리지 않게 — 구현 검수 E-1)
    { id: 'yard1corner', kind: 'dead', x0: 80, y0: 1060, x1: 150, y1: 1095 },
    { id: 'dead1', kind: 'dead', x0: 55, y0: 1100, x1: 85, y1: 1200 },
    { id: 'market', kind: 'market', x0: 240, y0: 900, x1: 360, y1: 1200 },
    { id: 'marketMouth', kind: 'market', x0: 200, y0: 900, x1: 270, y1: 960 },
    { id: 'alleyE2', kind: 'alley', x0: 330, y0: 1170, x1: 360, y1: 2112 },
    { id: 'crossC', kind: 'alley', x0: 0, y0: 1665, x1: 360, y1: 1695 },
    { id: 'dead2', kind: 'dead', x0: 250, y0: 1455, x1: 360, y1: 1485 },
    { id: 'yardS', kind: 'yard', x0: 0, y0: 2040, x1: 360, y1: 2112 },
    { id: 'gateS', kind: 'gate', x0: 144, y0: 2050, x1: 216, y1: 2250 },
  ];

  // 걸을 수 있는 땅 안의 막힌 것: 시장 서쪽 담(큰길과는 광장 쪽 60u 어귀로만 통함) · 좌판
  const BLOCKS = [
    { id: 'marketWall', kind: 'wall', x0: 236, y0: 960, x1: 250, y1: 1200 },
    { id: 'stallA', kind: 'stall', x0: 252, y0: 1040, x1: 282, y1: 1072 },
    { id: 'stallB', kind: 'stall', x0: 262, y0: 1120, x1: 300, y1: 1165 },
  ];

  const MARKET = { x0: 240, y0: 900, x1: 360, y1: 1200, slow: 0.7 };

  // ── 길 그래프 (운반자·명령 이동이 따라가는 골목 가운데 선) ─────────
  const NODES = {
    NX: [180, -70], NG: [180, 30], NGm: [180, 50],
    NY: [180, 120], NYW: [15, 120], NYE: [345, 120],
    W1: [15, 300], WA: [15, 480], WC: [15, 1080], WCC: [15, 1680], W5: [15, 1860], SYW: [15, 2040],
    AW: [75, 480], D3: [75, 318], RA: [180, 480], AE: [285, 480], EA: [345, 480], E1: [345, 300],
    PL: [180, 960], MW: [250, 930], MK: [310, 1060], MN: [345, 905], MS: [345, 1195],
    RC: [180, 1080], CW: [116, 1080], YJ: [80, 1090], CWW: [39, 1080], D1: [70, 1184],
    RCC: [180, 1680], CCW: [75, 1680], CCE: [285, 1680], EC: [345, 1680],
    ED2: [345, 1470], D2: [266, 1470], E5: [345, 1860],
    SY: [180, 2040], SYE: [345, 2040], SGm: [180, 2110], SG: [180, 2130], SX: [180, 2230],
  };

  const EDGES = [
    ['NX', 'NG'], ['NG', 'NGm'], ['NGm', 'NY'], ['NGm', 'NYW'], ['NGm', 'NYE'],
    ['NYW', 'W1'], ['W1', 'WA'], ['WA', 'WC'], ['WC', 'WCC'], ['WCC', 'W5'], ['W5', 'SYW'],
    ['WA', 'AW'], ['AW', 'RA'], ['AW', 'D3'], ['RA', 'AE'], ['AE', 'EA'],
    ['NYE', 'E1'], ['E1', 'EA'], ['EA', 'MN'],
    ['NY', 'RA'], ['RA', 'PL'], ['PL', 'RC'], ['RC', 'RCC'], ['RCC', 'SY'],
    ['PL', 'MW'], ['MW', 'MK'], ['MK', 'MN'], ['MK', 'MS'],
    ['RC', 'CW'], ['CW', 'YJ'], ['YJ', 'CWW'], ['CWW', 'WC'], ['YJ', 'D1'],
    ['WCC', 'CCW'], ['CCW', 'RCC'], ['RCC', 'CCE'], ['CCE', 'EC'],
    ['MS', 'ED2'], ['ED2', 'EC'], ['ED2', 'D2'], ['EC', 'E5'], ['E5', 'SYE'],
    ['SYW', 'SGm'], ['SY', 'SGm'], ['SYE', 'SGm'], ['SGm', 'SG'], ['SG', 'SX'],
  ];

  // 성문 선: 이 선을 넘으면 탈출 (9장)
  const EXITS = { N: { node: 'NX', lineY: 0 }, S: { node: 'SX', lineY: 2160 } };

  // 막다른 갈래 ①②③ — 운반자는 궁지일 때만 들어간다 (8-2 규칙 7)
  const DEAD_ENDS = [
    { id: 'd1', name: '①', node: 'D1', rect: 'dead1' },
    { id: 'd2', name: '②', node: 'D2', rect: 'dead2' },
    { id: 'd3', name: '③', node: 'D3', rect: 'dead3' },
  ];

  // ── 명령판 매듭 15개 (10장). row/col 은 명령판 그림에서의 자리 ─────
  // slots: 여러 명이 같은 매듭에 서면 차례로 채우는 자리. 성문 2자리(72u = 36u × 2), 큰길 3자리(120u 에 36u × 3).
  const COMMAND_NODES = [
    { id: 'W1', label: '서쪽골목', row: 0, col: 0, slots: [[15, 300], [15, 272], [15, 328]] },
    { id: 'NG', label: '북문', row: 0, col: 1, slots: [[162, 30], [198, 30], [180, 66]] },
    { id: 'E1', label: '시장뒷골목', row: 0, col: 2, slots: [[345, 300], [345, 272], [345, 328]] },
    { id: 'AW', label: '가로A서', row: 1, col: 0, slots: [[75, 480], [47, 480], [103, 480]] },
    { id: 'RA', label: '큰길북', row: 1, col: 1, slots: [[138, 540], [180, 540], [222, 540]] },
    { id: 'AE', label: '가로A동', row: 1, col: 2, slots: [[285, 480], [257, 480], [313, 480]] },
    { id: 'CW', label: '중앙서', row: 2, col: 0, slots: [[116, 1080], [88, 1080], [60, 1080]] },
    { id: 'PL', label: '광장', row: 2, col: 1, slots: [[138, 960], [180, 960], [222, 960]] },
    { id: 'MW', label: '시장 어귀', row: 2, col: 2, slots: [[250, 930], [266, 912], [266, 948]] },
    { id: 'CCW', label: '가로C서', row: 3, col: 0, slots: [[75, 1680], [47, 1680], [103, 1680]] },
    { id: 'RCC', label: '큰길남', row: 3, col: 1, slots: [[138, 1620], [180, 1620], [222, 1620]] },
    { id: 'CCE', label: '가로C동', row: 3, col: 2, slots: [[285, 1680], [257, 1680], [313, 1680]] },
    { id: 'W5', label: '민가골목', row: 4, col: 0, slots: [[15, 1860], [15, 1832], [15, 1888]] },
    { id: 'SG', label: '남문', row: 4, col: 1, slots: [[162, 2130], [198, 2130], [180, 2094]] },
    { id: 'E5', label: '창고골목', row: 4, col: 2, slots: [[345, 1860], [345, 1832], [345, 1888]] },
  ];
  // 뒷골목 조사 때만 쓰는 갈래 매듭 (7-2): 관아 뒤 막다른 갈래 ③
  const INVESTIGATION_NODES = ['W1', 'AW', 'RA', 'AE'];
  const EXTRA_INVESTIGATION_NODE = { id: 'D3', label: '관아 뒤 갈래', row: 0.5, col: 0.5, slots: [[75, 330], [75, 358], [75, 386]] };

  // ── 인물 (8-1 속도 · 8-5 체력) ───────────────────────────
  const HEROES = [
    { id: 'yoon', name: '윤무겸', short: '윤', speed: 44, hp: 30, skill: null, token: 'characters/yoon_battle.webp', portrait: 'characters/yoon_portrait.webp' },
    { id: 'hangyeol', name: '한결', short: '한', speed: 42, hp: 24, skill: 'shot', token: 'characters/hangyeol_battle.webp', portrait: 'characters/hangyeol_portrait.webp' },
    { id: 'yeoul', name: '여울', short: '여', speed: 50, hp: 34, skill: null, token: 'characters/yeoul_battle.webp', portrait: 'characters/yeoul_portrait.webp' },
    { id: 'soun', name: '소운', short: '소', speed: 40, hp: 22, skill: 'barrier', token: 'characters/soun_battle.webp', portrait: 'characters/soun_portrait.webp' },
  ];
  const SOLDIERS = [
    { id: 'sol1', name: '관군1', short: '관1', speed: 34, hp: 20, token: 'npcs/soldier_battle.webp' },
    { id: 'sol2', name: '관군2', short: '관2', speed: 34, hp: 20, token: 'npcs/soldier_battle.webp' },
  ];

  // 6-1 추격 시작 배치 (고정). [2차 수정] 파티는 큰길 가운데(중앙 가로골목 어귀), 관군은 광장 북쪽.
  const CHASE_START = {
    yeoul: [156, 1080], yoon: [180, 1080], hangyeol: [204, 1080], soun: [180, 1104],
    sol1: [168, 880], sol2: [192, 880],
    runner: [310, 1060],
    control: 'yoon',
  };

  // 6-1 표 ([2차 수정] 시뮬레이션 측정값). 테스트가 이 값과 실제 시뮬레이션을 비교한다.
  const DESIGN_TABLE = {
    allies: {
      yeoul: { N: 21.1, S: 21.5 }, yoon: { N: 23.9, S: 23.9 }, hangyeol: { N: 25.1, S: 25.6 },
      soun: { N: 26.9, S: 25.7 }, sol1: { N: 25.0, S: 36.8 },
    },
    // 지킴 선 도착 (방해 없음)
    runner: { N1: 29.2, S1: 29.9 },
    // 시작 비용 (성문 밖 점까지 시간 + 벌점). S2 는 시작 순간 파티가 큰길을 막아 ∞
    startCost: { N1: 31.4, S1: 32.1, N2: 42.4, S2: Infinity },
    guardLine: { N: 30, S: 2130 },
  };

  // 등롱 (8-2 규칙 4): 이 빛 안에서만 운반자의 가려는 방향이 보인다. 골목은 어둡다.
  const LANTERNS = [
    [162, 12, 70], [198, 12, 70], [162, 2148, 70], [198, 2148, 70],
    [180, 300, 80], [180, 700, 80], [180, 960, 95], [180, 1300, 80], [180, 1680, 80], [180, 1900, 80],
    [300, 1050, 85], [290, 1160, 70], [260, 930, 60], [90, 1100, 45],
  ];

  // 건물 덩어리 (그림 전용 · 충돌은 WALK 밖이면 전부 막힘). 크기 제각각, 모서리 둥글게 (11장)
  const BUILDINGS = [
    { x0: 36, y0: 128, x1: 114, y1: 292, kind: 'office', name: '관아' },
    { x0: 96, y0: 300, x1: 114, y1: 458, kind: 'wall' },
    { x0: 36, y0: 500, x1: 114, y1: 700, kind: 'office', name: '관아' },
    { x0: 36, y0: 712, x1: 114, y1: 1056, kind: 'town' },
    { x0: 246, y0: 128, x1: 324, y1: 300, kind: 'town' },
    { x0: 246, y0: 310, x1: 324, y1: 458, kind: 'town' },
    { x0: 246, y0: 502, x1: 324, y1: 640, kind: 'gaeksa', name: '객사' },
    { x0: 246, y0: 650, x1: 324, y1: 892, kind: 'town' },
    { x0: 36, y0: 1148, x1: 50, y1: 1200, kind: 'wall' },
    { x0: 90, y0: 1148, x1: 114, y1: 1320, kind: 'town' },
    { x0: 36, y0: 1208, x1: 84, y1: 1440, kind: 'town', name: '민가' },
    { x0: 36, y0: 1452, x1: 114, y1: 1658, kind: 'town', name: '민가' },
    { x0: 246, y0: 1208, x1: 324, y1: 1448, kind: 'store', name: '창고' },
    { x0: 246, y0: 1492, x1: 324, y1: 1658, kind: 'store', name: '창고' },
    { x0: 36, y0: 1702, x1: 114, y1: 2034, kind: 'town', name: '민가' },
    { x0: 246, y0: 1702, x1: 324, y1: 2034, kind: 'store' },
  ];

  // ── 조사 장면 ───────────────────────────────────────────
  // 도입: 객사 마당 (메뉴 없이 바로 시작, 3장)
  const YARD_SCENE = {
    w: 360, h: 620,
    walk: [{ id: 'court', kind: 'yard', x0: 30, y0: 150, x1: 330, y1: 600 }, { id: 'door', kind: 'yard', x0: 160, y0: 118, x1: 200, y1: 180 }],
    blocks: [],
    door: [180, 150],
    start: { yoon: [180, 560], hangyeol: [150, 590], yeoul: [210, 590], soun: [180, 610] },
  };
  // 객사 방 안 (7-1). 동료는 서 있고 움직이지 않는다.
  const ROOM_SCENE = {
    w: 360, h: 480,
    walk: [{ id: 'floor', kind: 'yard', x0: 40, y0: 70, x1: 320, y1: 440 }, { id: 'back', kind: 'yard', x0: 160, y0: 40, x1: 200, y1: 100 }],
    blocks: [],
    start: { yoon: [180, 410] },
    companions: { hangyeol: [236, 418], yeoul: [292, 236], soun: [176, 250] },
    spots: [
      { id: 'bolt', name: '빗장', pos: [180, 438], note: '빗장 — 안에서 걸려 있다' },
      { id: 'window', name: '창', pos: [318, 196], note: '창 — 닫혀 있다' },
      { id: 'bundle', name: '보따리', pos: [92, 150], note: '보따리 — 물건 그대로. 싸움 흔적·피 없음' },
      { id: 'hook', name: '출입패 걸이', pos: [42, 330], note: '출입패 걸이 — 관청 출입패만 없다' },
    ],
    backDoor: [180, 56],
  };

  // 뒷골목 (7-2): 객사 뒷문 → 가로골목 A → 갈래 → 서쪽골목 → 갈래 ① 관리
  const ALLEY_INVESTIGATION = {
    spawn: [290, 481],
    followers: [[306, 481], [322, 481], [338, 481]],
    traces: [
      { id: 't1', name: '발자국', pos: [236, 480] },
      { id: 't2', name: '관청 문서 조각', pos: [15, 690] },
      { id: 't3', name: '끌고 간 자국', pos: [15, 960] },
    ],
    fork: { pos: [75, 480], dead: [75, 318], trueDir: [15, 560] },
    omen: [120, 452],
    official: [70, 1184],
    officialTalkRadius: 48,
    traceRadius: 60,
    // 관리 앞에 모이는 자리 = 추격 시작 자리 (7-3)
    gather: { yeoul: [60, 1120], yoon: [80, 1096], hangyeol: [100, 1072], soun: [100, 1112] },
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
  };

  const STAGE = {
    W: 360, H: 2160,
    WALK, BLOCKS, MARKET, NODES, EDGES, EXITS, DEAD_ENDS,
    COMMAND_NODES, INVESTIGATION_NODES, EXTRA_INVESTIGATION_NODE,
    HEROES, SOLDIERS, CHASE_START, DESIGN_TABLE, LANTERNS, BUILDINGS,
    YARD_SCENE, ROOM_SCENE, ALLEY_INVESTIGATION,
    LINES, SPEAKERS, OBJECTIVES, TEXT,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = STAGE;
  else root.STAGE_CH5 = STAGE;
})(typeof globalThis !== 'undefined' ? globalThis : this);
