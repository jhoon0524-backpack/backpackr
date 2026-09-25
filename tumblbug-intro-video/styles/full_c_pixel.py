"""시안 C 풀 버전 — 레트로 픽셀 게임 'CREATOR QUEST' (48초, 16:9)
텀블벅 펀딩 과정을 게임 스테이지로 풀어냄:
아이디어 획득 → 프로젝트 공개 → 응원 모으기 → 스테이지 클리어 → 선물 전달 → 월드(카테고리) → 하이스코어(실제 수치) → 엔딩
480x270으로 그린 뒤 4배로 키우고, 브라운관 주사선을 살짝 얹음
"""
import math
import random

import numpy as np
from PIL import Image, ImageDraw

import synth as S
from common import emoji, encode, storyboard
from style_c_pixel import (B, BODY, CORAL, FLAG, GRASS, GROUND, HEART, LEGS, LH, LW, MINT, NAVY, PAL, PX, PX2, PX4,
                           SCALE, SKY, WHITE, YELLOW, ptext, stars)

DUR = 48.0
PAL2 = dict(PAL, O=(230, 150, 40), G=MINT, M=(160, 110, 220), U=(90, 150, 240), N=(250, 170, 60))
QBLOCK = ["KKKKKKKK", "KYYYYYYK", "KYYKKYYK", "KYYYYKYK", "KYYYKYYK", "KYYYYYYK", "KYYYKYYK", "KKKKKKKK"]
USED = ["KKKKKKKK", "KOOOOOOK", "KOOOOOOK", "KOOOOOOK", "KOOOOOOK", "KOOOOOOK", "KOOOOOOK", "KKKKKKKK"]
BULB = ["..YYY..", ".YYWYY.", "YYYWYYY", "YYYYYYY", "YYYYYYY", ".YYYYY.", "..PPP..", "..PPP..", "...P..."]
GIFT = ["..Y..Y..", "...YY...", "RRRYYRRR", "RRRYYRRR", "YYYYYYYY", "RRRYYRRR", "RRRYYRRR", "RRRYYRRR"]
SHIRTS = ["G", "M", "U", "N", "R"]
HERO_X = 110
GROUND_Y = 215


def sprite(d, rows, x, y, s=2, swap=None):
    for j, row in enumerate(rows):
        for i, c in enumerate(row):
            if c == ".":
                continue
            c = swap.get(c, c) if swap else c
            d.rectangle((x + i * s, y + j * s, x + i * s + s - 1, y + j * s + s - 1), fill=PAL2[c])


def hero(d, x, t, walking=True, jump=0, swap=None):
    leg = int(t / 0.12) % 2 if walking else 0
    sprite(d, BODY + LEGS[leg], x - 10, GROUND_Y - 24 - jump, 2, swap)


def world(d, scroll):
    d.rectangle((0, 0, LW, LH), fill=SKY)
    for k in range(4):
        bx = (k * 160 - scroll * 0.1) % (LW + 160) - 80
        d.polygon([(bx, GROUND_Y), (bx + 80, 130), (bx + 160, GROUND_Y)], fill=(90, 150, 120))
    for k in range(3):
        cx = (k * 190 + 40 - scroll * 0.05) % (LW + 80) - 40
        d.rectangle((cx, 40 + k * 14, cx + 44, 52 + k * 14), fill=WHITE)
        d.rectangle((cx + 8, 34 + k * 14, cx + 30, 40 + k * 14), fill=WHITE)
    d.rectangle((0, GROUND_Y, LW, LH), fill=GROUND)
    off = int(scroll) % 16
    for x in range(-16, LW + 16, 16):
        d.rectangle((x - off, GROUND_Y, x - off + 15, GROUND_Y + 5), fill=GRASS)
        d.rectangle((x - off + 4, GROUND_Y + 13, x - off + 7, GROUND_Y + 16), fill=(95, 60, 40))


def dialog(d, s, t0, t, y=18):
    """RPG식 대사 상자 (한 글자씩 타이핑)"""
    if t < t0:
        return
    d.rectangle((20, y, LW - 20, y + 40), fill=(0, 0, 0), outline=WHITE, width=2)
    n = int((t - t0) * 16)
    ptext(d, (34, y + 20), s[:n], PX, WHITE, anchor="lm", shadow=False)
    if n >= len(s) and int(t / 0.3) % 2 == 0:
        ptext(d, (LW - 34, y + 30), "▼", PX, YELLOW, shadow=False)


def stage_card(d, t, t0, num, title, sub):
    stars(d, t, 3)
    p = min(1.0, (t - t0) / 0.25)
    ptext(d, (LW / 2, 100), f"STAGE {num}", PX4, YELLOW)
    d.rectangle((LW / 2 - 120 * p, 128, LW / 2 + 120 * p, 130), fill=CORAL)
    ptext(d, (LW / 2, 152), title, PX2, WHITE)
    ptext(d, (LW / 2, 185), sub, PX, (170, 170, 210))


# ---------- STAGE 3: 달리며 하트 모으기 ----------
S3, S3_END = 17.5, 26.0
RUN_SPEED = 230
random.seed(21)
HEARTS = []
_t, _gap = S3 + 0.2, 0.26
while _t < 23.9:  # 점점 빨라지다가 FEVER
    HEARTS.append((_t, random.randint(184, 198)))
    _gap = max(0.07, _gap * 0.95)
    _t += _gap
TRAVEL = (LW - HERO_X) / RUN_SPEED
FEVER = S3 + 4.0
TOTAL_BACKERS = 1024


def got(t):
    return sum(1 for s0, _ in HEARTS if t >= s0 + TRAVEL)


def hud(d, t):
    n = got(t)
    ptext(d, (10, 14), f"♥ 후원자 {round(TOTAL_BACKERS * n / len(HEARTS)):,}명", anchor="lm")
    ptext(d, (300, 14), "펀딩 게이지", anchor="rm")
    d.rectangle((306, 8, 470, 20), fill=(0, 0, 0))
    d.rectangle((307, 9, 307 + int(162 * n / len(HEARTS)), 19), fill=CORAL)
    ptext(d, (388, 30), f"{int(100 * n / len(HEARTS))}%", fill=YELLOW)


def fireworks(d, lt, seed=9, n=6):
    rnd = random.Random(seed)
    for k in range(n):
        cx, cy, st = rnd.randint(50, 430), rnd.randint(45, 125), k * 0.4
        r = (lt - st) * 70
        if 0 < lt - st < 1.1:
            for a in range(12):
                ang = a * math.pi / 6
                x, y = cx + r * math.cos(ang), cy + r * math.sin(ang) + (lt - st) ** 2 * 30
                d.rectangle((x, y, x + 2, y + 2), fill=[YELLOW, CORAL, MINT, WHITE][(a + k) % 4])


CATS = [("🎲", "보드게임·TRPG"), ("🎮", "디지털 게임"), ("📖", "웹툰·만화"), ("🧸", "캐릭터·굿즈"),
        ("📚", "출판"), ("🎵", "음악"), ("🎬", "영화·비디오"), ("🎭", "공연")]
SCORES = [("1ST", "누적 펀딩", "5,000억 원+"), ("2ND", "누적 후원", "1,000만 건+"), ("3RD", "진행된 프로젝트", "약 8만 개")]
BACKER_X = [270, 310, 350, 390, 430]


def render_low(t):
    im = Image.new("RGB", (LW, LH), NAVY)
    d = ImageDraw.Draw(im)
    if t < 4.0:  # 타이틀
        stars(d, t)
        ptext(d, (LW / 2, 80), "텀블벅", PX4, CORAL)
        ptext(d, (LW / 2, 125), "- CREATOR QUEST -", PX2, YELLOW)
        blink = 0.12 if t > 3.3 else 0.35  # 누르는 순간 빠르게 깜빡
        if int(t / blink) % 2 == 0:
            ptext(d, (LW / 2, 180), "▶ 프로젝트 시작하기", PX, WHITE)
        ptext(d, (LW / 2, 245), "PRESS START", PX, (150, 150, 200))
    elif t < 5.5:
        stage_card(d, t, 4.0, 1, "아이디어를 꺼내라", "머릿속에만 있던 그것")
    elif t < 10.0:  # STAGE 1: ? 블록에서 아이디어 획득
        world(d, 0)
        bx, by = 200, 140
        walk_end = 7.3
        x = 40 + (HERO_X + 90 - 40) * min(1.0, max(0.0, (t - 5.5) / (walk_end - 5.5)))
        jump = int(max(0.0, math.sin(math.pi * (t - walk_end) / 0.4)) * 34) if walk_end <= t < walk_end + 0.4 else 0
        bump = 3 if 7.45 <= t < 7.6 else 0
        sprite(d, USED if t >= 7.5 else QBLOCK, bx - 8, by - bump, 2)
        if 7.5 <= t < 8.6:  # 전구가 솟아올랐다가 주인공에게
            q = min(1.0, (t - 7.5) / 0.5)
            ly = by - 4 - 26 * q
            if t > 8.1:
                ly += (t - 8.1) * 90
            sprite(d, BULB, bx - 7, ly, 2)
        if t >= 8.6:
            sprite(d, BULB, x - 7, GROUND_Y - 50 - int(3 * math.sin(t * 8)), 2)
            ptext(d, (x, by - 22), "아이디어 획득!", PX, YELLOW)
        hero(d, x, t, walking=t < walk_end, jump=jump)
        dialog(d, "만들고 싶은 게 생겼다!", 8.8, t)
    elif t < 11.5:
        stage_card(d, t, 10.0, 2, "프로젝트를 공개하라", "세상에 처음 보여주는 순간")
    elif t < 16.0:  # STAGE 2: 프로젝트 간판 세우기
        world(d, 0)
        p = min(1.0, max(0.0, (t - 11.8) / 0.4))
        if p > 0:
            top = GROUND_Y - 95 * p
            post = min(top + 60, GROUND_Y)  # 솟아오르는 중엔 기둥이 짧음
            d.rectangle((250, post, 254, GROUND_Y), fill=(110, 70, 40))
            d.rectangle((376, post, 380, GROUND_Y), fill=(110, 70, 40))
            d.rectangle((236, top, 394, top + 66), fill=(250, 240, 220), outline=(110, 70, 40), width=3)
            ptext(d, (315, top + 16), "MY PROJECT", PX, CORAL, shadow=False)
            ptext(d, (315, top + 34), "목표 금액 100%", PX, (60, 50, 50), shadow=False)
            ptext(d, (315, top + 50), "D-30", PX, (60, 50, 50), shadow=False)
        if t >= 13.0:  # OPEN! 도장
            s = 1 + max(0.0, 0.4 - (t - 13.0)) * 2
            ptext(d, (360, GROUND_Y - 110 - 8 * (s - 1)), "OPEN!", PX2 if s < 1.3 else PX4, YELLOW)
        hero(d, HERO_X + 40, t, walking=False)
        dialog(d, "공개 완료! 그런데... 혼자서 해낼 수 있을까?", 13.6, t)
    elif t < S3:
        stage_card(d, t, 16.0, 3, "응원을 모아라", "후원자들의 하트를 모으자")
    elif t < S3_END:  # STAGE 3: 달리며 후원 하트 모으기
        run_t = min(t, 25.4)
        world(d, (run_t - S3) * RUN_SPEED)
        for s0, hy in HEARTS:
            x = LW - (t - s0) * RUN_SPEED
            if s0 <= t and x > HERO_X + 4:
                sprite(d, HEART, x, hy + int(3 * math.sin((t - s0) * 10)), 2)
            elif s0 <= t and x > HERO_X - 60:
                ptext(d, (HERO_X + 10, hy - 20 - (HERO_X + 4 - x) / 3), "+1", PX, YELLOW)
        if FEVER <= t < 23.9 and int(t / 0.2) % 2 == 0:
            ptext(d, (LW / 2, 70), "FEVER TIME!", PX4, CORAL)
        if t > 24.6:  # 결승 깃발
            fx = max(250, LW - (t - 24.6) * RUN_SPEED * 1.2)
            sprite(d, FLAG, fx, 155, 4)
        hero(d, HERO_X, t, walking=t < 25.4, jump=int(abs(math.sin(t / B * math.pi)) * 6) if t < 25.4 else 0)
        hud(d, t)
    elif t < 29.0:  # 스테이지 클리어
        world(d, (25.4 - S3) * RUN_SPEED)
        sprite(d, FLAG, 250, 155, 4)
        hero(d, HERO_X, t, walking=False, jump=int(abs(math.sin((t - 26) * 8)) * 14))
        hud(d, t)
        fireworks(d, t - 26.0)
        if int((t - 26) / 0.25) % 2 == 0 or t > 27.0:
            ptext(d, (LW / 2, 95), "STAGE CLEAR!", PX4, YELLOW)
        ptext(d, (LW / 2, 138), "펀딩 성공!", PX2, WHITE)
        ptext(d, (LW / 2, 255), "※ 목표 금액을 달성해야만 결제돼요", PX, WHITE)
    elif t < 30.5:
        stage_card(d, t, 29.0, 4, "선물을 전하라", "응원에 보답하는 시간")
    elif t < 35.0:  # STAGE 4: 선물 배달
        world(d, 0)
        walk_end = 32.0
        x = 40 + (220 - 40) * min(1.0, max(0.0, (t - 30.5) / (walk_end - 30.5)))
        for k, bxk in enumerate(BACKER_X):
            arrive = 32.2 + k * 0.3
            jump = int(max(0.0, math.sin(math.pi * (t - arrive) / 0.35)) * 12) if arrive <= t < arrive + 1.05 else 0
            hero(d, bxk, t, walking=False, jump=jump, swap={"C": SHIRTS[k], "H": "K" if k % 2 else "H"})
            if t >= arrive:
                sprite(d, HEART, bxk - 7, GROUND_Y - 50 - int((t - arrive) * 6) % 6, 2)
                sprite(d, GIFT, bxk + 4, GROUND_Y - 16, 1)
            elif t >= walk_end:  # 선물이 포물선을 그리며 날아감
                start = walk_end + k * 0.3 - 0.3
                q = min(1.0, max(0.0, (t - start) / 0.3))
                if q > 0:
                    gx = x + (bxk - x) * q
                    gy = GROUND_Y - 50 - math.sin(math.pi * q) * 30
                    sprite(d, GIFT, gx - 8, gy, 2)
        if t < walk_end + 1.4:
            sprite(d, GIFT, x - 8, GROUND_Y - 44, 2)  # 머리 위에 선물 상자
        hero(d, x, t, walking=t < walk_end)
        dialog(d, "후원자 모두에게 선물 도착! 고마워요!", 33.6, t)
    elif t < 39.5:  # 월드 선택 = 카테고리
        stars(d, t, 4)
        ptext(d, (LW / 2, 24), "SELECT WORLD", PX2, YELLOW)
        sel = int((t - 35.0) / (B * 2)) % 8
        for i, (em, name) in enumerate(CATS):
            x, y = 16 + (i % 4) * 114, 50 + (i // 4) * 96
            on = i == sel
            d.rectangle((x, y, x + 106, y + 86), fill=(40, 34, 80), outline=YELLOW if on else (90, 80, 150),
                        width=3 if on else 1)
            icon = emoji(em, 28).resize((28, 28), Image.NEAREST)
            im.paste(icon, (x + 39, y + 14), icon)
            ptext(d, (x + 53, y + 64), name, PX, YELLOW if on else WHITE)
        ptext(d, (LW / 2, 252), "모든 장르의 모험이 여기에", PX, (190, 190, 230))
    elif t < 44.0:  # 하이스코어 = 실제 누적 수치
        stars(d, t, 2)
        if int(t / 0.3) % 2 == 0 or t > 40.5:
            ptext(d, (LW / 2, 40), "HIGH SCORE", PX4, YELLOW)
        for i, (rank, label, val) in enumerate(SCORES):
            st = 40.0 + i * 0.7
            if t < st:
                continue
            y = 100 + i * 40
            n = int((t - st) * 30)
            ptext(d, (60, y), rank, PX2, [YELLOW, (200, 200, 220), (230, 150, 80)][i], anchor="lm")
            ptext(d, (120, y), label, PX, WHITE, anchor="lm")
            dots_end = 300
            d.line((200, y + 4, 200 + min(dots_end - 200, n * 8), y + 4), fill=(110, 110, 160), width=1)
            if n > 12:
                ptext(d, (430, y), val, PX, CORAL, anchor="rm")
        ptext(d, (LW / 2, 245), "2026.6.29 기준 · 텀블벅 발표", PX, (150, 150, 190))
    else:  # 엔딩
        stars(d, t, 6)
        ptext(d, (LW / 2, 72), "텀블벅", PX4, CORAL)
        ptext(d, (LW / 2, 122), "0에서 1을 만드는 사람들", PX2, WHITE)
        ptext(d, (LW / 2, 165), "tumblbug.com", PX, YELLOW)
        if int(t / 0.35) % 2 == 0:
            ptext(d, (LW / 2, 215), "INSERT COIN ▶ 지금 시작하기", PX, WHITE)
    return im


def render(t):
    big = np.asarray(render_low(t).resize((LW * SCALE, LH * SCALE), Image.NEAREST)).copy()
    big[::4] = (big[::4] * 0.86).astype(np.uint8)  # 브라운관 주사선
    return Image.fromarray(big)


# ---------- 음악 ----------
CHORDS = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]]  # C Am F G
ROOTS = [48, 45, 41, 43]


def groove(tr, start, end, level):
    """level 1: 가볍게, 2: 기본, 3: 피버(16분음표 리드)"""
    b = math.ceil(start / B - 1e-6)
    while b * B < end - 1e-6:
        t0 = b * B
        ci = (b // 4) % 4
        ch = CHORDS[ci]
        steps = 4 if level == 3 else 2
        for k in range(steps):
            n = (ch + [ch[0] + 12])[(b * steps + k) % 4] + 12
            tr.add(S.square(n, B / steps * 0.9, 0.25, 3), t0 + k * B / steps, 0.1, -0.2)
        tr.add(S.triangle(ROOTS[ci] + (12 if b % 2 else 0), B * 0.9), t0, 0.35)
        if level >= 2:
            tr.add(S.chip_noise(0.12 if b % 2 else 0.05), t0, 0.12 if b % 2 else 0.07)
            if b % 2 == 0:
                tr.add(S.kick(90, 14), t0, 0.5)
        b += 1


def jingle(tr, t0, notes, step=0.1, last=0.5, vol=0.12):
    for k, n in enumerate(notes):
        tr.add(S.square(n, step * 0.9 if k < len(notes) - 1 else last, 0.5, 0 if k < len(notes) - 1 else 2),
               t0 + k * step, vol)


def music():
    tr = S.Track(DUR)
    for b in range(int(4.0 / B)):  # 타이틀: 느린 아르페지오
        ch = CHORDS[(b // 4) % 4]
        tr.add(S.square(ch[b % 3] + 12, B * 0.9, 0.25, 4), b * B, 0.12)
    for t0 in (4.0, 10.0, 16.0, 29.0):  # 스테이지 시작 징글
        jingle(tr, t0, [67, 72, 76, 79], 0.09, 0.4)
        tr.add(S.triangle(48, 0.6), t0 + 0.27, 0.3)
    groove(tr, 5.5, 10.0, 1)
    groove(tr, 11.5, 16.0, 1)
    groove(tr, S3, FEVER, 2)
    groove(tr, FEVER, 25.4, 3)
    groove(tr, 30.5, 35.0, 2)
    groove(tr, 35.0, 39.5, 1)
    for b in range(math.ceil(39.5 / B), int(44.0 / B)):  # 하이스코어: 차분하게
        tr.add(S.triangle(ROOTS[(b // 4) % 4], B * 0.9), b * B, 0.3)
    # 효과음
    tr.add(S.square(72, 0.12, 0.5), 7.3, 0.08)                     # 점프
    tr.add(S.square(76, 0.1, 0.5), 7.36, 0.08)
    tr.add(S.triangle(43, 0.15), 7.5, 0.4)                         # 블록 쿵
    jingle(tr, 8.6, [72, 76, 79, 84], 0.07, 0.3, 0.1)              # 아이템 획득
    tr.add(S.chip_noise(0.3), 13.0, 0.25)                          # OPEN! 쾅
    tr.add(S.triangle(36, 0.4), 13.0, 0.45)
    for s0, _ in HEARTS:                                           # 하트 먹는 소리
        tc = s0 + TRAVEL
        tr.add(S.square(88, 0.05, 0.5), tc, 0.05)
        tr.add(S.square(93, 0.06, 0.5), tc + 0.04, 0.05)
    jingle(tr, 26.0, [72, 76, 79, 84, 88, 91], 0.1, 1.4, 0.12)     # 클리어 팡파르
    tr.add(S.triangle(48, 1.6), 26.5, 0.35)
    for k in range(5):                                             # 선물 도착
        tr.add(S.square(84 + k * 2, 0.08, 0.5), 32.2 + k * 0.3, 0.07)
    for b in range(math.ceil(35.0 / B / 2), int(39.5 / B / 2)):    # 커서 이동
        tr.add(S.square(96, 0.03, 0.5), b * B * 2, 0.05)
    for i in range(3):                                             # 점수 등장
        tr.add(S.square(79 + i * 4, 0.1, 0.5), 40.0 + i * 0.7 + 0.4, 0.08)
    jingle(tr, 44.0, [67, 72, 76, 79, 84], 0.14, 2.2, 0.13)        # 엔딩
    tr.add(S.triangle(36, 2.6), 44.56, 0.4)
    tr.save("styles/samples/c_full.wav", fade_out=1.5)


if __name__ == "__main__":
    import os
    os.makedirs("styles/samples", exist_ok=True)
    music()
    storyboard(render, [(2.2, "타이틀"), (9.8, "STAGE 1 아이디어 획득"), (15.7, "STAGE 2 프로젝트 공개"),
                        (22.5, "STAGE 3 FEVER TIME"), (27.3, "STAGE CLEAR 펀딩 성공"), (34.9, "STAGE 4 선물 전달"),
                        (37.0, "월드 = 카테고리"), (42.5, "하이스코어 = 실제 수치"), (46.0, "엔딩")],
               "시안 C 풀 버전 · CREATOR QUEST (48초)",
               ["텀블벅 펀딩 과정을 게임 스테이지로: 아이디어 → 공개 → 응원 모으기 → 클리어 → 선물 전달",
                "실제 수치는 하이스코어 화면에만 사용 (2026.6.29 기준 텀블벅 발표), 나머지 숫자는 연출용 예시"],
               "C_pixel_full_storyboard.jpg")
    encode(render, LW * SCALE, LH * SCALE, DUR, "styles/samples/c_full.wav", "C_pixel_full.mp4")
