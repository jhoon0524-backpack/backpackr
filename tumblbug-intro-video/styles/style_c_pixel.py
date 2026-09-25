"""시안 C — 레트로 픽셀 게임 (16초, 16:9)
8비트 게임 화면처럼 창작자 캐릭터가 달리며 '후원 하트'를 모으고, 게이지를 채워 스테이지를 클리어하는 스타일
480x270으로 그린 뒤 4배로 키워 진짜 픽셀 느낌을 냄
"""
import math
import random

from PIL import Image, ImageDraw, ImageFont

import synth as S
from common import emoji, encode, storyboard

LW, LH, SCALE, DUR = 480, 270, 4, 16.0
BPM = 140
B = 60 / BPM
PX = ImageFont.truetype("fonts/Galmuri11-Bold.ttf", 11)
PX2 = ImageFont.truetype("fonts/Galmuri11-Bold.ttf", 22)
PX4 = ImageFont.truetype("fonts/Galmuri11-Bold.ttf", 44)

NAVY = (22, 18, 44)
SKY = (70, 110, 200)
CORAL = (234, 99, 79)
YELLOW = (255, 210, 80)
MINT = (92, 201, 167)
WHITE = (255, 255, 255)
GROUND = (120, 80, 50)
GRASS = (80, 180, 90)

PAL = {"H": (60, 40, 30), "S": (255, 210, 170), "E": (20, 20, 20), "C": CORAL, "B": (60, 80, 160),
       "K": (30, 30, 30), "R": (240, 70, 90), "W": WHITE, "P": (200, 200, 200), "Y": YELLOW}
BODY = ["...HHHH...", "..HHHHHH..", "..HSSSSH..", "..SSESES..", "..SSSSSS..", "...SSSS...",
        "..CCCCCC..", ".SCCCCCCS.", "..CCCCCC..", "..BBBBBB.."]
LEGS = [["..BB..BB..", "..KK..KK.."], [".BB....BB.", ".KK....KK."]]
HEART = [".RR.RR.", "RRRRRRR", "RRRRRRR", ".RRRRR.", "..RRR..", "...R..."]
FLAG = ["WYYYYY", "WYYYY.", "WYYY..", "WYY...", "W.....", "W.....", "W.....", "W.....", "W.....", "W....."]

random.seed(4)
STARS = [(random.randrange(LW), random.randrange(LH), random.choice([1, 2])) for _ in range(70)]
HEARTS = [(3.1 + i * 0.11, random.randint(184, 198)) for i in range(28)]  # (등장 시각, 높이) — 7.7초 전에 모두 먹음
CHAR_X = 110
SPEED = 230
TOTAL_BACKERS = 128


def sprite(d, rows, x, y, s=2):
    for j, row in enumerate(rows):
        for i, c in enumerate(row):
            if c != ".":
                d.rectangle((x + i * s, y + j * s, x + i * s + s - 1, y + j * s + s - 1), fill=PAL[c])


def ptext(d, xy, s, f=PX, fill=WHITE, anchor="mm", shadow=True):
    if shadow:
        d.text((xy[0] + 1, xy[1] + 1), s, font=f, fill=(0, 0, 0), anchor=anchor)
    d.text(xy, s, font=f, fill=fill, anchor=anchor)


def collected(t):
    return sum(1 for s0, _ in HEARTS if t >= s0 + (LW - CHAR_X) / SPEED)


def stars(d, t, speed=10):
    for x, y, s in STARS:
        xx = int((x - t * speed * s) % LW)
        d.rectangle((xx, y, xx + s - 1, y + s - 1), fill=(200, 200, 255) if s == 2 else (120, 120, 180))


def world(im, d, t):
    d.rectangle((0, 0, LW, LH), fill=SKY)
    for k in range(4):  # 먼 산 (느리게)
        bx = (k * 160 - t * 20) % (LW + 160) - 80
        d.polygon([(bx, 215), (bx + 80, 130), (bx + 160, 215)], fill=(90, 150, 120))
    for k in range(3):  # 구름
        cx = (k * 190 + 40 - t * 12) % (LW + 80) - 40
        d.rectangle((cx, 40 + k * 14, cx + 44, 52 + k * 14), fill=WHITE)
        d.rectangle((cx + 8, 34 + k * 14, cx + 30, 40 + k * 14), fill=WHITE)
    d.rectangle((0, 215, LW, LH), fill=GROUND)
    off = int(t * SPEED) % 16
    for x in range(-16, LW + 16, 16):  # 풀 타일
        d.rectangle((x - off, 215, x - off + 15, 220), fill=GRASS)
        d.rectangle((x - off + 4, 228, x - off + 7, 231), fill=(95, 60, 40))


def hud(d, t):
    n = collected(t)
    backers = round(TOTAL_BACKERS * n / len(HEARTS))
    ptext(d, (10, 14), f"♥ 후원자 {backers}명", anchor="lm", fill=WHITE)
    ptext(d, (300, 14), "펀딩 게이지", anchor="rm")
    d.rectangle((306, 8, 470, 20), fill=(0, 0, 0))
    fillw = int(162 * n / len(HEARTS))
    d.rectangle((307, 9, 307 + fillw, 19), fill=CORAL)
    ptext(d, (388, 30), f"{int(100 * n / len(HEARTS))}%", fill=YELLOW)


def render_low(t):
    im = Image.new("RGB", (LW, LH), NAVY)
    d = ImageDraw.Draw(im)
    if t < 3.0:  # 타이틀 화면
        stars(d, t)
        ptext(d, (LW / 2, 90), "텀블벅", PX4, CORAL)
        ptext(d, (LW / 2, 140), "- CREATOR QUEST -", PX, YELLOW)
        if int(t / 0.35) % 2 == 0:
            ptext(d, (LW / 2, 190), "▶ 프로젝트 시작하기", PX, WHITE)
        ptext(d, (LW / 2, 245), "PRESS START", PX, (150, 150, 200))
    elif t < 8.0:  # 달리며 후원 하트 모으기
        world(im, d, t)
        for s0, hy in HEARTS:
            x = LW - (t - s0) * SPEED
            if s0 <= t and x > CHAR_X + 4:
                bob = int(3 * math.sin((t - s0) * 10))
                sprite(d, HEART, x, hy + bob, 2)
            elif s0 <= t and x > CHAR_X - 60:  # 먹은 직후 +1 표시
                ptext(d, (CHAR_X + 10, hy - 20 - (CHAR_X + 4 - x) / 3), "+1", PX, YELLOW)
        if t > 7.0:  # 결승 깃발이 다가옴
            fx = LW - (t - 7.0) * SPEED * 1.2
            sprite(d, FLAG, max(fx, 250), 175 - 20, 4)
        leg = int(t / 0.12) % 2
        jump = int(abs(math.sin(t / B * math.pi)) * 6)
        sprite(d, BODY + LEGS[leg], CHAR_X - 10, 215 - 24 - jump, 2)
        hud(d, t)
    elif t < 10.5:  # 스테이지 클리어 + 폭죽
        world(im, d, 8.0)
        sprite(d, FLAG, 250, 155, 4)
        sprite(d, BODY + LEGS[0], CHAR_X - 10, 191 - int(abs(math.sin((t - 8) * 8)) * 14), 2)
        hud(d, t)
        lt = t - 8.0
        rnd = random.Random(9)
        for k in range(5):
            cx, cy, st = rnd.randint(60, 420), rnd.randint(50, 120), k * 0.35
            r = (lt - st) * 70
            if 0 < lt - st < 1.1:
                for a in range(12):
                    ang = a * math.pi / 6
                    x, y = cx + r * math.cos(ang), cy + r * math.sin(ang) + (lt - st) ** 2 * 30
                    c = [YELLOW, CORAL, MINT, WHITE][(a + k) % 4]
                    d.rectangle((x, y, x + 2, y + 2), fill=c)
        if int(lt / 0.25) % 2 == 0 or lt > 1.0:
            ptext(d, (LW / 2, 95), "STAGE CLEAR!", PX4, YELLOW)
        ptext(d, (LW / 2, 140), "펀딩 성공!", PX2, WHITE)
    elif t < 13.0:  # 다음 스테이지 선택
        stars(d, t, 4)
        ptext(d, (LW / 2, 30), "SELECT NEXT STAGE", PX2, YELLOW)
        items = [("🎲", "보드게임·TRPG"), ("🎮", "디지털 게임"), ("📖", "웹툰·만화"), ("🧸", "캐릭터·굿즈")]
        sel = int((t - 10.5) / (B * 2)) % 4
        for i, (em, name) in enumerate(items):
            x, y = 40 + (i % 2) * 210, 65 + (i // 2) * 95
            d.rectangle((x, y, x + 190, y + 80), fill=(40, 34, 80), outline=YELLOW if i == sel else (90, 80, 150),
                        width=3 if i == sel else 1)
            icon = emoji(em, 26).resize((26, 26), Image.NEAREST)
            im.paste(icon, (x + 14, y + 27), icon)
            ptext(d, (x + 52, y + 40), name, PX, WHITE, anchor="lm")
            if i == sel:
                ptext(d, (x - 10, y + 40), "▶", PX, YELLOW)
    else:  # 엔딩
        stars(d, t, 6)
        ptext(d, (LW / 2, 80), "텀블벅", PX4, CORAL)
        ptext(d, (LW / 2, 130), "0에서 1을 만드는 사람들", PX2, WHITE)
        ptext(d, (LW / 2, 175), "tumblbug.com", PX, YELLOW)
        if int(t / 0.35) % 2 == 0:
            ptext(d, (LW / 2, 225), "INSERT COIN ▶ 지금 시작하기", PX, WHITE)
    return im


def render(t):
    return render_low(t).resize((LW * SCALE, LH * SCALE), Image.NEAREST)


def music():
    tr = S.Track(DUR)
    chords = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]]  # C Am F G
    roots = [48, 45, 41, 43]
    beats = int(DUR / B) + 1
    for b in range(beats):
        t0 = b * B
        ci = (b // 4) % 4
        ch = chords[ci]
        if t0 < 3.0:  # 타이틀: 느린 아르페지오
            tr.add(S.square(ch[b % 3] + 12, B * 0.9, 0.25, 4), t0, 0.12)
            continue
        if 8.0 <= t0 < 10.5 or t0 >= 13.0:
            continue
        for k in range(2):  # 리드: 8분음표 아르페지오
            n = (ch + [ch[0] + 12])[(b * 2 + k) % 4] + 12
            tr.add(S.square(n, B / 2 * 0.9, 0.25, 3), t0 + k * B / 2, 0.11, -0.2)
        tr.add(S.triangle(roots[ci] + (12 if b % 2 else 0), B * 0.9), t0, 0.35)  # 베이스
        tr.add(S.chip_noise(0.12 if b % 2 else 0.05), t0, 0.12 if b % 2 else 0.07)
        if b % 2 == 0:
            tr.add(S.kick(90, 14), t0, 0.5)
    for s0, _ in HEARTS:  # 하트 먹는 소리
        tc = s0 + (LW - CHAR_X) / SPEED
        if tc < 8.0:
            tr.add(S.square(88, 0.05, 0.5), tc, 0.06)
            tr.add(S.square(93, 0.07, 0.5), tc + 0.05, 0.06)
    for k, n in enumerate([72, 76, 79, 84, 88, 91]):  # 클리어 팡파르
        tr.add(S.square(n, 0.14 if k < 5 else 1.2, 0.5, 0 if k < 5 else 1.2), 8.0 + k * 0.1, 0.12)
    tr.add(S.triangle(48, 1.4), 8.5, 0.35)
    for k, n in enumerate([67, 72, 76, 79, 84]):  # 엔딩 징글
        tr.add(S.square(n, 0.16 if k < 4 else 1.8, 0.25, 0 if k < 4 else 1.0), 13.0 + k * 0.14, 0.13)
    tr.add(S.triangle(36, 2.0), 13.56, 0.4)
    tr.save("styles/samples/c.wav", fade_out=1.0)


if __name__ == "__main__":
    import os
    os.makedirs("styles/samples", exist_ok=True)
    music()
    storyboard(render, [(1.5, "타이틀 화면 (PRESS START)"), (5.5, "달리며 후원 하트 모으기"), (7.6, "게이지 거의 가득"),
                        (9.3, "STAGE CLEAR! 펀딩 성공"), (11.8, "다음 스테이지 = 카테고리"), (14.8, "INSERT COIN 엔딩")],
               "시안 C · 레트로 픽셀 게임",
               ["8비트 게임처럼 창작자 캐릭터가 달리며 '후원 하트'를 모아 펀딩 게이지를 채우는 스타일",
                "톤: 유쾌함·게임 감성 | 음악: 칩튠(8비트) | 추천 용도: 게임·보드게임 창작자 모집, 게임 행사 부스, SNS 광고"],
               "C_pixel_storyboard.jpg")
    encode(render, LW * SCALE, LH * SCALE, DUR, "styles/samples/c.wav", "C_pixel.mp4")
