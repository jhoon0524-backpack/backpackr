# 텀블벅 소개영상

- 결과물: `tumblbug_intro.mp4` (40초, 1920x1080, 30fps, 배경음악 포함)
- 영상: 코드로 직접 그린 모션그래픽 (`make_video.py`)
- 음악: 직접 합성한 오리지널 곡 (`make_music.py`) — 외부 음원 사용 없음
- 폰트: Pretendard (SIL OFL 1.1, 상업적 이용 가능) — `fonts/OFL-LICENSE.txt`
- 이모지: Noto Color Emoji (SIL OFL 1.1)

## 구성
| 시간 | 장면 |
|---|---|
| 0~4초 | 누구나 하나쯤은 마음속에 품은 이야기가 있습니다 |
| 4~8초 | 만들고 싶은 보드게임·그림책·앨범·굿즈 → 그 시작을 함께할 사람들이 있다면? |
| 8~12초 | 텀블벅 — 창작자와 후원자가 함께 만드는 크라우드펀딩 |
| 12~20초 | 창작의 모든 장르가 모이는 곳 (카테고리 8개) |
| 20~28초 | 진행 방식 3단계 + 달성률 게이지(예시 연출) |
| 28~34초 | 혼자라면 어려운 일도, 함께라면 현실이 됩니다 |
| 34~40초 | 엔딩: 텀블벅 / tumblbug.com |

## 다시 만들기
```
pip install pillow numpy scipy imageio-ffmpeg
python3 make_music.py && python3 make_video.py
```
문구·색상은 `make_video.py` 안에서 바로 고칠 수 있습니다.
