"""텀블벅 소개영상 (52초, 1920x1080, 30fps) — 모션그래픽을 코드로 직접 그림

실행: python3 make_music.py && python3 make_video.py
결과: tumblbug_intro.mp4
"""
import math
import random
import subprocess

import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFont

W, H, FPS, DUR = 1920, 1080, 30, 52.0
BEAT = 0.5

CORAL = (234, 99, 79)  # 텀블벅 앱 화면에서 추출한 색 #EA634F
CREAM = (255, 248, 243)
DARK = (30, 30, 36)
WHITE = (255, 255, 255)
GRAY = (120, 116, 120)
ACCENTS = [(255, 200, 87), (92, 201, 167), (91, 141, 239), (155, 123, 234), CORAL]

_fonts = {}


def font(weight, size):
    key = (weight, size)
    if key not in _fonts:
        _fonts[key] = ImageFont.truetype(f"fonts/Pretendard-{weight}.ttf", size)
    return _fonts[key]


EMOJI_FONT = ImageFont.truetype("/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf", 109)
_emoji = {}


def emoji(ch, size):
    key = (ch, size)
    if key not in _emoji:
        im = Image.new("RGBA", (160, 160), (0, 0, 0, 0))
        ImageDraw.Draw(im).text((80, 80), ch, font=EMOJI_FONT, anchor="mm", embedded_color=True)
        im = im.crop(im.getbbox())
        r = size / max(im.size)
        _emoji[key] = im.resize((max(1, int(im.width * r)), max(1, int(im.height * r))), Image.LANCZOS)
    return _emoji[key]


# ---------- 애니메이션 보조 함수 ----------
def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def prog(t, start, dur):
    return clamp((t - start) / dur)


def ease_out(x):
    return 1 - (1 - x) ** 3


def ease_in_out(x):
    return 4 * x ** 3 if x < 0.5 else 1 - (-2 * x + 2) ** 3 / 2


def ease_back(x):
    c1, c3 = 1.70158, 2.70158
    return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2


def lerp(a, b, x):
    return a + (b - a) * x


def mix(c1, c2, x):
    return tuple(int(lerp(a, b, x)) for a, b in zip(c1, c2))


def text(img, s, weight, size, center, color, alpha=1.0, scale=1.0):
    """가운데 정렬 텍스트. alpha/scale 애니메이션 지원."""
    if alpha <= 0.01 or scale <= 0.01:
        return
    f = font(weight, size)
    if scale == 1.0 and alpha >= 0.999:
        ImageDraw.Draw(img).text(center, s, font=f, fill=color, anchor="mm")
        return
    l, t, r, b = f.getbbox(s, anchor="mm")
    pad = 20
    layer = Image.new("RGBA", (r - l + pad * 2, b - t + pad * 2), (0, 0, 0, 0))
    ImageDraw.Draw(layer).text((-l + pad, -t + pad), s, font=f, fill=color + (int(255 * alpha),), anchor="mm")
    if scale != 1.0:
        layer = layer.resize((max(1, int(layer.width * scale)), max(1, int(layer.height * scale))), Image.BICUBIC)
    img.alpha_composite(layer, (int(center[0] - layer.width / 2), int(center[1] - layer.height / 2)))


def paste_center(img, im, center, alpha=1.0, scale=1.0):
    if alpha <= 0.01 or scale <= 0.01:
        return
    if scale != 1.0:
        im = im.resize((max(1, int(im.width * scale)), max(1, int(im.height * scale))), Image.BICUBIC)
    if alpha < 0.999:
        im = im.copy()
        im.putalpha(im.getchannel("A").point(lambda v: int(v * alpha)))
    img.alpha_composite(im, (int(center[0] - im.width / 2), int(center[1] - im.height / 2)))


def rounded(img, box, radius, fill, alpha=1.0):
    if alpha <= 0.01:
        return
    x0, y0, x1, y1 = [int(v) for v in box]
    layer = Image.new("RGBA", (x1 - x0 + 1, y1 - y0 + 1), (0, 0, 0, 0))
    ImageDraw.Draw(layer).rounded_rectangle((0, 0, x1 - x0, y1 - y0), radius, fill=fill + (int(255 * alpha),))
    img.alpha_composite(layer, (x0, y0))


def slide_in(t, start, dist=40, dur=0.6):
    p = ease_out(prog(t, start, dur))
    return p, (1 - p) * dist


# ---------- 배경용 떠다니는 점 ----------
random.seed(3)
DOTS = [
    dict(x=random.uniform(0, W), y=random.uniform(0, H), r=random.uniform(6, 22),
         c=random.choice(ACCENTS), sp=random.uniform(10, 35), ph=random.uniform(0, 6.28))
    for _ in range(26)
]


def floating_dots(img, t, alpha=1.0):
    d = ImageDraw.Draw(img)
    for o in DOTS:
        y = (o["y"] - o["sp"] * t) % (H + 60) - 30
        x = o["x"] + 18 * math.sin(t * 0.8 + o["ph"])
        c = mix(CREAM, o["c"], 0.55 * alpha)
        d.ellipse((x - o["r"], y - o["r"], x + o["r"], y + o["r"]), fill=c)


# ---------- 장면 ----------
def scene_intro(img, t):
    """0~4초: 누구나 마음속에 품은 이야기가 있다"""
    img.paste(CREAM, (0, 0, W, H))
    floating_dots(img, t, prog(t, 0, 1.0))
    a, dy = slide_in(t, 0.4)
    text(img, "누구나 하나쯤은", "Medium", 64, (W / 2, H / 2 - 60 + dy), GRAY, a)
    a, dy = slide_in(t, 1.4)
    text(img, "마음속에 품은 이야기가 있습니다", "ExtraBold", 92, (W / 2, H / 2 + 50 + dy), DARK, a)


WORDS = [("보드게임", "🎲"), ("그림책", "📚"), ("앨범", "🎵"), ("굿즈", "🧸")]


def scene_ideas(img, t):
    """4~8초: 만들고 싶은 게임, 책, 앨범, 굿즈… 그 시작을 함께할 사람들이 있다면?"""
    lt = t - 4
    img.paste(DARK, (0, 0, W, H))
    if lt < 2.0:
        i = min(3, int(lt / BEAT))
        word, em = WORDS[i]
        pop = ease_back(prog(lt, i * BEAT, 0.25))
        c = ACCENTS[i]
        text(img, "만들고 싶은", "Medium", 64, (W / 2, H / 2 - 170), (200, 196, 200))
        paste_center(img, emoji(em, 150), (W / 2, H / 2 - 20), 1.0, pop)
        text(img, word, "Black", 120, (W / 2, H / 2 + 150), c, 1.0, 0.8 + 0.2 * pop)
    else:
        a, dy = slide_in(lt, 2.1)
        text(img, "그 시작을", "Medium", 70, (W / 2, H / 2 - 70 + dy), (200, 196, 200), a)
        a, dy = slide_in(lt, 2.6)
        text(img, "함께할 사람들이 있다면?", "ExtraBold", 104, (W / 2, H / 2 + 50 + dy), WHITE, a)


def scene_brand(img, t):
    """8~12초: 텀블벅 로고 등장 (원형 와이프)"""
    lt = t - 8
    img.paste(DARK, (0, 0, W, H))
    rad = ease_in_out(prog(lt, 0, 0.5)) * math.hypot(W, H) / 2 + 1
    d = ImageDraw.Draw(img)
    d.ellipse((W / 2 - rad, H / 2 - rad, W / 2 + rad, H / 2 + rad), fill=CORAL)
    # 비트에 맞춰 퍼지는 링
    for k in range(4):
        p = prog(lt, 0.3 + k * 1.0, 1.0)
        if 0 < p < 1:
            rr = 200 + 700 * ease_out(p)
            col = mix(CORAL, WHITE, 0.35 * (1 - p))
            d.ellipse((W / 2 - rr, H / 2 - rr, W / 2 + rr, H / 2 + rr), outline=col, width=6)
    pop = ease_back(prog(lt, 0.35, 0.5))
    text(img, "텀블벅", "Black", 260, (W / 2, H / 2 - 40), WHITE, clamp(pop * 2), pop)
    a, dy = slide_in(lt, 1.2)
    text(img, "크리에이터를 위한 크라우드펀딩", "Bold", 56, (W / 2, H / 2 + 150 + dy), WHITE, a)


# 텀블벅 실제 카테고리명 기준
CATS = [("🎲", "보드게임·TRPG"), ("🎮", "디지털 게임"), ("📖", "웹툰·만화"), ("🧸", "캐릭터·굿즈"),
        ("📚", "출판"), ("🎵", "음악"), ("🎬", "영화·비디오"), ("🎭", "공연")]


def scene_categories(img, t):
    """12~20초: 창작의 모든 장르가 모이는 곳"""
    lt = t - 12
    img.paste(CREAM, (0, 0, W, H))
    floating_dots(img, t, 0.6)
    a, dy = slide_in(lt, 0.1)
    text(img, "창작의 모든 장르가 모이는 곳", "ExtraBold", 84, (W / 2, 170 + dy), DARK, a)
    cw, ch, gap = 360, 280, 40
    x0 = (W - (cw * 4 + gap * 3)) / 2
    y0 = 300
    for i, (em, name) in enumerate(CATS):
        p = prog(lt, 0.5 + i * BEAT / 2, 0.45)
        if p <= 0:
            continue
        s = ease_back(p)
        col, row = i % 4, i // 4
        # 비트마다 살짝 튀는 효과
        bounce = 6 * max(0.0, 1 - ((lt % BEAT) / 0.2)) if lt > 4.5 else 0
        cx = x0 + col * (cw + gap) + cw / 2
        cy = y0 + row * (ch + gap) + ch / 2 - bounce * (1 if (i + int(lt / BEAT)) % 2 else 0)
        w2, h2 = cw * s / 2, ch * s / 2
        rounded(img, (cx - w2, cy - h2 + 10, cx + w2, cy + h2 + 10), 36, mix(CREAM, DARK, 0.08), clamp(p * 2))
        rounded(img, (cx - w2, cy - h2, cx + w2, cy + h2), 36, WHITE, clamp(p * 2))
        rounded(img, (cx - w2, cy - h2, cx + w2, cy - h2 + 14 * s), 7, ACCENTS[i % 5], clamp(p * 2))
        paste_center(img, emoji(em, 110), (cx, cy - 30 * s), clamp(p * 2), s)
        text(img, name, "Bold", 40, (cx, cy + 90 * s), DARK, clamp(p * 2), s)
    a, dy = slide_in(lt, 5.0)
    text(img, "작은 아이디어부터 큰 도전까지", "Bold", 60, (W / 2, 960 + dy), CORAL, a)


STEPS = [("🚀", "창작자가", "프로젝트를 공개하고"),
         ("🙌", "후원자들이", "함께 응원하면"),
         ("🎁", "목표 금액을 달성했을 때", "결제되고 선물이 도착해요")]


def scene_how(img, t):
    """20~28초: 이렇게 진행돼요 + 달성률 게이지"""
    lt = t - 20
    img.paste(WHITE, (0, 0, W, H))
    a, dy = slide_in(lt, 0.1)
    text(img, "텀블벅은 이렇게 진행돼요", "ExtraBold", 80, (W / 2, 150 + dy), DARK, a)
    d = ImageDraw.Draw(img)
    xs = [W / 2 - 560, W / 2, W / 2 + 560]
    for i, (em, l1, l2) in enumerate(STEPS):
        st = 0.6 + i * 1.5
        p = prog(lt, st, 0.5)
        if p <= 0:
            continue
        s = ease_back(p)
        cx, cy = xs[i], 400
        if i > 0:  # 단계 사이 연결선
            q = ease_out(prog(lt, st - 0.4, 0.4))
            xa = xs[i - 1] + 130
            d.line((xa, cy, xa + (cx - 130 - xa) * q, cy), fill=mix(WHITE, CORAL, 0.5), width=6)
        r = 115 * s
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=mix(WHITE, CORAL, 0.14))
        paste_center(img, emoji(em, 120), (cx, cy), clamp(p * 2), s)
        rr = 26 * s
        d.ellipse((cx + 70 * s - rr, cy - 90 * s - rr, cx + 70 * s + rr, cy - 90 * s + rr), fill=CORAL)
        text(img, str(i + 1), "Black", 32, (cx + 70 * s, cy - 90 * s), WHITE, clamp(p * 2), s)
        a2, dy2 = slide_in(lt, st + 0.2)
        text(img, l1, "Medium", 42, (cx, 590 + dy2), GRAY, a2)
        text(img, l2, "Bold", 48, (cx, 650 + dy2), DARK, a2)

    # 달성률 게이지 (예시 연출)
    gp = prog(lt, 5.0, 2.0)
    if gp > 0:
        ga = clamp((lt - 4.8) * 3)
        bx0, bx1, by = 460, W - 460, 830
        rounded(img, (bx0, by - 22, bx1, by + 22), 22, (238, 234, 236), ga)
        pct = int(ease_in_out(gp) * 120)
        fill_w = (bx1 - bx0) * min(1.0, pct / 120)
        if fill_w > 44:
            rounded(img, (bx0, by - 22, bx0 + fill_w, by + 22), 22, CORAL, ga)
        # 100% 지점 표시
        x100 = bx0 + (bx1 - bx0) * 100 / 120
        d.line((x100, by - 40, x100, by + 40), fill=DARK, width=4)
        text(img, "목표 100%", "Bold", 30, (x100, by - 66), DARK, ga)
        text(img, f"{pct}% 달성", "Black", 58, (bx0 + 140, by - 80), CORAL, ga)
        sp = prog(lt, 6.8, 0.4)
        if sp > 0:
            s = ease_back(sp)
            paste_center(img, emoji("🎉", 90), (W / 2 - 230 * s, by + 110), 1.0, s)
            text(img, "펀딩 성공!", "Black", 76, (W / 2 + 60, by + 110), CORAL, 1.0, s)
            text(img, "※ 목표 금액에 미달하면 결제되지 않아요", "Medium", 30, (W / 2, H - 40), GRAY, clamp(sp * 2))


# 텀블벅 앱 구성을 본뜬 예시 화면 (실제 이미지·프로젝트 없이 직접 그림)
LIGHT = (243, 243, 245)
PURPLE = (150, 90, 220)
_masks = {}


def badge(d, x, y, u):
    """'좋은창작자' 배지. 오른쪽 끝 x좌표를 돌려줌"""
    f = font("Bold", int(10 * u))
    tw = d.textlength("◆좋은창작자", font=f)
    d.rounded_rectangle((x, y, x + tw + 10 * u, y + 18 * u), int(4 * u), fill=PURPLE)
    d.text((x + 5 * u, y + 9 * u), "◆좋은창작자", font=f, fill=WHITE, anchor="lm")
    return x + tw + 10 * u


def thumb(im, box, color, em, u):
    x0, y0, x1, y1 = [int(v) for v in box]
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((x0, y0, x1, y1), int(10 * u), fill=mix(WHITE, color, 0.45))
    paste_center(im, emoji(em, int(min(x1 - x0, y1 - y0) * 0.5)), ((x0 + x1) / 2, (y0 + y1) / 2))


def search_tabs(im, u, active):
    d = ImageDraw.Draw(im)
    w = im.width
    d.rounded_rectangle((12 * u, 12 * u, w - 52 * u, 48 * u), int(8 * u), fill=LIGHT)
    d.ellipse((24 * u, 23 * u, 36 * u, 35 * u), outline=GRAY, width=max(1, int(2 * u)))
    d.text((44 * u, 30 * u), "0에서 1을 만드는 사람들", font=font("Medium", int(13 * u)), fill=GRAY, anchor="lm")
    d.ellipse((w - 36 * u, 21 * u, w - 20 * u, 37 * u), outline=DARK, width=max(1, int(2 * u)))
    d.ellipse((w - 22 * u, 18 * u, w - 16 * u, 24 * u), fill=CORAL)
    x = 16 * u
    for name in ["홈", "상시판매", "공개예정", "신규", "마감임박"]:
        on = name == active
        f = font("Bold" if on else "Medium", int(13 * u))
        tw = d.textlength(name, font=f)
        d.text((x, 76 * u), name, font=f, fill=DARK if on else GRAY, anchor="lm")
        if on:
            d.rectangle((x, 92 * u, x + tw, 94 * u), fill=DARK)
        x += tw + 20 * u
    d.line((0, 95 * u, w, 95 * u), fill=LIGHT, width=max(1, int(u)))


def bottom_nav(im, u):
    d = ImageDraw.Draw(im)
    w, h = im.size
    y = h - 46 * u
    d.rectangle((0, y, w, h), fill=WHITE)
    d.line((0, y, w, y), fill=LIGHT, width=max(1, int(u)))
    for i, name in enumerate(["홈", "카테고리", "관심목록", "후원목록", "내 정보"]):
        cx = w * (i + 0.5) / 5
        c = CORAL if i == 0 else GRAY
        d.rounded_rectangle((cx - 8 * u, y + 9 * u, cx + 8 * u, y + 24 * u), int(3 * u), outline=c,
                            fill=c if i == 0 else None, width=max(1, int(2 * u)))
        d.text((cx, y + 35 * u), name, font=font("Medium", int(9 * u)), fill=c, anchor="mm")


HOME_ITEMS = [("🎲", "보드게임 공방", "모험가의 첫 번째 지도", 1326, True),
              ("🎨", "일러스트 작업실", "사계절 일러스트 엽서북", 252, False),
              ("☕", "도예 스튜디오", "손으로 빚은 머그컵", 418, True)]


def ui_home(w, h, lt):
    u = w / 360
    im = Image.new("RGBA", (w, h), WHITE + (255,))
    d = ImageDraw.Draw(im)
    search_tabs(im, u, "홈")
    # 배너
    d.rectangle((0, 96 * u, w, 226 * u), fill=(34, 30, 60))
    paste_center(im, emoji("🌙", int(60 * u)), (80 * u, 161 * u))
    d.text((150 * u, 145 * u), "이번 주 기획전", font=font("Medium", int(13 * u)), fill=(210, 205, 230), anchor="lm")
    d.text((150 * u, 172 * u), "상상이 현실이 되는 곳", font=font("ExtraBold", int(18 * u)), fill=WHITE, anchor="lm")
    # 바로가기 아이콘
    for i, (em, name) in enumerate([("🆕", "바로 득템"), ("💍", "주얼리"), ("🎮", "이달의 게임"), ("📦", "체험단")]):
        cx = w * (i + 0.5) / 4
        d.rounded_rectangle((cx - 26 * u, 238 * u, cx + 26 * u, 290 * u), int(14 * u), fill=LIGHT)
        paste_center(im, emoji(em, int(28 * u)), (cx, 264 * u))
        d.text((cx, 304 * u), name, font=font("Medium", int(10 * u)), fill=DARK, anchor="mm")
    d.text((14 * u, 338 * u), "인기 프로젝트", font=font("ExtraBold", int(17 * u)), fill=DARK, anchor="lm")
    d.text((w - 14 * u, 338 * u), "전체보기", font=font("Medium", int(11 * u)), fill=GRAY, anchor="rm")
    for k, (em, maker, title, pct, good) in enumerate(HOME_ITEMS):
        y = 360 * u + k * 92 * u
        thumb(im, (14 * u, y, 94 * u, y + 80 * u), ACCENTS[k], em, u)
        d.rounded_rectangle((14 * u, y, 32 * u, y + 18 * u), int(4 * u), fill=CORAL)
        d.text((23 * u, y + 9 * u), str(k + 1), font=font("Bold", int(11 * u)), fill=WHITE, anchor="mm")
        d.text((106 * u, y + 10 * u), maker + " ›", font=font("Bold", int(11 * u)), fill=DARK, anchor="lm")
        d.text((106 * u, y + 30 * u), title, font=font("Medium", int(13 * u)), fill=DARK, anchor="lm")
        if good:
            badge(d, 106 * u, y + 42 * u, u)
        cur = int(pct * ease_out(prog(lt, 0.8 + k * 0.2, 1.5)))
        d.text((106 * u, y + 72 * u), f"{cur:,}% 달성", font=font("ExtraBold", int(15 * u)), fill=CORAL, anchor="lm")
    bottom_nav(im, u)
    return im


def ui_project(w, h, lt):
    u = w / 360
    im = Image.new("RGBA", (w, h), WHITE + (255,))
    d = ImageDraw.Draw(im)
    d.text((16 * u, 26 * u), "←", font=font("Bold", int(20 * u)), fill=DARK, anchor="lm")
    d.text((48 * u, 26 * u), "모험가의 첫 번째 지도", font=font("Bold", int(16 * u)), fill=DARK, anchor="lm")
    top, bot = 52 * u, 300 * u
    for yy in range(int(top), int(bot)):  # 따뜻한 그라데이션 배경
        d.line((0, yy, w, yy), fill=mix((255, 214, 170), (240, 140, 110), (yy - top) / (bot - top)))
    paste_center(im, emoji("🎲", int(110 * u)), (w / 2 - 40 * u, 176 * u))
    paste_center(im, emoji("🗺️", int(80 * u)), (w / 2 + 70 * u, 200 * u))
    x = badge(d, 16 * u, 314 * u, u)
    d.text((x + 8 * u, 323 * u), "보드게임 공방 ›", font=font("Medium", int(12 * u)), fill=GRAY, anchor="lm")
    d.text((16 * u, 356 * u), "모험가의 첫 번째 지도", font=font("ExtraBold", int(20 * u)), fill=DARK, anchor="lm")
    d.text((16 * u, 386 * u), "직접 만든 세계와 영웅들의 이야기를", font=font("Medium", int(12 * u)), fill=GRAY, anchor="lm")
    d.text((16 * u, 404 * u), "보드게임으로 만나보세요.", font=font("Medium", int(12 * u)), fill=GRAY, anchor="lm")
    p = ease_out(prog(lt, 0.9, 2.2))
    d.text((16 * u, 436 * u), "모인금액", font=font("Medium", int(12 * u)), fill=DARK, anchor="lm")
    d.text((190 * u, 436 * u), "후원자", font=font("Medium", int(12 * u)), fill=DARK, anchor="lm")
    d.text((16 * u, 466 * u), f"{int(12480000 * p):,}원", font=font("ExtraBold", int(24 * u)), fill=CORAL, anchor="lm")
    d.text((190 * u, 466 * u), f"{int(386 * p):,}명", font=font("ExtraBold", int(24 * u)), fill=DARK, anchor="lm")
    d.rounded_rectangle((14 * u, 494 * u, w - 14 * u, 560 * u), int(10 * u), outline=LIGHT, width=max(1, int(2 * u)))
    for i, (k, v) in enumerate([("달성률", f"{int(1248 * p):,}%"), ("남은 기간", "5일"), ("유형", "펀딩")]):
        cx = 14 * u + (w - 28 * u) * (i + 0.5) / 3
        d.text((cx, 512 * u), k, font=font("Medium", int(11 * u)), fill=GRAY, anchor="mm")
        d.text((cx, 538 * u), v, font=font("Bold", int(14 * u)), fill=DARK, anchor="mm")
    y = h - 60 * u
    d.line((0, y, w, y), fill=LIGHT, width=max(1, int(u)))
    paste_center(im, emoji("🤍", int(22 * u)), (34 * u, y + 30 * u))
    d.rounded_rectangle((110 * u, y + 10 * u, w - 14 * u, y + 50 * u), int(8 * u), fill=DARK)
    d.text(((110 * u + w - 14 * u) / 2, y + 30 * u), "후원하기", font=font("Bold", int(15 * u)), fill=WHITE, anchor="mm")
    return im


UPCOMING = [("🍫", "디저트 연구소", "수제 초콜릿 케이크", 137, True), ("🩴", "생활 잡화점", "귀여운 새 슬리퍼", 480, True),
            ("👛", "가죽 공방", "원탭 카드지갑", 341, False), ("💍", "주얼리 작업실", "나를 지키는 반지", 46, False),
            ("📓", "문구 브랜드", "스트립 다이어리", 22, False), ("📚", "독서 굿즈", "책갈피 독서대", 251, False)]


def ui_upcoming(w, h, lt):
    u = w / 360
    im = Image.new("RGBA", (w, h), WHITE + (255,))
    d = ImageDraw.Draw(im)
    search_tabs(im, u, "공개예정")
    d.rectangle((0, 96 * u, w, 170 * u), fill=(20, 20, 24))
    d.text((16 * u, 120 * u), "원하는 선물을 미리 선점해 보세요", font=font("Medium", int(11 * u)), fill=(210, 210, 215), anchor="lm")
    d.text((16 * u, 146 * u), "오픈런 신청하기", font=font("ExtraBold", int(18 * u)), fill=WHITE, anchor="lm")
    d.text((w - 18 * u, 134 * u), "오픈런", font=font("Black", int(26 * u)), fill=WHITE, anchor="rm")
    d.rounded_rectangle((14 * u, 184 * u, 84 * u, 210 * u), int(13 * u), outline=LIGHT, width=max(1, int(2 * u)))
    d.text((49 * u, 197 * u), "추천순", font=font("Medium", int(11 * u)), fill=DARK, anchor="mm")
    cw = (w - 14 * u * 2 - 10 * u * 2) / 3
    for i, (em, maker, title, n, good) in enumerate(UPCOMING):
        col, row = i % 3, i // 3
        x = 14 * u + col * (cw + 10 * u)
        y = 222 * u + row * 200 * u
        thumb(im, (x, y, x + cw, y + cw), ACCENTS[(i + 1) % 5], em, u)
        d.ellipse((x + cw - 22 * u, y + cw - 22 * u, x + cw - 6 * u, y + cw - 6 * u), fill=CORAL)
        d.text((x, y + cw + 12 * u), maker + " ›", font=font("Bold", int(10 * u)), fill=DARK, anchor="lm")
        d.text((x, y + cw + 28 * u), title, font=font("Medium", int(10 * u)), fill=DARK, anchor="lm")
        yy = y + cw + 38 * u
        if good:
            badge(d, x, yy, u * 0.85)
            yy += 20 * u
        cur = int(n * ease_out(prog(lt, 0.6 + i * 0.1, 1.5)))
        d.text((x, yy + 10 * u), f"{cur}명 알림신청 중", font=font("ExtraBold", int(11 * u)), fill=CORAL, anchor="lm")
    bottom_nav(im, u)
    return im


def phone(screen):
    """그린 화면을 휴대폰 모양(둥근 검정 테두리)으로 감쌈"""
    sw, sh = screen.size
    if screen.size not in _masks:
        m = Image.new("L", (sw, sh), 0)
        ImageDraw.Draw(m).rounded_rectangle((0, 0, sw - 1, sh - 1), 30, fill=255)
        _masks[screen.size] = m
    im = Image.new("RGBA", (sw + 28, sh + 28), (0, 0, 0, 0))
    ImageDraw.Draw(im).rounded_rectangle((0, 0, sw + 27, sh + 27), 44, fill=(22, 22, 26, 255))
    im.paste(screen, (14, 14), _masks[screen.size])
    return im


APP = [(ui_home, "지금 뜨는 인기 프로젝트"), (ui_project, "모인 금액과 후원자를 한눈에"),
       (ui_upcoming, "공개 전 미리 알림신청")]


def scene_app(img, t):
    """28~34초: 텀블벅 앱 화면 (앱 구성을 본뜬 예시)"""
    lt = t - 28
    img.paste(CREAM, (0, 0, W, H))
    floating_dots(img, t, 0.5)
    a, dy = slide_in(lt, 0.1)
    text(img, "앱에서 매일 만나는 새로운 도전", "ExtraBold", 68, (W / 2, 100 + dy), DARK, a)
    xs = [W / 2 - 560, W / 2, W / 2 + 560]
    for i, (ui, cap) in enumerate(APP):
        p = ease_out(prog(lt, 0.4 + i * 0.35, 0.7))
        if p <= 0:
            continue
        big = i == 1
        h = 780 if big else 700
        sh = h - 28
        cy = (545 if big else 560) + (1 - p) * 300
        paste_center(img, phone(ui(int(sh * 0.5), sh, lt)), (xs[i], cy), clamp(p * 1.5))
        text(img, cap, "Bold", 36, (xs[i], 990 + (1 - p) * 300), DARK, clamp(p * 1.5))
    text(img, "※ 화면은 이해를 돕기 위한 예시입니다", "Medium", 26, (W / 2, H - 30), GRAY, clamp((lt - 1.0) * 2))


# 출처: 텀블벅 발표(2026.8.18 보도, 2026년 6월 29일 기준), 88억 원은 2024.11 보도
STATS = [(5000, "{:,}억 원+", "누적 펀딩 금액"),
         (8, "약 {}만 개", "진행된 프로젝트"),
         (1000, "{:,}만 건+", "누적 후원")]


def scene_stats(img, t):
    """34~40초: 숫자로 보는 텀블벅"""
    lt = t - 34
    img.paste(DARK, (0, 0, W, H))
    a, dy = slide_in(lt, 0.1)
    text(img, "숫자로 보는 텀블벅", "ExtraBold", 72, (W / 2, 190 + dy), WHITE, a)
    xs = [W / 2 - 580, W / 2, W / 2 + 580]
    for i, (val, fmt, label) in enumerate(STATS):
        st = 0.5 + i * 1.0
        p = prog(lt, st, 1.2)
        if p <= 0:
            continue
        s = ease_back(prog(lt, st, 0.4))
        cur = round(val * ease_out(p))
        cx, cy = xs[i], 470
        rounded(img, (cx - 270, cy - 150, cx + 270, cy + 150), 40, (48, 48, 56), clamp(p * 3))
        text(img, fmt.format(cur), "Black", 74, (cx, cy - 20), ACCENTS[(i + 4) % 5] if i == 0 else ACCENTS[i - 1],
             clamp(p * 3), s)
        text(img, label, "Medium", 40, (cx, cy + 80), (200, 196, 200), clamp(p * 3))
    p = ease_back(prog(lt, 3.6, 0.5))
    if p > 0:
        text(img, "역대 최고 펀딩 기록", "Medium", 44, (W / 2 - 170, 780), (200, 196, 200), clamp(p * 2))
        text(img, "88억 원", "Black", 96, (W / 2 + 260, 775), CORAL, clamp(p * 2), p)
    text(img, "※ 누적 수치는 2026년 6월 29일 기준 텀블벅 발표, 최고 기록은 2024년 11월 프로젝트", "Medium", 30, (W / 2, H - 60), GRAY,
         clamp((lt - 1.0) * 2))


# 하트 모양 좌표 (후원자 점들이 모여 하트를 이룸)
random.seed(11)
HEART = []
for k in range(140):
    u = k / 140 * 2 * math.pi
    hx = 16 * math.sin(u) ** 3
    hy = -(13 * math.cos(u) - 5 * math.cos(2 * u) - 2 * math.cos(3 * u) - math.cos(4 * u))
    HEART.append((hx * 17, hy * 17 - 10,
                  random.uniform(-200, W + 200), random.choice([-100, H + 100]) + random.uniform(-200, 200),
                  random.choice(ACCENTS[:4] + [WHITE]), random.uniform(0, 0.8)))


def scene_together(img, t):
    """40~46초: 혼자라면 어려운 일도, 함께라면 현실이 됩니다"""
    lt = t - 40
    img.paste(CORAL, (0, 0, W, H))
    d = ImageDraw.Draw(img)
    cx, cy = W / 2, H / 2 - 110
    beat = max(0.0, 1 - ((lt % BEAT) / 0.25)) if lt > 3.0 else 0
    pulse = 1 + 0.05 * beat
    for hx, hy, sx, sy, c, delay in HEART:
        p = ease_in_out(prog(lt, 0.2 + delay, 2.0))
        x = lerp(sx, cx + hx * pulse, p)
        y = lerp(sy, cy + hy * pulse, p)
        r = 11
        d.ellipse((x - r, y - r, x + r, y + r), fill=c)
    a, dy = slide_in(lt, 1.8)
    text(img, "혼자라면 어려운 일도", "Bold", 64, (W / 2, 800 + dy), WHITE, a)
    a, dy = slide_in(lt, 2.8)
    text(img, "함께라면 현실이 됩니다", "Black", 96, (W / 2, 910 + dy), WHITE, a)


def scene_end(img, t):
    """46~52초: 엔딩 카드"""
    lt = t - 46
    img.paste(CREAM, (0, 0, W, H))
    floating_dots(img, t, 0.7)
    pop = ease_back(prog(lt, 0.05, 0.5))
    text(img, "텀블벅", "Black", 210, (W / 2, H / 2 - 150), CORAL, clamp(pop * 2), pop)
    a, dy = slide_in(lt, 0.7)
    text(img, "0에서 1을 만드는 사람들", "Bold", 64, (W / 2, H / 2 + 10 + dy), DARK, a)
    p = ease_back(prog(lt, 1.5, 0.5))
    if p > 0:
        bw, bh = 520 * p, 110 * p
        by = H / 2 + 190
        rounded(img, (W / 2 - bw / 2, by - bh / 2, W / 2 + bw / 2, by + bh / 2), int(55 * p), CORAL, clamp(p * 2))
        text(img, "tumblbug.com", "ExtraBold", 54, (W / 2, by), WHITE, clamp(p * 2), p)
    a, dy = slide_in(lt, 2.2)
    text(img, "지금, 첫 프로젝트를 시작해 보세요", "Medium", 46, (W / 2, H / 2 + 330 + dy), GRAY, a)


SCENES = [(0, scene_intro), (4, scene_ideas), (8, scene_brand), (12, scene_categories),
          (20, scene_how), (28, scene_app), (34, scene_stats), (40, scene_together), (46, scene_end)]


def render(t):
    img = Image.new("RGBA", (W, H), CREAM + (255,))
    for start, fn in reversed(SCENES):
        if t >= start:
            fn(img, t)
            break
    img = img.convert("RGB")
    # 시작·끝 페이드
    fade = clamp(t / 0.4) * clamp((DUR - t) / 0.8)
    if fade < 1:
        img = Image.blend(Image.new("RGB", (W, H), (0, 0, 0)), img, fade)
    return img


def main():
    ff = imageio_ffmpeg.get_ffmpeg_exe()
    cmd = [ff, "-y", "-loglevel", "error",
           "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
           "-i", "music.wav",
           "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart",
           "tumblbug_intro.mp4"]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    total = int(DUR * FPS)
    for i in range(total):
        proc.stdin.write(render(i / FPS).tobytes())
        if i % 150 == 0:
            print(f"{i}/{total} 프레임", flush=True)
    proc.stdin.close()
    proc.wait()
    print("tumblbug_intro.mp4 생성 완료")


if __name__ == "__main__":
    main()
