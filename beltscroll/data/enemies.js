// 적 종류 (6단계, 데이터 파일). 아래 = 뒤는 JSON 과 같은 모양이다.
// 적 종류를 늘리려면 이 목록에 한 줄을 더하고 waves.js 에 그 이름을 넣는다 (index.html 코드는 안 고친다).
// hp 체력 / speed 걷기 px/프레임 / w·h 몸 크기 px / dmg 주먹 데미지 / score 처치 점수 / windup 공격 예고 프레임
// art: art.js 의 그림 이름 (조선 퇴마전: wongwi 원귀·dokkaebi 도깨비 / 원래 밤거리: thug·brute) / knockdown: 이 적에게 맞으면 주인공이 넘어지는지
// hurtHalfWidth: 칼 판정(직업 hit "body")에 쓰는 몸 앞끝 px — 몸 중심에서 앞쪽으로. 걷는 그림 실루엣 기준, 뻗은 주먹 제외 (2026-10-28 오너 결정 27px). 없으면 w 의 절반
// (w 는 그림자·적끼리 밀기 등에 쓰는 몸 폭이라 그대로 둔다)
window.BB_DATA = window.BB_DATA || {};
BB_DATA.enemies = {
  "thug":  { "hp": 30, "speed": 1.4, "w": 34, "h": 70, "dmg": 8,  "score": 100, "windup": 28, "art": "wongwi",  "knockdown": false, "hurtHalfWidth": 27 },
  "brute": { "hp": 70, "speed": 1.0, "w": 46, "h": 84, "dmg": 15, "score": 300, "windup": 40, "art": "dokkaebi", "knockdown": true, "hurtHalfWidth": 27 }
};
