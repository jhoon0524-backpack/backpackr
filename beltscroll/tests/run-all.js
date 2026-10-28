// 측정 전부 돌리기: 각 스크립트의 마지막 줄을 보여 주고, 전체 출력은 out/results.txt 에 남긴다
// 바꾸기 전·후 비교: 전 버전으로 한 번(GAME_URL=...), 후 버전으로 한 번 돌려 두 results.txt 를 비교한다
const { OUT } = require('./paths');
const { execFileSync } = require('child_process'); const fs = require('fs'); const path = require('path');
const SCRIPTS = ['rhythm', 'still', 'combo', 'bufwin', 'jumpbuf', 'feel', 'edge', 'wall2', 'wallthrow', 'stage4', 's4f', 'grab', 'grabfix', 'throwstomp',
  'sound', 'sound2', 'sound3', 'sfx', 'sfx2', 'ko', 'vibe', 'vibe2', 'vibe3', 'touch', 'action', 'fix3', 'fix4', 'determ', 'addenemy', 'typo', 'sprites', 'sheets', 'reach', 'fists', 'fists-group', 'dominance', 'dodge', 'test'];
const all = [];
for (const s of SCRIPTS) {
  let text;
  try { text = execFileSync('node', [path.join(__dirname, s + '.js')], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 300000 }); }
  catch (e) { text = (e.stdout || '') + (e.stderr || '') + '\n실행 실패: ' + e.message.split('\n')[0]; }
  all.push(`== ${s}\n${text.trimEnd()}`);
  console.log(s.padEnd(11), text.trimEnd().split('\n').pop().slice(0, 160));
}
fs.writeFileSync(path.join(OUT, 'results.txt'), all.join('\n') + '\n');
console.log('전체 출력:', path.join(OUT, 'results.txt'));
