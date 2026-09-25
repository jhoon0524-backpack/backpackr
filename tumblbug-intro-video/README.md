# 텀블벅 소개영상

- 결과물: `tumblbug_intro.mp4` (46초, 1920x1080, 30fps, 배경음악 포함)
- 영상: 코드로 직접 그린 모션그래픽 (`make_video.py`)
- 음악: 직접 합성한 오리지널 곡 (`make_music.py`) — 외부 음원 사용 없음
- 폰트: Pretendard (SIL OFL 1.1, 상업적 이용 가능) — `fonts/OFL-LICENSE.txt`
- 이모지: Noto Color Emoji (SIL OFL 1.1)

## 구성
| 시간 | 장면 |
|---|---|
| 0~4초 | 누구나 하나쯤은 마음속에 품은 이야기가 있습니다 |
| 4~8초 | 만들고 싶은 보드게임·그림책·앨범·굿즈 → 그 시작을 함께할 사람들이 있다면? |
| 8~12초 | 텀블벅 — 크리에이터를 위한 크라우드펀딩 |
| 12~20초 | 창작의 모든 장르가 모이는 곳 (실제 카테고리 8개) |
| 20~28초 | 진행 방식 3단계 + 달성률 게이지(예시 연출) |
| 28~34초 | 숫자로 보는 텀블벅: 누적 5,000억 원+ / 약 8만 개 프로젝트 / 1,000만 건+ 후원 / 최고 기록 88억 원 |
| 34~40초 | 혼자라면 어려운 일도, 함께라면 현실이 됩니다 |
| 40~46초 | 엔딩: 텀블벅 / tumblbug.com |

## 사실 확인 출처
- 누적 5,000억 원(2026.6.29 기준)·약 8만 개·1,000만 건: [아시아경제](https://www.asiae.co.kr/article/2026081809362512628), [머니투데이](https://www.mt.co.kr/future/2026/08/18/2026081813213450629), [베타뉴스](https://www.betanews.net/article/view/beta202608180006)
- 역대 최고 88억 원(2024.11): [머니투데이](https://news.mt.co.kr/mtview.php?no=2024112710025259938), [뉴스핌](https://www.newspim.com/news/view/20241127000280)
- 목표 금액 달성 시에만 결제: [텀블벅 헬프센터](https://help.tumblbug.com/hc/ko/articles/115006299627)
- 서비스 문구 "크리에이터를 위한 크라우드펀딩": tumblbug.com 페이지 제목

## 다시 만들기
```
pip install pillow numpy scipy imageio-ffmpeg
python3 make_music.py && python3 make_video.py
```
문구·색상은 `make_video.py` 안에서 바로 고칠 수 있습니다.
