// 직업(주인공)별 공격 판정 (데이터 파일). 아래 = 뒤는 JSON 과 같은 모양이다.
// art: 그림 이름 (art.js) / reach: 1·2·3타 사거리 px (몸 중심 기준). 공격 타이밍·데미지·타격감은 index.html 의 ATTACKS 가 모든 직업 공통
// hit: "center" = 적 중심이 사거리 안이면 명중 (밤거리 격투가의 주먹, 원래 판정)
//      "body"   = 무기 끝이 적 몸 앞끝(data/enemies.js 의 hurtHalfWidth)에 닿으면 명중 (벽사검객의 칼, 칼끝 = 사거리)
// enemyLungeFrames: 이 직업을 상대로 적이 공격 직전 달려드는 프레임 수. 사거리가 길면 적이 멀리서 예고하므로 더 길게 달려든다
// enemyRush: 달려들기 연출 — 달려드는 동안 달리는 그림(rush)을 쓰고 점점 빨라지게 달려든다 (아니면 예고 자세 그대로, 매 프레임 같은 속도)
// 다른 직업(파귀무인·벽력포수·봉령술사 등)은 나중에 여기에 한 줄씩 더한다 — 아직 만들지 않음 (2026-10-28 오너 결정)
window.BB_DATA = window.BB_DATA || {};
BB_DATA.classes = {
  "brawler": { "name": "밤거리 격투가", "art": "player",  "hit": "center", "reach": [48, 48, 58], "enemyLungeFrames": 4, "enemyRush": false },
  "byeoksa": { "name": "벽사검객",      "art": "mugyeom", "hit": "body",   "reach": [57, 57, 57], "enemyLungeFrames": 9, "enemyRush": true }
};
