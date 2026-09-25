"""시안 B 풀 버전 — 종이 위 손그림 스토리 (48초, 16:9)
창작자 한 명이 아이디어를 떠올려 프로젝트를 공개하고, 응원을 받아 선물을 전하기까지를 그림책처럼 따라감
장면 하나 = 피아노 한 마디(4초)
"""
import math

import numpy as np
from PIL import Image, ImageDraw

import style_b_paper as P
import synth as S
from common import CORAL, clamp, ease_back, ease_out, encode, font, prog, storyboard, text
from style_b_paper import (KRAFT, PAPER_COLORS, PAPER_IMG, PENCIL, circle_pts, hand, paper_person, tape, wobble_line,
                           write)

W, H, DUR = 1920, 1080, 48.0
CAP_Y = 900  # 손글씨 자막 위치
WHITE = (255, 255, 255)
SHADOW = (205, 194, 176)


def paper_card(img, box, fill=WHITE):
    x0, y0, x1, y1 = box
    d = ImageDraw.Draw(img)
    d.rectangle((x0 + 10, y0 + 12, x1 + 10, y1 + 12), fill=SHADOW)
    d.rectangle(box, fill=fill)


def hand_dot_text(d, center, s, f):
    """손글씨 폰트엔 가운뎃점(·)이 없어서 점을 직접 찍음"""
    parts = s.split("·")
    gap = 26
    widths = [f.getlength(p) for p in parts]
    x = center[0] - (sum(widths) + gap * (len(parts) - 1)) / 2
    for i, (p, w) in enumerate(zip(parts, widths)):
        d.text((x, center[1]), p, font=f, fill=PENCIL + (255,), anchor="lm")
        x += w
        if i < len(parts) - 1:
            d.ellipse((x + gap / 2 - 4, center[1] - 4, x + gap / 2 + 4, center[1] + 4), fill=PENCIL + (255,))
            x += gap


def rotated_paste(img, lay, cx, cy, angle, scale=1.0):
    if scale <= 0.02:
        return
    if scale != 1.0:
        lay = lay.resize((max(1, int(lay.width * scale)), max(1, int(lay.height * scale))), Image.BICUBIC)
    lay = lay.rotate(angle, expand=True, resample=Image.BICUBIC)
    img.alpha_composite(lay, (int(cx - lay.width / 2), int(cy - lay.height / 2)))


def heart_pts(hx, hy, s):
    return [(hx + 16 * math.sin(u) ** 3 * s, hy - (13 * math.cos(u) - 5 * math.cos(2 * u) - 2 * math.cos(3 * u)
             - math.cos(4 * u)) * s) for u in np.linspace(0, 2 * math.pi, 30)]


def stick_figure(d, cx, cy, t, k=1.6, seed=20):
    wobble_line(d, circle_pts(cx, cy - 60 * k, 38 * k), 1, t, 7, seed=seed)
    wobble_line(d, [(cx, cy - 22 * k), (cx, cy + 80 * k)], 1, t, 7, seed=seed + 1)
    wobble_line(d, [(cx - 50 * k, cy + 10 * k), (cx, cy + 20 * k), (cx + 50 * k, cy + 10 * k)], 1, t, 7, seed=seed + 2)
    wobble_line(d, [(cx - 40 * k, cy + 160 * k), (cx, cy + 80 * k), (cx + 40 * k, cy + 160 * k)], 1, t, 7,
                seed=seed + 3)


SPOTS = [(-300, -60), (300, -60), (-520, 110), (520, 110), (-260, 200), (260, 200), (-720, -40), (720, -40)]


# ---------- 새 장면들 ----------
def scene_sketches(img, t, lt):
    d = ImageDraw.Draw(img)
    items = [(560, "보드게임"), (960, "그림책"), (1360, "캐릭터 굿즈")]
    for i, (cx, label) in enumerate(items):
        st = 0.2 + i * 0.9
        p = prog(lt, st, 0.8)
        cy = 430
        if i == 0:  # 보드게임 상자 + 주사위
            wobble_line(d, [(cx - 120, cy - 80), (cx + 120, cy - 80), (cx + 120, cy + 80), (cx - 120, cy + 80),
                            (cx - 120, cy - 80)], p, t, 7, seed=60)
            wobble_line(d, [(cx - 30, cy - 30), (cx + 30, cy - 30), (cx + 30, cy + 30), (cx - 30, cy + 30),
                            (cx - 30, cy - 30)], prog(lt, st + 0.5, 0.4), t, 6, CORAL, seed=61)
        elif i == 1:  # 펼친 책
            wobble_line(d, [(cx - 130, cy - 60), (cx - 60, cy - 80), (cx, cy - 55), (cx + 60, cy - 80),
                            (cx + 130, cy - 60), (cx + 130, cy + 80), (cx + 60, cy + 60), (cx, cy + 85),
                            (cx - 60, cy + 60), (cx - 130, cy + 80), (cx - 130, cy - 60)], p, t, 7, seed=62)
            wobble_line(d, [(cx, cy - 55), (cx, cy + 85)], prog(lt, st + 0.5, 0.3), t, 6, seed=63)
        else:  # 곰 캐릭터
            wobble_line(d, circle_pts(cx, cy - 20, 70), p, t, 7, seed=64)
            wobble_line(d, circle_pts(cx - 55, cy - 80, 24), prog(lt, st + 0.4, 0.3), t, 7, seed=65)
            wobble_line(d, circle_pts(cx + 55, cy - 80, 24), prog(lt, st + 0.5, 0.3), t, 7, seed=66)
            if lt > st + 0.7:
                d.ellipse((cx - 28, cy - 32, cx - 16, cy - 20), fill=PENCIL)
                d.ellipse((cx + 16, cy - 32, cx + 28, cy - 20), fill=PENCIL)
                wobble_line(d, [(cx - 18, cy + 8), (cx, cy + 20), (cx + 18, cy + 8)], 1, t, 5, CORAL, seed=67)
        write(img, label, 64, (cx, cy + 150), st + 0.6, lt)
    write(img, "만들고 싶은 것들이 하나둘 그려졌어요", 96, (W / 2, CAP_Y), 2.2, lt, cps=24)


def scene_checklist(img, t, lt):
    p = ease_back(prog(lt, 0.1, 0.5))
    if p <= 0:
        return
    cx, cy, w, h = W / 2, 470, 900 * p, 520 * p
    paper_card(img, (cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2))
    if p < 0.99:
        return
    d = ImageDraw.Draw(img)
    tape(img, cx - w / 2 + 40, cy - h / 2 + 10, 170, 46, 30)
    tape(img, cx + w / 2 - 40, cy - h / 2 + 10, 170, 46, -30)
    write(img, "나의 첫 번째 프로젝트", 84, (cx, cy - 170), 0.4, lt, CORAL)
    for i, s in enumerate(["목표 금액 정하기", "선물 구성하기", "세상에 공개하기"]):
        y = cy - 50 + i * 100
        bx = cx - 260
        wobble_line(d, [(bx, y - 26), (bx + 52, y - 26), (bx + 52, y + 26), (bx, y + 26), (bx, y - 26)], 1, t, 5,
                    seed=70 + i)
        d.text((bx + 90, y), s, font=hand(70), fill=PENCIL, anchor="lm")
        wobble_line(d, [(bx + 6, y - 2), (bx + 22, y + 22), (bx + 64, y - 40)], prog(lt, 1.0 + i * 0.6, 0.3), t, 8,
                    CORAL, seed=75 + i)
    write(img, "용기를 내어 이야기를 꺼내 보기로 했어요", 90, (W / 2, 1000), 2.3, lt, cps=24)


BUBBLES = [(-560, 160, "꼭 갖고 싶어요!"), (560, 160, "응원해요!"), (-200, 70, "기다릴게요 :)"),
           (240, 70, "정말 멋져요!!"), (0, -60, "완성되면 자랑할래요")]


def scene_bubbles(img, t, lt):
    d = ImageDraw.Draw(img)
    cx, cy = W / 2, 500
    stick_figure(d, cx, cy, t)
    for k, (dx, dy) in enumerate(SPOTS):
        paper_person(img, cx + dx, cy + dy + 40, 1.4, PAPER_COLORS[k % 5])
    for k, (bx, by, s) in enumerate(BUBBLES):
        p = ease_back(prog(lt, 0.3 + k * 0.45, 0.4))
        if p <= 0:
            continue
        f = hand(58)
        tw = f.getlength(s) + 60
        lay = Image.new("RGBA", (int(tw) + 20, 130), (0, 0, 0, 0))
        ld = ImageDraw.Draw(lay)
        ld.rounded_rectangle((8, 10, tw + 8, 96), 30, fill=SHADOW + (255,))
        ld.rounded_rectangle((0, 0, tw, 86), 30, fill=WHITE + (255,))
        ld.polygon([(tw / 2 - 16, 84), (tw / 2 + 16, 84), (tw / 2 - 4, 120)], fill=WHITE + (255,))
        ld.text((tw / 2, 43), s, font=f, fill=PENCIL + (255,), anchor="mm")
        rotated_paste(img, lay, cx + bx, 150 + by, (-4, 3, -2, 4, 0)[k], p)
    write(img, "따뜻한 한마디가 큰 힘이 되었어요", 96, (W / 2, 1000), 2.3, lt, cps=24)


def gift_box(img, cx, cy, s, color):
    d = ImageDraw.Draw(img)
    w = 170 * s
    d.rectangle((cx - w / 2 + 8, cy - w / 2 + 10, cx + w / 2 + 8, cy + w / 2 + 10), fill=SHADOW)
    d.rectangle((cx - w / 2, cy - w / 2, cx + w / 2, cy + w / 2), fill=color)
    d.rectangle((cx - 12 * s, cy - w / 2, cx + 12 * s, cy + w / 2), fill=CORAL)
    d.rectangle((cx - w / 2, cy - 12 * s, cx + w / 2, cy + 12 * s), fill=CORAL)
    r = 26 * s  # 리본 매듭
    for dx in (-r, r):
        d.ellipse((cx + dx - r, cy - w / 2 - 2 * r + 4 * s, cx + dx + r, cy - w / 2 + 4 * s), outline=CORAL,
                  width=max(2, int(9 * s)))


def scene_gifts(img, t, lt):
    d = ImageDraw.Draw(img)
    for i, cx in enumerate([660, 960, 1260]):
        p = ease_back(prog(lt, 0.2 + i * 0.35, 0.4))
        fly = ease_out(prog(lt, 2.4 + i * 0.15, 0.9))
        x = cx + fly * 1100
        y = 470 - math.sin(fly * math.pi) * 120
        if p > 0 and x < W + 150:
            gift_box(img, x, y, p, KRAFT if i != 1 else (236, 214, 180))
        if fly > 0:  # 날아가는 점선
            for k in range(8):
                q = fly - k * 0.05
                if q > 0:
                    px, py = cx + q * 1100, 470 - math.sin(q * math.pi) * 120
                    d.ellipse((px - 5, py - 5, px + 5, py + 5), fill=PENCIL)
    write(img, "약속한 선물을 정성껏 만들어 보냈어요", 96, (W / 2, CAP_Y), 0.6, lt, cps=22)


def scene_received(img, t, lt):
    d = ImageDraw.Draw(img)
    xs = [360, 660, 960, 1260, 1560]
    for k, x in enumerate(xs):
        p = ease_back(prog(lt, 0.2 + k * 0.25, 0.4))
        if p <= 0:
            continue
        hop = abs(math.sin((lt - 0.6 - k * 0.25) * 5)) * 18 if lt > 0.6 + k * 0.25 else 0
        paper_person(img, x, 520 - hop, 2.0 * p, PAPER_COLORS[k % 5])
        if p > 0.99:
            gift_box(img, x + 70, 560 - hop, 0.45, KRAFT)
            wobble_line(d, heart_pts(x, 300 - hop, 2.4), prog(lt, 0.8 + k * 0.25, 0.5), t, 5, CORAL, seed=90 + k)
    write(img, "후원자들에게도 설레는 선물이 도착했어요", 96, (W / 2, CAP_Y), 1.0, lt, cps=22)


TAGS = ["보드게임·TRPG", "디지털 게임", "웹툰·만화", "캐릭터·굿즈", "출판", "음악", "영화·비디오", "공연"]


def scene_tags(img, t, lt):
    write(img, "여기엔 이런 이야기들이 모여요", 96, (W / 2, 170), 0.1, lt, cps=22)
    for i, s in enumerate(TAGS):
        p = ease_back(prog(lt, 0.6 + i * 0.22, 0.35))
        if p <= 0:
            continue
        lay = Image.new("RGBA", (380, 170), (0, 0, 0, 0))
        ld = ImageDraw.Draw(lay)
        c = PAPER_COLORS[i % 5]
        ld.polygon([(40, 10), (370, 10), (370, 160), (40, 160), (0, 85)], fill=c + (255,))
        ld.ellipse((34, 72, 60, 98), fill=(244, 236, 222, 255))
        hand_dot_text(ld, (215, 85), s, hand(64))
        cx = 300 + (i % 4) * 440
        cy = 440 + (i // 4) * 250
        rotated_paste(img, lay, cx, cy, (-6, 4, -3, 6, 5, -5, 3, -4)[i], p)


NOTES = [((255, 236, 140), "누적 펀딩", "5,000억 원+"), ((190, 230, 200), "누적 후원", "1,000만 건+"),
         ((250, 200, 200), "진행된 프로젝트", "약 8만 개")]


def scene_notes(img, t, lt):
    write(img, "지금까지 함께 만든 이야기", 96, (W / 2, 170), 0.1, lt, cps=22)
    for i, (c, label, val) in enumerate(NOTES):
        p = ease_back(prog(lt, 0.6 + i * 0.5, 0.4))
        if p <= 0:
            continue
        lay = Image.new("RGBA", (470, 420), (0, 0, 0, 0))
        ld = ImageDraw.Draw(lay)
        ld.rectangle((14, 18, 464, 418), fill=SHADOW + (255,))
        ld.rectangle((0, 0, 450, 400), fill=c + (255,))
        ld.text((225, 150), label, font=hand(72), fill=PENCIL + (255,), anchor="mm")
        ld.text((225, 260), val, font=font("Black", 66), fill=CORAL + (255,), anchor="mm")
        cx = W / 2 + (i - 1) * 540
        rotated_paste(img, lay, cx, 560, (-3, 2, -2)[i], p)
        if p > 0.99:
            tape(img, cx, 360, 180, 50, (-8, 6, -4)[i])
    text(img, "2026년 6월 29일 기준, 텀블벅 발표", "Medium", 28, (W / 2, 1010), (130, 120, 105), clamp((lt - 1.8) * 3))


def scene_next(img, t, lt):
    d = ImageDraw.Draw(img)
    cx, cy = W / 2, 330
    wobble_line(d, circle_pts(cx, cy - 20, 100, start=2.2, turns=0.83), prog(lt, 0.2, 0.9), t, 7, seed=101)
    wobble_line(d, [(cx - 42, cy + 78), (cx - 42, cy + 125), (cx + 42, cy + 125), (cx + 42, cy + 78)],
                prog(lt, 1.0, 0.4), t, 7, seed=102)
    for k in range(5):
        a = math.pi + (k + 1) * math.pi / 6
        wobble_line(d, [(cx + 135 * math.cos(a), cy - 20 + 135 * math.sin(a)),
                        (cx + 185 * math.cos(a), cy - 20 + 185 * math.sin(a))], prog(lt, 1.4 + k * 0.08, 0.2), t, 6,
                    CORAL, seed=103 + k)
    write(img, "다음 이야기의 주인공은 당신이에요", 104, (W / 2, 700), 0.8, lt, cps=22)
    a = clamp((lt - 2.2) * 3)
    text(img, "tumblbug.com", "ExtraBold", 60, (W / 2, 840), CORAL, a)


# (시작 초, 장면 함수 또는 샘플 B의 구간 시작점)
SCENES = [(0, ("B", 0)), (4, scene_sketches), (8, scene_checklist), (12, ("B", 4)), (16, scene_bubbles),
          (20, ("B", 8)), (24, scene_gifts), (28, scene_received), (32, scene_tags), (36, scene_notes),
          (40, ("B", 12)), (44, scene_next)]


def render(t):
    start, sc = [s for s in SCENES if s[0] <= t][-1]
    lt = t - start
    if isinstance(sc, tuple):  # 샘플 B의 장면을 그대로 재사용
        return P.render(sc[1] + lt)
    img = PAPER_IMG.copy()
    sc(img, t, lt)
    return img


def music():
    tr = S.Track(DUR)
    chords = [[65, 69, 72], [64, 67, 72], [62, 65, 69], [62, 65, 70]]  # F - C/E - Dm - B♭
    roots = [41, 36, 38, 34]
    melody = [[77, 76, 72, 74], [76, 74, 72, 72], [74, 72, 69, 72], [74, 77, 76, 74]]
    for bar in range(12):
        t0 = bar * 4.0
        ci = bar % 4
        ch = chords[ci]
        tr.add(S.pad(ch, 4.5, 900 if bar < 6 else 1300), t0, 0.33)
        tr.add(S.piano(roots[ci], 4.0), t0, 0.5)
        tr.add(S.piano(roots[ci] + 12, 3.5), t0 + 2.0, 0.22)
        if bar == 11:  # 마지막 마디: 긴 화음으로 마무리
            for k, n in enumerate([65, 69, 72, 77]):
                tr.add(S.piano(n, 4.0), t0 + k * 0.12, 0.25)
            continue
        notes = ch + [ch[1] + 12]
        step = 0.5 if bar < 3 or bar == 10 else 0.25
        for k in range(int(4.0 / step)):
            tr.add(S.piano(notes[[0, 1, 2, 3, 2, 1][k % 6]] + 12, 1.4), t0 + k * step,
                   0.2 if step == 0.5 else 0.15, (-0.3, 0.3)[k % 2])
        if 3 <= bar <= 9:  # 부드러운 리듬 (중반부)
            for b in range(4):
                if b % 2 == 0:
                    tr.add(S.kick(70, 12), t0 + b, 0.35)
                tr.add(S.noise_hit(0.08, 5000, 12000, 50), t0 + b + 0.5, 0.08, 0.3)
        if bar >= 5 and bar <= 10:  # 멜로디
            for k, n in enumerate(melody[ci]):
                tr.add(S.piano(n, 1.6), t0 + (0, 1.5, 2.0, 3.0)[k], 0.3)
    tr.add(S.bell(96, 1.5, 3), 22.9, 0.18)  # '펀딩 성공' 도장 순간
    tr.add(S.bell(89, 1.5, 3), 22.95, 0.14)
    tr.add(S.riser(2.0), 18.0, 0.12)
    tr.save("styles/samples/b_full.wav", fade_out=2.5)


if __name__ == "__main__":
    import os
    os.makedirs("styles/samples", exist_ok=True)
    music()
    storyboard(render, [(3.6, "아이디어가 떠오르다"), (7.6, "만들고 싶은 것들 스케치"), (11.6, "첫 프로젝트 체크리스트"),
                        (15.6, "응원이 모이기 시작"), (19.6, "응원 말풍선"), (23.6, "목표 달성·도장"),
                        (26.4, "선물을 보내요"), (31.2, "선물 도착"), (35.6, "카테고리 종이 태그"),
                        (39.6, "실제 누적 수치 포스트잇"), (43.4, "텀블벅 라벨"), (47.2, "다음 주인공은 당신")],
               "시안 B 풀 버전 · 종이 위 손그림 스토리 (48초)",
               ["창작자 한 명이 아이디어를 떠올려 공개하고, 응원을 받아 선물을 전하기까지를 그림책처럼",
                "실제 수치는 포스트잇 장면에만 사용 (2026.6.29 기준 텀블벅 발표), 말풍선·인물은 연출용 예시"],
               "B_paper_full_storyboard.jpg")
    encode(render, W, H, DUR, "styles/samples/b_full.wav", "B_paper_full.mp4")
