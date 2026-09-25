"""시안 A — 키네틱 타이포그래피 (16초, 16:9)
검정 화면에 굵은 글자가 128BPM 비트에 맞춰 박히는 빠르고 힙한 광고 스타일
"""
from PIL import Image, ImageDraw

import synth as S
from common import CORAL, DARK, WHITE, clamp, ease_out, encode, font, prog, storyboard, text

W, H, DUR = 1920, 1080, 16.0
B = 60 / 128  # 한 박자(초)
BLACK = (12, 12, 14)

# (시작 박자, 글자, 글자색, 배경색, 크기)
EVENTS = [
    (0, "만들고", WHITE, BLACK, 230), (1, "싶은 게", WHITE, BLACK, 230), (2, "있다.", WHITE, BLACK, 260),
    (4, "근데,", (150, 150, 155), BLACK, 200), (5, "혼자서?", WHITE, BLACK, 240),
    (6, "아니.", BLACK, CORAL, 260), (7, "함께.", BLACK, CORAL, 300),
]
GENRES = ["보드게임", "TRPG", "웹툰", "만화", "굿즈", "음악", "출판", "공연", "영화", "디자인", "게임", "리빙"]
for k, g in enumerate(GENRES):  # 반 박자마다 장르 속사포
    EVENTS.append((10 + k / 2, g, CORAL if k % 2 else WHITE, BLACK, 220))
EVENTS += [
    (16, "#COUNT", WHITE, BLACK, 0),
    (20, "1,000만 번의", WHITE, BLACK, 200), (22, "응원", CORAL, BLACK, 300),
    (24, "0에서", WHITE, BLACK, 230), (25, "1을", CORAL, BLACK, 260), (26, "만드는 사람들", WHITE, BLACK, 190),
    (28, "텀블벅", WHITE, CORAL, 330),
]


def slam(img, s, size, color, t0, t, y=None):
    """글자가 크게 들어왔다가 제자리에 박히는 효과 + 잔상"""
    p = ease_out(prog(t, t0, 0.18))
    scale = 1 + 0.35 * (1 - p)
    y = H / 2 if y is None else y
    if p < 1:
        off = (1 - p) * 26
        text(img, s, "Black", size, (W / 2 - off, y), CORAL if color != CORAL else WHITE, 0.6 * (1 - p), scale)
    text(img, s, "Black", size, (W / 2, y), color, 1.0, scale)


def render(t):
    beat = t / B
    ev = [e for e in EVENTS if e[0] <= beat][-1]
    b0, s, col, bg, size = ev
    img = Image.new("RGBA", (W, H), bg + (255,))
    d = ImageDraw.Draw(img)
    t0 = b0 * B
    if s == "#COUNT":
        p = ease_out(prog(t, t0, 1.4))
        text(img, "누적 펀딩", "Bold", 70, (W / 2, H / 2 - 190), (150, 150, 155), clamp((t - t0) * 5))
        slam(img, f"{int(5000 * p):,}억 원", 250, WHITE, t0, t)
        text(img, "2026년 6월 29일 기준, 텀블벅 발표", "Medium", 30, (W / 2, H - 70), (110, 110, 115),
             clamp((t - t0 - 0.5) * 3))
    elif s == "텀블벅":
        slam(img, s, size, col, t0, t, H / 2 - 40)
        a = clamp((t - t0 - 0.9) * 3)
        text(img, "tumblbug.com", "ExtraBold", 64, (W / 2, H / 2 + 230), DARK, a)
    else:
        slam(img, s, size, col, t0, t)
    # 비트마다 자라는 밑줄
    q = ease_out(prog(t, t0, 0.3))
    lw = 360 * q
    d.rectangle((W / 2 - lw / 2, H - 150, W / 2 + lw / 2, H - 138), fill=WHITE if bg == CORAL else CORAL)
    return img


def music():
    tr = S.Track(DUR)
    chords = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]  # Am F C G
    roots = [33, 29, 36, 31]
    beats = int(DUR / B) + 1
    for b in range(beats):
        t0 = b * B
        ci = (b // 4) % 4
        if b >= 28:
            continue
        if not (8 <= b < 10):
            tr.add(S.kick(130, 8), t0, 0.95)
        if b >= 10:
            tr.add(S.hat(), t0 + B / 2, 0.25, 0.4)
            if b % 2 == 1:
                tr.add(S.clap(), t0, 0.35)
            for k in range(2):
                tr.add(S.bass(roots[ci], B / 2 - 0.01, 2.5, 3), t0 + k * B / 2, 0.5)
    tr.add(S.riser(2 * B), 8 * B, 0.4)
    tr.add(S.riser(4 * B), 24 * B, 0.3)
    for b0, *_ in EVENTS:  # 글자가 박힐 때마다 코드 스탭
        ci = (int(b0) // 4) % 4
        tr.add(S.saw_stab([n + 12 for n in chords[ci]]), b0 * B, 0.35 if b0 >= 10 else 0.5)
    end = 28 * B  # 엔딩: 큰 킥 + 긴 코드
    tr.add(S.kick(150, 5), end, 1.0)
    tr.add(S.bass(33, 3.0, 2.0, 1.2), end, 0.5)
    tr.add(S.pad([57, 60, 64, 69], DUR - end, 2200), end, 0.7)
    tr.save(f"{OUT_WAV}", fade_out=1.5)


OUT_WAV = "styles/out/a.wav"

if __name__ == "__main__":
    import os
    os.makedirs("styles/out", exist_ok=True)
    music()
    storyboard(render, [(1.1, "만들고 싶은 게 있다."), (2.5, "근데, 혼자서?"), (3.5, "아니. 함께."),
                        (5.3, "장르 속사포 (반 박자마다)"), (9.6, "누적 펀딩 5,000억 원"), (14.2, "텀블벅 엔딩")],
               "시안 A · 키네틱 타이포그래피",
               ["검정 화면에 큰 글자가 128BPM 비트에 맞춰 박히는 빠르고 힙한 광고 스타일",
                "톤: 자신감·에너지 | 음악: 빠른 일렉트로닉 | 추천 용도: 유튜브 프리롤, 행사 오프닝, 브랜드 캠페인"],
               "A_kinetic_storyboard.jpg")
    encode(render, W, H, DUR, OUT_WAV, "A_kinetic.mp4")
