// B4 시험판 만들기 (2026-11-04): node tools/ai-pilot/b4_build.js <출력 폴더>
//  본 게임 파일을 복사하고 윤무겸만 B4 시트로. 오너 결정 (가): 시험판에서만 B4 에 없는 칸을 B4 칸으로 대신 채워 공격·걷기 때 그림이 코드 그림으로 바뀌지 않게
//  — 2타·3타 찌르기·점프 공격·내려찍기 → B4 1타 (3타 준비·회수는 원래부터 준비·서기 칸으로 대신함). 걷기 6칸·점프·맞음·점프 공격은 B4 전용 칸(2026-11-04 추가).
//  쓰러짐·잡기(맨손) 그림은 코드 그림 그대로. 전투 로직·판정은 그대로.
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..'), OUT = process.argv[2];
fs.rmSync(OUT, { recursive: true, force: true });
for (const f of ['index.html', 'art.js', 'data', 'assets/joseon']) fs.cpSync(path.join(ROOT, f), path.join(OUT, f), { recursive: true });
fs.mkdirSync(path.join(OUT, 'assets', 'sprites'), { recursive: true });
fs.copyFileSync(path.join(ROOT, 'assets/sprites/dokkaebi.png'), path.join(OUT, 'assets/sprites/dokkaebi.png'));
const B5 = process.argv[3] === 'b5';   // node tools/ai-pilot/b4_build.js <폴더> b5 → B5 시험판 (2026-11-05): 오너 AI 움직임 GIF 칸(b5.py) + 없는 칸은 B4
fs.copyFileSync(path.join(ROOT, B5 ? 'assets/sprites/trial/ai/mugyeom-ai-b5-test.png' : 'assets/sprites/trial/ai/mugyeom-ai-b4.png'), path.join(OUT, 'assets/sprites/mugyeom-b4.png'));
const I = [0, 0], W = [1, 0], P = [2, 0];
const frames = { idle0: I, idle1: I, windup: W, punch: P, walk0: [3, 0], walk1: [4, 0], walk2: [5, 0], walk3: [6, 0], walk4: [10, 0], walk5: [11, 0], jump: [7, 0], hurt: [8, 0], punch2: P, kick: P, airKick: [9, 0], stomp: P };
// B5: 칸 12~22 = GIF 0·1·2·3·4·5·7·11·12·14·13번. 걷기 4칸(GIF 2·3·4·3), 2타·점프·맞음·점프 공격은 B4 칸
if (B5) Object.assign(frames, { idle0: [12, 0], idle1: [13, 0], walk0: [14, 0], walk1: [15, 0], walk2: [16, 0], walk3: [15, 0], windup: [17, 0], punch: [18, 0],
  kickPrep: [19, 0], kick: [20, 0], kickRecover: [21, 0], stomp: [18, 0] }), delete frames.walk4, delete frames.walk5;   // 점프 공격 전용 칸 9 (2026-11-04)   // 2026-11-04 걷기 0~3 칸 3~6·점프 7·맞음 8 + 점프 공격 9 + 걷기 4·5 칸 10·11
const spec = { src: 'assets/sprites/mugyeom-b4.png', frameW: 64, frameH: 64, footX: 32, footY: 60.5, scale: 2, height: 110, frames };
const sp = fs.readFileSync(path.join(ROOT, 'data', 'sprites.js'), 'utf8');
fs.writeFileSync(path.join(OUT, 'data', 'sprites.js'), sp.replace(/"mugyeom": \{[\s\S]*?\} \},\n/, `"mugyeom": ${JSON.stringify(spec)},\n`));
const html = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8');
// 2026-11-04 오너 "걷는 발이 너무 잘다"·"2번도": 시험판에서만 주인공 걷기를 6칸, 16px 이동마다 (한 바퀴 96px = 두 걸음, 걸음 약 48px = 그린 보폭) (본 게임 4칸·12px). 적 걷기·이동 속도·판정 그대로
const WALK_OLD = "if (f.moving) return 'walk' + (Math.floor(f.walk / 12) % 4);";
if (!html.includes(WALK_OLD)) throw new Error('걷기 줄을 못 찾음 — index.html 이 바뀜');
// 2026-11-04 오너 "세로에서도 테스트할수있게": 시험판에서만 휴대폰 세로 화면을 막지 않고, 게임 화면 아래 빈 곳을 조작 영역으로 (본 게임은 "가로로 돌리세요" 안내 그대로)
const ROT_OLD = 'const rotateBlocked = () => phonePortrait.matches;';
if (!html.includes(ROT_OLD)) throw new Error('세로 막기 줄을 못 찾음 — index.html 이 바뀜');
const PORTRAIT_CSS = `<style>/* 시험판: 휴대폰 세로 (본 게임이 "가로로 돌리세요" 로 막던 범위와 같음 — 폭 600 이하 터치 기기) */
  @media (orientation: portrait) and (hover: none) and (pointer: coarse) and (max-width: 600px) {
    #rotate { display: none !important; }
    body.has-touch { justify-content: flex-start; }
    body.has-touch #frame { padding-bottom: min(62vw, 46vh); }
    body.has-touch #stick { width: 40%; }
    body.has-touch .btn { width: 80px; height: 80px; font-size: 17px; }
    body.has-touch #btnAttack { right: 5%; bottom: 6%; }
    body.has-touch #btnJump { right: 30%; bottom: 33%; }
    body.has-touch #btnVibe, body.has-touch #btnSound, body.has-touch #btnFull { top: 8px; }   /* #frame 높이 % 가 아니라 캔버스 위 고정 (2026-11-04 director) */
  }</style>`;
const PORTRAIT_JS = `<script>/* 시험판: 세로에서 아래 조작 영역의 빈 곳을 탭해도 시작 */
  document.getElementById('frame').addEventListener('pointerdown', () => tapToStart());</script>`;
fs.writeFileSync(path.join(OUT, 'index.html'), html.replace(/<title>[^<]*<\/title>/, (B5 ? '<title>조선 퇴마전 — B5 AI 움직임 시험판</title>' : '<title>조선 퇴마전 — B4 몸 쓰는 공격 시험판</title>'))
  .replace('</head>', PORTRAIT_CSS + '\n</head>')
  .replace(ROT_OLD, 'const rotateBlocked = () => false;   // 시험판: 세로도 플레이')
  .replace('</body>', PORTRAIT_JS + '\n</body>')
  .replace(WALK_OLD, B5 ? "if (f.moving) return 'walk' + (isPlayer ? Math.floor(f.walk / 20) % 4 : Math.floor(f.walk / 12) % 4);" : "if (f.moving) return 'walk' + (isPlayer ? Math.floor(f.walk / 16) % 6 : Math.floor(f.walk / 12) % 4);"));
console.log('ok', Object.keys(frames).join(' '));
