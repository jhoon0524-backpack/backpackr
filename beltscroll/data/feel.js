// 타격감 (3단계에서 정함, 6단계에서 데이터 파일로). 아래 = 뒤는 JSON 과 같은 모양이다. 프레임 단위, px
// hitstop: 맞는 순간 공격자·맞은 쪽만 멈추는 프레임 / kick: 카메라가 타격 방향으로 밀리는 px, kickFrames: 복귀까지 프레임
// kbSpeed: 넉백 첫 프레임 속도, kbFriction: 매 프레임 남는 속도 비율 (총 거리 ≈ kbSpeed / (1 - kbFriction)) / flash: 흰 번쩍임 프레임
// normal = 1·2타, 플레이어 피격 (넉백 약 4px) / heavy = 3타, 적을 죽이는 타격 (넉백 약 65px)
window.BB_DATA = window.BB_DATA || {};
BB_DATA.feel = {
  "normal": { "hitstop": 4,  "kick": 2, "kickFrames": 3, "kbSpeed": 2,  "kbFriction": 0.5, "flash": 6 },
  "heavy":  { "hitstop": 10, "kick": 7, "kickFrames": 8, "kbSpeed": 13, "kbFriction": 0.8, "flash": 10 }
};
