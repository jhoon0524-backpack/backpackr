// 정식 캐릭터 스프라이트 시트 목록 (데이터 파일). 아래 = 뒤는 JSON 과 같은 모양이다.
// 비어 있으면 art.js 가 코드로 그린 임시 전투 스프라이트를 쓴다. 적는 법·시트 규격은 docs/sprite-spec.md
// 지금 시트 = P1 첫 시범 시안 (2026-10-28, Claude 가 tools/p1-draft 로 그린 시안 — 오너 확인 전). 윤무겸 11칸 + 도깨비 2칸, 나머지 칸은 코드 그림.
// 시안을 빼고 코드 그림으로 되돌리려면 BB_DATA.sprites = {} 로.
window.BB_DATA = window.BB_DATA || {};
BB_DATA.sprites = {
  "mugyeom": { "src": "assets/sprites/mugyeom.png", "frameW": 128, "frameH": 128, "footX": 64, "footY": 121, "scale": 1,
               "face": [55, 17, 24, 24], "height": 110,
               "frames": { "idle0": [0, 0], "idle1": [0, 0], "walk0": [1, 0], "walk1": [2, 0], "walk2": [3, 0], "walk3": [4, 0],
                           "windup": [5, 0], "punch": [6, 0], "punch2": [7, 0], "kickPrep": [8, 0], "kick": [9, 0], "kickRecover": [10, 0] } },
  "dokkaebi": { "src": "assets/sprites/dokkaebi.png", "frameW": 128, "frameH": 128, "footX": 64, "footY": 121, "scale": 1,
                "frames": { "windup": [0, 0], "punch": [1, 0] } }
};
