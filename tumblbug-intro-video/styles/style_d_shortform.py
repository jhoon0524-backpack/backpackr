"""시안 D — 세로형 숏폼 '후원 알림 피드' (16초, 9:16)
릴스·쇼츠용. 후원 알림이 쉴 새 없이 쌓이며 달성률 링이 차오르는 '사회적 증거' 스타일
※ 알림 속 이름·금액·달성률은 모두 가상의 예시
"""
import math

from PIL import Image, ImageDraw

import synth as S
from common import CORAL, CREAM, DARK, GRAY, WHITE, clamp, ease_back, ease_out, emoji, encode, font, mix, \
    paste_center, prog, storyboard, text

W, H, DUR = 1080, 1920, 16.0
B = 60 / 100
NIGHT = (24, 22, 30)

NAMES = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임", "한", "오", "서", "신", "권", "황"]
REWARDS = ["얼리버드 세트", "기본 세트", "풀 패키지", "디럭스 에디션", "스티커 팩", "한정판 세트"]
NOTI = []
_t, _dt = 2.6, 0.5
while _t < 9.2:  # 알림 간격이 점점 빨라짐
    NOTI.append(_t)
    _dt = max(0.1, _dt * 0.86)
    _t += _dt
FINAL_PCT = 248
T100 = NOTI[math.ceil(len(NOTI) * 100 / FINAL_PCT) - 1]


def rounded(img, box, r, fill, alpha=1.0):
    x0, y0, x1, y1 = [int(v) for v in box]
    if x1 - x0 < 2 or y1 - y0 < 2:  # 튀어나오는 효과로 크기가 0 이하가 되는 순간은 건너뜀
        return
    lay = Image.new("RGBA", (x1 - x0, y1 - y0), (0, 0, 0, 0))
    ImageDraw.Draw(lay).rounded_rectangle((0, 0, x1 - x0 - 1, y1 - y0 - 1), r, fill=fill + (int(255 * alpha),))
    img.alpha_composite(lay, (x0, y0))


def caption(img, lines, t0, t, y0):
    """숏폼식 큰 자막: 줄마다 비트에 맞춰 튀어나옴. (글자, 강조여부)"""
    for i, (s, hl) in enumerate(lines):
        p = ease_back(prog(t, t0 + i * B, 0.3))
        if p <= 0:
            continue
        y = y0 + i * 150
        if hl:
            f = font("Black", 104)
            w = f.getlength(s) + 60
            rounded(img, (W / 2 - w / 2 * p, y - 70 * p, W / 2 + w / 2 * p, y + 70 * p), 24, CORAL, clamp(p * 2))
        text(img, s, "Black", 104, (W / 2, y), WHITE, clamp(p * 2), p)


def ring(img, cx, cy, r, pct, bg):
    d = ImageDraw.Draw(img)
    d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=mix(bg, WHITE, 0.15), width=34)
    ang = 360 * min(pct, 100) / 100
    if ang > 0:
        d.arc((cx - r, cy - r, cx + r, cy + r), -90, -90 + ang, fill=WHITE if pct >= 100 else CORAL, width=34)
    if pct > 100:  # 100% 넘으면 두 번째 바퀴는 노란색
        d.arc((cx - r + 44, cy - r + 44, cx + r - 44, cy + r - 44), -90, -90 + 360 * (pct - 100) / 100 % 360
              if pct < 200 else 270, fill=(255, 210, 90), width=18)
        if pct >= 200:
            d.ellipse((cx - r + 44, cy - r + 44, cx + r - 44, cy + r - 44), outline=(255, 210, 90), width=18)
    text(img, f"{int(pct)}%", "Black", 96, (cx, cy - 14), WHITE)
    text(img, "달성", "Bold", 46, (cx, cy + 72), mix(WHITE, bg, 0.3))


def noti_card(img, y, i, alpha, scale):
    cw, ch = 940 * scale, 150 * scale
    x0 = W / 2 - cw / 2
    rounded(img, (x0, y, x0 + cw, y + ch), int(34 * scale), WHITE, alpha)
    d = ImageDraw.Draw(img)
    r = 44 * scale
    cx, cy = x0 + 40 * scale + r, y + ch / 2
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=mix(WHITE, CORAL, alpha))
    if alpha > 0.5:
        paste_center(img, emoji("🔔", int(48 * scale)), (cx, cy))
    name = NAMES[i % len(NAMES)] + "** 님"
    reward = REWARDS[(i * 7) % len(REWARDS)]
    tx = x0 + 150 * scale
    col = mix(WHITE, DARK, alpha)
    d.text((tx, y + 50 * scale), "새 후원이 도착했어요", font=font("ExtraBold", int(40 * scale)), fill=col, anchor="lm")
    d.text((tx, y + 104 * scale), f"{name}이 '{reward}'를 후원했어요", font=font("Medium", int(32 * scale)),
           fill=mix(WHITE, GRAY, alpha), anchor="lm")
    d.text((x0 + cw - 34 * scale, y + 50 * scale), "방금", font=font("Medium", int(28 * scale)),
           fill=mix(WHITE, GRAY, alpha), anchor="rm")


def render(t):
    if t < 2.4:  # 훅: 첫 2초에 시선 잡기
        img = Image.new("RGBA", (W, H), NIGHT + (255,))
        caption(img, [("혼자 만든 보드게임,", False), ("오픈 첫날", True), ("알림이 멈추지 않았다", False)], 0.1, t, 760)
        text(img, "※ 예시 상황", "Medium", 34, (W / 2, 1300), GRAY, clamp((t - 1.5) * 3))
        return img
    if t < 9.6:  # 알림 피드 + 달성률 링
        k = clamp((t - T100) / 0.5)
        bg = mix(NIGHT, CORAL, k)
        img = Image.new("RGBA", (W, H), bg + (255,))
        shown = [a for a in NOTI if a <= t]
        pct = FINAL_PCT * len(shown) / len(NOTI)
        text(img, "내 프로젝트 펀딩 현황", "Bold", 48, (W / 2, 250), mix(WHITE, bg, 0.2))
        ring(img, W / 2, 560, 230, pct, bg)
        if t >= T100:
            p = ease_back(prog(t, T100, 0.4))
            rounded(img, (W / 2 - 250 * p, 840 - 50 * p, W / 2 + 250 * p, 840 + 50 * p), 50, DARK, clamp(p * 2))
            paste_center(img, emoji("🎉", max(1, int(56 * p))), (W / 2 - 150 * p, 840))
            text(img, "목표 달성!", "Black", 50, (W / 2 + 40, 840), WHITE, clamp(p * 2), p)
        top = 960
        for j, a in enumerate(reversed(shown[-7:])):  # 새 알림이 위로, 이전 알림은 아래로 밀림
            newer = shown[len(shown) - j:]
            y = top + sum(ease_out(prog(t, b, 0.25)) for b in newer) * 170
            if y > H - 120:
                continue
            p = ease_out(prog(t, a, 0.25))
            noti_card(img, y, NOTI.index(a), clamp(p * 1.5), 0.9 + 0.1 * p)
        return img
    if t < 12.0:  # 이런 일이 매일
        img = Image.new("RGBA", (W, H), NIGHT + (255,))
        lt = t - 9.6
        caption(img, [("이런 일이", False), ("매일 일어나는 곳", True)], 0.0, lt, 560)
        chips = [("누적 펀딩", "5,000억 원+"), ("누적 후원", "1,000만 건+"), ("진행된 프로젝트", "약 8만 개")]
        for i, (k_, v) in enumerate(chips):
            p = ease_back(prog(lt, 0.9 + i * 0.3, 0.35))
            if p <= 0:
                continue
            y = 960 + i * 190
            rounded(img, (W / 2 - 420 * p, y - 75 * p, W / 2 + 420 * p, y + 75 * p), 40, (44, 42, 52), clamp(p * 2))
            text(img, k_, "Medium", 40, (W / 2 - 200, y), (190, 188, 196), clamp(p * 2), p)
            text(img, v, "Black", 60, (W / 2 + 150, y), CORAL, clamp(p * 2), p)
        text(img, "2026년 6월 29일 기준, 텀블벅 발표", "Medium", 30, (W / 2, 1560), GRAY, clamp((lt - 1.6) * 3))
        return img
    img = Image.new("RGBA", (W, H), CREAM + (255,))  # 엔딩
    lt = t - 12.0
    p = ease_back(prog(lt, 0.05, 0.5))
    text(img, "텀블벅", "Black", 230, (W / 2, 760), CORAL, clamp(p * 2), p)
    a = clamp((lt - 0.5) * 3)
    text(img, "0에서 1을 만드는", "ExtraBold", 80, (W / 2, 960), DARK, a)
    text(img, "사람들", "ExtraBold", 80, (W / 2, 1060), DARK, a)
    q = ease_back(prog(lt, 1.1, 0.4))
    if q > 0:
        bob = 8 * math.sin(lt * 6) if lt > 1.6 else 0
        rounded(img, (W / 2 - 380 * q, 1230 - 70 * q + bob, W / 2 + 380 * q, 1230 + 70 * q + bob), 70, CORAL, clamp(q * 2))
        text(img, "지금 프로젝트 시작하기 →", "ExtraBold", 50, (W / 2, 1230 + bob), WHITE, clamp(q * 2), q)
    text(img, "tumblbug.com", "Bold", 44, (W / 2, 1380), GRAY, clamp((lt - 1.5) * 3))
    return img


def music():
    tr = S.Track(DUR)
    chords = [[62, 65, 69], [58, 62, 65], [53, 57, 60], [60, 64, 67]]  # Dm B♭ F C
    roots = [38, 34, 41, 36]
    beats = int(DUR / B) + 1
    for b in range(beats):
        t0 = b * B
        ci = (b // 4) % 4
        ch = chords[ci]
        if t0 >= 12.0:
            continue
        for k in range(2):  # 플럭 아르페지오
            tr.add(S.bell(ch[(b * 2 + k) % 3] + 12, 0.6, 7), t0 + k * B / 2, 0.18, (-0.35, 0.35)[k])
        if t0 >= 2.4:
            if b % 2 == 0:
                tr.add(S.kick(100, 9), t0, 0.8)
            else:
                tr.add(S.clap(), t0, 0.3)
            tr.add(S.hat(), t0 + B / 2, 0.2, 0.3)
            tr.add(S.bass(roots[ci], B * 0.9, 1.8, 2.5), t0, 0.45)
        if b % 4 == 0:
            tr.add(S.pad(ch, 4 * B, 1200), t0, 0.3)
    for a in NOTI:  # 알림 '띵' 소리
        tr.add(S.bell(88, 0.25, 12), a, 0.08)
        tr.add(S.bell(93, 0.3, 12), a + 0.06, 0.07)
    tr.add(S.riser(1.2), T100 - 1.2, 0.3)
    tr.add(S.kick(150, 5), T100, 0.9)
    tr.add(S.kick(150, 5), 12.0, 0.9)  # 엔딩
    tr.add(S.pad([62, 65, 69, 74], 4.0, 2000), 12.0, 0.5)
    tr.add(S.bass(38, 3.0, 1.5, 1.0), 12.0, 0.45)
    tr.save("styles/samples/d.wav", fade_out=1.5)


if __name__ == "__main__":
    import os
    os.makedirs("styles/samples", exist_ok=True)
    music()
    storyboard(render, [(2.0, "훅: 첫 2초 자막"), (4.6, "알림이 쌓이기 시작"), (T100 + 0.6, "100% 목표 달성"),
                        (9.3, "248% 달성 (예시)"), (11.6, "실제 누적 수치"), (15.0, "엔딩 + 행동 유도 버튼")],
               "시안 D · 세로형 숏폼 (릴스·쇼츠)",
               ["후원 알림이 쉴 새 없이 쌓이며 달성률 링이 차오르는 9:16 세로 영상 (알림 속 이름·금액은 가상 예시)",
                "톤: 속도감·기대감 | 음악: 경쾌한 팝 | 추천 용도: 인스타 릴스, 유튜브 쇼츠, 틱톡 광고"],
               "D_shortform_storyboard.jpg", vertical=True)
    encode(render, W, H, DUR, "styles/samples/d.wav", "D_shortform.mp4")
