"""시안 B — 종이 위 손그림 스토리 (16초, 16:9)
종이 질감 위에 연필 낙서와 손글씨로 창작자 한 명의 이야기를 따뜻하게 풀어내는 스타일
"""
import math
import random

import numpy as np
from PIL import Image, ImageDraw, ImageFont

import synth as S
from common import CORAL, clamp, ease_back, ease_out, encode, font, prog, storyboard, text

W, H, DUR = 1920, 1080, 16.0
PAPER = (244, 236, 222)
PENCIL = (64, 58, 52)
KRAFT = (214, 186, 146)
PAPER_COLORS = [(242, 168, 120), (130, 190, 170), (140, 165, 220), (235, 200, 110), (200, 150, 210)]
HAND = "fonts/NanumPenScript-Regular.ttf"
_hand = {}


def hand(size):
    if size not in _hand:
        _hand[size] = ImageFont.truetype(HAND, size)
    return _hand[size]


# 종이 질감 (한 번만 만듦)
_g = np.random.default_rng(1).normal(0, 6, (H, W, 1))
_fiber = np.random.default_rng(2).normal(0, 3, (H // 4, W // 4, 1)).repeat(4, 0).repeat(4, 1)
PAPER_IMG = Image.fromarray(np.clip(np.array(PAPER) + _g + _fiber, 0, 255).astype("uint8")).convert("RGBA")


def write(img, s, size, xy, t0, t, color=PENCIL, cps=14, anchor="mm"):
    """손글씨가 한 글자씩 써지는 효과"""
    n = int(max(0, t - t0) * cps)
    if n <= 0:
        return
    shown = s[:n]
    f = hand(size)
    if anchor == "mm":  # 전체 문장 기준으로 가운데 정렬 고정
        full = f.getbbox(s, anchor="lm")
        xy = (xy[0] - (full[2] - full[0]) / 2, xy[1])
    ImageDraw.Draw(img).text(xy, shown, font=f, fill=color, anchor="lm")


def wobble_line(d, pts, p, t, width=6, color=PENCIL, seed=0):
    """손으로 그린 듯 흔들리는 선. p(0~1)만큼만 그려짐. 초당 8번 떨림"""
    if p <= 0:
        return
    rnd = random.Random(seed * 1000 + int(t * 8))
    jp = [(x + rnd.uniform(-2.5, 2.5), y + rnd.uniform(-2.5, 2.5)) for x, y in pts]
    seg = [math.dist(jp[i], jp[i + 1]) for i in range(len(jp) - 1)]
    total, acc = sum(seg), 0.0
    out = [jp[0]]
    for i, L in enumerate(seg):
        if acc + L >= total * p:
            r = (total * p - acc) / L if L else 0
            out.append((jp[i][0] + (jp[i + 1][0] - jp[i][0]) * r, jp[i][1] + (jp[i + 1][1] - jp[i][1]) * r))
            break
        out.append(jp[i + 1])
        acc += L
    d.line(out, fill=color, width=width, joint="curve")


def circle_pts(cx, cy, r, n=40, start=0.0, turns=1.0):
    return [(cx + r * math.cos(start + turns * 2 * math.pi * k / n), cy + r * math.sin(start + turns * 2 * math.pi * k / n))
            for k in range(n + 1)]


def paper_person(img, cx, cy, s, color):
    """종이를 오려 붙인 사람 모양 (그림자 포함)"""
    d = ImageDraw.Draw(img)
    for dx, dy, c in [(5, 7, (190, 180, 165)), (0, 0, color)]:
        d.ellipse((cx - 26 * s + dx, cy - 70 * s + dy, cx + 26 * s + dx, cy - 18 * s + dy), fill=c)
        d.rounded_rectangle((cx - 40 * s + dx, cy - 10 * s + dy, cx + 40 * s + dx, cy + 60 * s + dy), int(34 * s), fill=c)


def tape(img, cx, cy, w, h, angle, color=(250, 225, 150)):
    layer = Image.new("RGBA", (int(w), int(h)), color + (200,))
    layer = layer.rotate(angle, expand=True, resample=Image.BICUBIC)
    img.alpha_composite(layer, (int(cx - layer.width / 2), int(cy - layer.height / 2)))


def stamp(img, s, cx, cy, p):
    if p <= 0:
        return
    f = font("Black", 64)
    l, t_, r, b = f.getbbox(s, anchor="mm")
    lay = Image.new("RGBA", (r - l + 70, b - t_ + 50), (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    d.rounded_rectangle((4, 4, lay.width - 4, lay.height - 4), 14, outline=CORAL + (230,), width=7)
    d.text((lay.width / 2, lay.height / 2), s, font=f, fill=CORAL + (230,), anchor="mm")
    sc = 1 + 0.6 * (1 - ease_out(p))
    lay = lay.resize((int(lay.width * sc), int(lay.height * sc)), Image.BICUBIC).rotate(-12, expand=True,
                                                                                            resample=Image.BICUBIC)
    lay.putalpha(lay.getchannel("A").point(lambda v: int(v * clamp(p * 3))))
    img.alpha_composite(lay, (int(cx - lay.width / 2), int(cy - lay.height / 2)))


def render(t):
    img = PAPER_IMG.copy()
    d = ImageDraw.Draw(img)
    if t < 4:  # 1장: 아이디어가 떠오르다 (전구 낙서)
        write(img, "어느 날, 작은 아이디어가 떠올랐어요", 96, (W / 2, 850), 0.3, t)
        cx, cy = W / 2, 400
        wobble_line(d, circle_pts(cx, cy - 20, 130, start=2.2, turns=0.83), prog(t, 0.2, 1.0), t, 7, seed=1)
        wobble_line(d, [(cx - 55, cy + 100), (cx - 55, cy + 160), (cx + 55, cy + 160), (cx + 55, cy + 100)],
                    prog(t, 1.1, 0.5), t, 7, seed=2)
        wobble_line(d, [(cx - 45, cy + 185), (cx + 45, cy + 185)], prog(t, 1.5, 0.2), t, 7, seed=3)
        for k in range(7):  # 빛 줄기
            a = math.pi + k * math.pi / 6
            x0, y0 = cx + 175 * math.cos(a), cy - 20 + 175 * math.sin(a)
            x1, y1 = cx + 240 * math.cos(a), cy - 20 + 240 * math.sin(a)
            wobble_line(d, [(x0, y0), (x1, y1)], prog(t, 1.8 + k * 0.08, 0.2), t, 6, CORAL, seed=10 + k)
        if t > 2.5:  # 전구 안을 칠하는 낙서
            q = prog(t, 2.5, 0.9)
            pts = [(cx - 90 + 180 * ((k % 2)), cy - 110 + k * 12) for k in range(18)]
            wobble_line(d, pts, q, t, 5, (240, 200, 90), seed=5)
    elif t < 8:  # 2장: 혼자서는 막막했지만 → 응원이 모이다
        lt = t - 4
        cx, cy = W / 2, 420
        k = 1.6  # 막대 인형 크기
        wobble_line(d, circle_pts(cx, cy - 60 * k, 38 * k), prog(lt, 0, 0.5), t, 7, seed=20)
        wobble_line(d, [(cx, cy - 22 * k), (cx, cy + 80 * k)], prog(lt, 0.4, 0.3), t, 7, seed=21)
        wobble_line(d, [(cx - 50 * k, cy + 10 * k), (cx, cy + 20 * k), (cx + 50 * k, cy + 10 * k)], prog(lt, 0.6, 0.3),
                    t, 7, seed=22)
        wobble_line(d, [(cx - 40 * k, cy + 160 * k), (cx, cy + 80 * k), (cx + 40 * k, cy + 160 * k)],
                    prog(lt, 0.8, 0.3), t, 7, seed=23)
        if lt < 1.9:
            write(img, "혼자서는 막막했지만,", 96, (W / 2, 850), 0.2, lt)
        else:
            write(img, "한 명, 두 명... 응원이 모이기 시작했어요", 90, (W / 2, 850), 1.9, lt)
            spots = [(-300, -60), (300, -60), (-520, 110), (520, 110), (-260, 200), (260, 200), (-720, -40), (720, -40)]
            for k, (dx, dy) in enumerate(spots):
                p = ease_back(prog(lt, 2.0 + k * 0.2, 0.4))
                if p > 0:
                    paper_person(img, cx + dx, cy + dy + 40, 1.4 * p, PAPER_COLORS[k % 5])
            for k in range(3):  # 하트 낙서
                p = prog(lt, 2.6 + k * 0.4, 0.5)
                hx, hy = cx + (-150, 0, 150)[k], cy - 250
                pts = [(hx + 16 * math.sin(u) ** 3 * 2.2, hy - (13 * math.cos(u) - 5 * math.cos(2 * u)
                        - 2 * math.cos(3 * u) - math.cos(4 * u)) * 2.2) for u in np.linspace(0, 2 * math.pi, 30)]
                wobble_line(d, pts, p, t, 5, CORAL, seed=30 + k)
    elif t < 12:  # 3장: 목표 달성
        lt = t - 8
        write(img, "그리고 마침내,", 96, (W / 2, 250), 0.1, lt)
        x0, x1, y = 360, W - 360, 520
        wobble_line(d, [(x0, y - 50), (x1, y - 50), (x1, y + 50), (x0, y + 50), (x0, y - 50)], prog(lt, 0.2, 0.6), t, 6,
                    seed=40)
        fp = ease_out(prog(lt, 0.8, 1.6))
        if fp > 0:  # 크레파스로 칠하듯 채우기
            xe = x0 + (x1 - x0) * fp
            for k in range(int((xe - x0) / 14)):
                xx = x0 + 10 + k * 14
                d.line((xx, y - 38, xx + 20, y + 38), fill=CORAL, width=9)
        write(img, f"{int(100 * fp)}%", 80, (x0 + 20, y + 120), 0.8, lt, cps=99, anchor="lm")
        write(img, "목표 달성!", 110, (W / 2, 820), 2.4, lt, color=CORAL)
        stamp(img, "펀딩 성공", W - 470, 280, prog(lt, 2.9, 0.3))
    else:  # 4장: 텀블벅 (크라프트지 라벨 + 마스킹테이프)
        lt = t - 12
        p = ease_back(prog(lt, 0.1, 0.5))
        if p > 0:
            lw, lh = 900 * p, 380 * p
            cx, cy = W / 2, 440
            d.rectangle((cx - lw / 2 + 10, cy - lh / 2 + 14, cx + lw / 2 + 10, cy + lh / 2 + 14), fill=(200, 188, 170))
            d.rectangle((cx - lw / 2, cy - lh / 2, cx + lw / 2, cy + lh / 2), fill=KRAFT)
            text(img, "텀블벅", "Black", 200, (cx, cy - 20), CORAL, 1.0, p)
            text(img, "tumblbug.com", "Bold", 44, (cx, cy + 120), (90, 70, 50), 1.0, p)
            if lt > 0.5:
                tape(img, cx - lw / 2 + 30, cy - lh / 2 + 10, 190, 50, 35)
                tape(img, cx + lw / 2 - 30, cy - lh / 2 + 10, 190, 50, -35)
        write(img, "0에서 1을 만드는 사람들", 100, (W / 2, 800), 0.9, lt)
        wobble_line(d, [(W / 2 - 330, 865), (W / 2 + 330, 858)], prog(lt, 2.4, 0.5), t, 6, CORAL, seed=50)
    return img


def music():
    tr = S.Track(DUR)
    # 60BPM, 한 마디 = 4초 = 장면 하나. F - C - Dm - B♭
    chords = [[65, 69, 72], [64, 67, 72], [62, 65, 69], [62, 65, 70]]
    roots = [41, 36, 38, 34]
    for bar in range(4):
        t0 = bar * 4.0
        tr.add(S.pad(chords[bar], 4.5, 900), t0, 0.35)
        tr.add(S.piano(roots[bar], 4.0), t0, 0.5)
        tr.add(S.piano(roots[bar] + 12, 3.5), t0 + 2.0, 0.25)
        notes = chords[bar] + [chords[bar][1] + 12]
        step = 0.5 if bar < 2 else 0.25  # 후반엔 16분음표로 설렘을 더함
        for k in range(int(4.0 / step)):
            tr.add(S.piano(notes[[0, 1, 2, 3, 2, 1][k % 6]] + 12, 1.5), t0 + k * step, 0.22 if bar < 2 else 0.18,
                   (-0.3, 0.3)[k % 2])
    tr.add(S.piano(77, 3.5), 12.0, 0.3)  # 마지막 장 멜로디 포인트
    tr.save("styles/out/b.wav", fade_out=2.0)


if __name__ == "__main__":
    import os
    os.makedirs("styles/out", exist_ok=True)
    music()
    storyboard(render, [(3.6, "어느 날, 아이디어가 떠오르다"), (5.6, "혼자서는 막막했지만"), (7.8, "응원이 모이기 시작"),
                        (10.2, "게이지를 크레파스로 채움"), (11.6, "'펀딩 성공' 도장 쾅"), (15.2, "크라프트지 라벨 엔딩")],
               "시안 B · 종이 위 손그림 스토리",
               ["종이 질감 위에 연필 낙서와 손글씨로 창작자 한 명의 이야기를 따뜻하게 풀어내는 스타일",
                "톤: 따뜻함·진정성 | 음악: 잔잔한 피아노 | 추천 용도: 창작자 모집, 브랜드 필름, 연말 회고 영상"],
               "B_paper_storyboard.jpg")
    encode(render, W, H, DUR, "styles/out/b.wav", "B_paper.mp4")
