// 웨이브 구성 (6단계, 데이터 파일). 아래 = 뒤는 JSON 과 같은 모양이다.
// lockX: 주인공이 이 지점에 도달하면 카메라가 잠기고 적이 나온다. type: enemies.js 의 적 이름
window.BB_DATA = window.BB_DATA || {};
BB_DATA.waves = [
  { "lockX": 300,  "enemies": [{ "type": "thug" }, { "type": "thug" }] },
  { "lockX": 1500, "enemies": [{ "type": "thug" }, { "type": "thug" }, { "type": "brute" }] },
  { "lockX": 2800, "enemies": [{ "type": "thug" }, { "type": "brute" }, { "type": "brute" }, { "type": "thug" }] }
];
