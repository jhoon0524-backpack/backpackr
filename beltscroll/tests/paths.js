// 측정 스크립트 공용 경로. GAME_URL 을 주면 다른 버전(예: 바꾸기 전 사본)을 잰다
const path = require('path'), fs = require('fs'), { pathToFileURL } = require('url');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(__dirname, 'out');   // 스크린샷·임시 사본 (저장소에 안 올림)
fs.mkdirSync(OUT, { recursive: true });
module.exports = { ROOT, OUT, GAME: process.env.GAME_URL || pathToFileURL(path.join(ROOT, 'index.html')).href };
