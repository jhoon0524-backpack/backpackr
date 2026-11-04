// B4 시험판 만들기 (2026-11-04): node tools/ai-pilot/b4_build.js <출력 폴더>
//  본 게임 파일을 복사하고 윤무겸만 B4 시트로. 오너 결정 (가): 시험판에서만 B4 에 없는 칸을 B4 칸으로 대신 채워 공격·걷기 때 그림이 코드 그림으로 바뀌지 않게
//  — 2타·3타 찌르기·점프 공격·내려찍기 → B4 1타 (3타 준비·회수는 원래부터 준비·서기 칸으로 대신함). 걷기 4칸·점프·맞음은 B4 전용 칸(2026-11-04 추가).
//  쓰러짐·잡기(맨손) 그림은 코드 그림 그대로. 전투 로직·판정은 그대로.
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..'), OUT = process.argv[2];
fs.rmSync(OUT, { recursive: true, force: true });
for (const f of ['index.html', 'art.js', 'data', 'assets/joseon']) fs.cpSync(path.join(ROOT, f), path.join(OUT, f), { recursive: true });
fs.mkdirSync(path.join(OUT, 'assets', 'sprites'), { recursive: true });
fs.copyFileSync(path.join(ROOT, 'assets/sprites/dokkaebi.png'), path.join(OUT, 'assets/sprites/dokkaebi.png'));
fs.copyFileSync(path.join(ROOT, 'assets/sprites/trial/ai/mugyeom-ai-b4.png'), path.join(OUT, 'assets/sprites/mugyeom-b4.png'));
const I = [0, 0], W = [1, 0], P = [2, 0];
const frames = { idle0: I, idle1: I, windup: W, punch: P, walk0: [3, 0], walk1: [4, 0], walk2: [5, 0], walk3: [6, 0], jump: [7, 0], hurt: [8, 0], punch2: P, kick: P, airKick: [9, 0], stomp: P };   // 점프 공격 전용 칸 9 (2026-11-04)   // 2026-11-04 걷기·점프·맞음 칸 추가 (칸 3~8)
const spec = { src: 'assets/sprites/mugyeom-b4.png', frameW: 64, frameH: 64, footX: 32, footY: 60.5, scale: 2, height: 110, frames };
const sp = fs.readFileSync(path.join(ROOT, 'data', 'sprites.js'), 'utf8');
fs.writeFileSync(path.join(OUT, 'data', 'sprites.js'), sp.replace(/"mugyeom": \{[\s\S]*?\} \},\n/, `"mugyeom": ${JSON.stringify(spec)},\n`));
const html = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8');
// 2026-11-04 오너 "걷는 발이 너무 잘다": 시험판에서만 주인공 걷기 칸을 30px 이동마다 (본 게임 12px). 적 걷기·이동 속도·판정 그대로
const WALK_OLD = "if (f.moving) return 'walk' + (Math.floor(f.walk / 12) % 4);";
if (!html.includes(WALK_OLD)) throw new Error('걷기 줄을 못 찾음 — index.html 이 바뀜');
fs.writeFileSync(path.join(OUT, 'index.html'), html.replace(/<title>[^<]*<\/title>/, '<title>조선 퇴마전 — B4 몸 쓰는 공격 시험판</title>')
  .replace(WALK_OLD, "if (f.moving) return 'walk' + (Math.floor(f.walk / (isPlayer ? 30 : 12)) % 4);"));
console.log('ok', Object.keys(frames).join(' '));
