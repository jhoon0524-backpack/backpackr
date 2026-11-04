# B4 (2026-11-04 오너 지시 "그냥 너가 그려봐"): python3 -I tools/ai-pilot/b4.py <ai-sprite-pilot 폴더> <출력 폴더>
#  몸을 써서 베는 준비·1타 — B3(팔만 움직임)와 달리 몸 전체를 움직인다. Claude 가 그린 것 (사람 도트 작가·AI 새 생성 아님).
#  ① 원본 크기(AI 서기, 칼집 검은·남청색 판 docs/ai-pilot/b4-request/ref-idle-dark-scabbard.png)에서 두 팔·칼자루·칼집을 지우고
#  ② 허리선 위(머리·상체·어깨 망토)는 허리를 축으로 기울이고 옮김, 허리선 아래(도포·다리·망토 자락)는 줄마다 가로로 늘여
#     앞발 내딛기·뒷발·도포 자락·망토 휘날림을 만듦 (아래로 갈수록 크게), 무릎 굽힘만큼 허리선을 내림
#  ③ B3 와 같은 배율·팔레트로 2px, 기준점은 서기 기준점을 세 칸에 그대로 (뒷발이 땅에 붙어 있음)
#  ④ 팔(소매·팔토시·손)·칼(B3 와 같은 벽사검 함수)·칼집(검은·남청 + 금속 장식 금색)은 2px 에서 그림. 이펙트 없음 (게임 JS 이펙트)
#  출력: mugyeom-ai-b4.png (64×64 칸 × 3: 서기, 준비, 1타), report-b4.json
import sys, os, json, math, runpy, tempfile
from PIL import Image
import numpy as np

SRC, OUT = sys.argv[1], sys.argv[2]; os.makedirs(OUT, exist_ok=True)
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..', '..')
argv = sys.argv; sys.argv = [os.path.join(HERE, 'b3.py'), SRC, tempfile.mkdtemp()]
G = runpy.run_path(os.path.join(HERE, 'b3.py')); sys.argv = argv            # B3 의 팔레트·정리·외곽선·칼 함수를 그대로 씀 (B3 출력은 임시 폴더로)
CELL, FOOTX, SOLE, scale = G['CELL'], G['FOOTX'], G['SOLE'], G['scale']
PAL, nearest, sample_mode, clean, outline, put, K, DARK, WHITE, GREY, BRACER, STEEL, pc, lum, sword = (G[k] for k in
    ('PAL', 'nearest', 'sample_mode', 'clean', 'outline', 'put', 'K', 'DARK', 'WHITE', 'GREY', 'BRACER', 'STEEL', 'pc', 'lum', 'sword'))
TIP = (G['TIP_CELL'], 44)                                  # 1타 칼끝 칸 (59,44): 앞 56px, 높이 31px (B3 와 같음)
BLADE = 23.4                                               # 칼날 길이(칸) — B3 1타 46.9px 와 같게

src = np.array(Image.open(os.path.join(ROOT, 'docs', 'ai-pilot', 'b4-request', 'ref-idle-dark-scabbard.png')).convert('RGBA')).astype(np.int32)
mi = G['main_mask'](src); FX, FY = G['feet_center'](mi)    # 서기 기준점 (B3 와 같은 식) — 세 칸 모두 이 점으로 놓음
H0, W0 = src.shape[:2]; OX, OY = 130, 40                    # 원본 → 넓힌 캔버스 (망토·앞발이 나갈 자리)
WAIST = 150; PIV = (125, 150)                              # 허리선(띠 아래)·상체 회전축 (원본 좌표)

def poly_mask(pts, shape):
    from PIL import ImageDraw
    im = Image.new('L', (shape[1], shape[0]), 0); ImageDraw.Draw(im).polygon(pts, fill=1); return np.array(im, bool)
med = lambda a, box: np.median(a[box[1]:box[3], box[0]:box[2]][a[box[1]:box[3], box[0]:box[2], 3] > 0][:, :4], axis=0).astype(np.int32)
CAPE_SRC = med(src, (15, 205, 45, 245)); ROBE_SRC = med(src, (165, 225, 180, 245))   # 망토(검정)·도포(남청) 바탕색

def strip_arms(a, scab=True, arms=True):
    """두 팔·칼자루(·칼집) 지우기: 앞팔 자리는 망토/도포색, 뒷팔 자리는 도포 앞끝 안쪽만 도포색·바깥은 투명.
    arms=False 면 팔은 두고 칼자루·칼집만 (걷기·점프·맞음: 서기처럼 칼집 쥔 손 그대로, 칼집은 2px 에서 같은 길이로 다시 그림)"""
    a = a.copy(); ys, xs = np.mgrid[0:H0, 0:W0]; skin = G['cls_mask'](a, 'skin')
    if not arms:
        a[poly_mask([(96, 176), (126, 148), (136, 154), (104, 186)], a.shape) & ~skin] = ROBE_SRC
        P0, P1 = np.array([97.0, 180.0]), np.array([26.0, 233.0]); d = (P1 - P0) / np.hypot(*(P1 - P0))
        t = (xs - P0[0]) * d[0] + (ys - P0[1]) * d[1]; dist = np.abs((xs - P0[0]) * d[1] - (ys - P0[1]) * d[0])
        a[(dist <= 6) & (t > -4) & (t < np.hypot(*(P1 - P0)) + 5) & (a[:, :, 3] > 0) & ~skin] = CAPE_SRC
        return a
    near = poly_mask([(52, 128), (75, 120), (102, 126), (106, 150), (104, 180), (104, 212), (64, 214), (58, 182), (48, 158)], a.shape)
    a[near & (xs < 96)] = CAPE_SRC; a[near & (xs >= 96)] = ROBE_SRC
    far = poly_mask([(158, 116), (182, 118), (195, 140), (196, 180), (192, 206), (172, 206), (166, 186), (162, 150)], a.shape)
    edge = 165 + (ys - 120) * 0.2
    a[far & (xs < edge)] = ROBE_SRC; a[far & (xs >= edge)] = 0
    a[poly_mask([(96, 176), (126, 148), (136, 154), (104, 186)], a.shape)] = ROBE_SRC               # 칼자루
    if scab:                                                                                        # 칼집 (공격 칸은 2px 에서 다시 그림)
        P0, P1 = np.array([97.0, 180.0]), np.array([26.0, 233.0]); d = (P1 - P0) / np.hypot(*(P1 - P0))
        t = (xs - P0[0]) * d[0] + (ys - P0[1]) * d[1]; dist = np.abs((xs - P0[0]) * d[1] - (ys - P0[1]) * d[0])
        sm = (dist <= 6) & (t > -4) & (t < np.hypot(*(P1 - P0)) + 5) & (a[:, :, 3] > 0); a[sm] = CAPE_SRC
    return a

NEAR_LEG, FAR_LEG = (60, 262, 104, 306), (143, 262, 197, 306)   # 원본 정강이·신발 상자 (뒤 = 화면 왼쪽 앞다리(가까운 쪽), 앞 = 화면 오른쪽 먼 다리)
def pose(a, lean, up_dx, up_dy, ctrl, drop, legs=None):
    """lean: 상체 기울기(도, + 앞으로), up_dx·dy: 상체 이동(원본 px), ctrl: 허리선 아래 가로 늘이기 {원본 x: 발끝 줄에서의 이동 px}, drop: 허리 내림 px,
    legs: (가까운 다리 dx, dy, 먼 다리 dx, dy) 원본 px — 원본 다리는 여기서 지우고, 2px 칸에서 서기 칸의 다리 그림을 그만큼 옮겨 도포 뒤에 붙임 (put_legs)"""
    W, H = W0 + 2 * OX, H0 + 2 * OY
    canvas = np.zeros((H, W, 4), np.uint8); can = np.zeros_like(canvas); can[OY:OY + H0, OX:OX + W0] = a.astype(np.uint8)
    leg_layer = np.zeros_like(can)
    if legs:
        r, g, b = can[..., 0].astype(int), can[..., 1].astype(int), can[..., 2].astype(int)
        navy = (b > r + 18) & (b > 55) & ((r + g + b) < 330)                          # 도포 남청 (다리 상자에 걸친 도포 자락은 그대로 둠)
        for (x0, y0, x1, y1) in (FAR_LEG, NEAR_LEG):   # 2026-11-04 오너 "발 모양이 이상해": 원본 다리를 잘라 옮기면 바지·신발이 조각나 → 원본 다리는 지우고 2px 에서 서기 칸 다리를 통째로 붙임 (put_legs)
            sl = (slice(OY + y0 - 10, OY + y1), slice(OX + x0, OX + x1)); m = (can[sl][..., 3] > 0) & ~navy[sl]; can[sl][m] = 0
        # 2026-11-04 오너 "걷는 발이 세 개로 보임": 두 다리 사이 도포 가운데 자락 끝(원본 y 258 아래, x 104~143)이 다리를 벌리면 혼자 늘어져 세 번째 다리처럼 보임 → 잘라냄
        can[OY + 258:OY + H0, OX + NEAR_LEG[2]:OX + FAR_LEG[0]] = 0
        can[OY + 264:OY + H0, OX - 40:OX + NEAR_LEG[0]] = 0                         # 망토 왼쪽 아래 끝도 뒷발 옆에서 발처럼 보여 조금 올림
    # 아래 (도포·다리·망토 자락): 줄마다 x 이동 = ctrl 을 이은 꺾은선 × t (허리 0 → 발 1), 세로는 허리선만 drop 만큼 내려 다리를 줄임
    bot = FY; k = (bot - WAIST - drop) / (bot - WAIST); cx = np.array(sorted(ctrl)); cs = np.array([ctrl[c] for c in cx])
    xs = np.arange(W) - OX
    for Y in range(H):
        y0 = Y - OY
        if y0 < WAIST - 8 + drop * 0: pass
        sy = bot - (bot - y0) / k if y0 >= WAIST + drop else y0 - drop          # 출력 줄 → 원본 줄
        if sy < WAIST - 8 or sy > H0 - 1: continue
        t = min(1.0, max(0.0, (sy - WAIST) / (bot - WAIST)))
        dense = np.arange(-OX, W0 + OX, 0.5); f = dense + np.interp(dense, cx, cs) * t
        srcx = np.interp(xs, f, dense)                                           # 출력 x → 원본 x (꺾은선 역함수)
        ix = np.round(srcx).astype(int) + OX; iy = int(round(sy)) + OY; ok = (ix >= 0) & (ix < W)
        canvas[Y, ok] = can[iy, ix[ok]]
    # 위 (머리·상체·어깨 망토): 허리 축 회전 + 이동 — 허리선보다 6px 아래까지 포함해 이음매를 덮음
    upper = can.copy(); upper[OY + WAIST + 6:] = 0
    th = math.radians(lean); c, s = math.cos(th), math.sin(th); px, py = PIV[0] + OX, PIV[1] + OY
    # 출력 (X,Y) → 원본: 이동 빼고 회전 역 (화면 아래가 +y 라 + 각도 = 머리가 앞으로)
    inv = lambda X, Y: (c * (X - px - up_dx) + s * (Y - py - up_dy) + px, -s * (X - px - up_dx) + c * (Y - py - up_dy) + py)
    a_, b_, c_ = c, s, -c * (px + up_dx) - s * (py + up_dy) + px
    d_, e_, f_ = -s, c, s * (px + up_dx) - c * (py + up_dy) + py
    up = np.array(Image.fromarray(upper, 'RGBA').transform((W, H), Image.AFFINE, (a_, b_, c_, d_, e_, f_), resample=Image.NEAREST))
    out = Image.fromarray(leg_layer, 'RGBA'); out.alpha_composite(Image.fromarray(canvas, 'RGBA')); out.alpha_composite(Image.fromarray(up, 'RGBA'))
    fwd_up = lambda x, y: (c * (x + OX - px) - s * (y + OY - py) + px + up_dx, s * (x + OX - px) + c * (y + OY - py) + py + up_dy)
    def fwd_low(x, y):
        t = min(1.0, max(0.0, (y - WAIST) / (bot - WAIST))); return (x + np.interp(x, cx, cs) * t + OX, bot - (bot - y) * k + OY)
    return np.array(out).astype(np.int32), fwd_up, fwd_low

def to_cell(p):   # 넓힌 캔버스 좌표 → 2px 칸 좌표 (서기 기준점)
    return (FOOTX + (p[0] - (FX + OX)) * scale, SOLE + (p[1] - (FY + 1 + OY)) * scale)

def place_at(a):  # B3 place 와 같은데 기준점을 서기 것으로 고정
    m = a[:, :, 3] >= 128; out = np.zeros((CELL, CELL, 4), np.uint8); inv = 1 / scale; fx, fy = FX + OX, FY + OY
    for cy in range(CELL):
        for cx in range(CELL):
            sx0 = fx + (cx - FOOTX) * inv; sy0 = fy + 1 + (cy - SOLE) * inv
            x0, x1 = int(np.floor(sx0)), int(np.ceil(sx0 + inv)); y0, y1 = int(np.floor(sy0)), int(np.ceil(sy0 + inv))
            x0, y0 = max(x0, 0), max(y0, 0); x1, y1 = min(x1, a.shape[1]), min(y1, a.shape[0])
            if x1 <= x0 or y1 <= y0: continue
            v = sample_mode(a[y0:y1, x0:x1], m[y0:y1, x0:x1])
            if v is not None: out[cy, cx] = v
    return out

# ── 2px 그리기 도구
SCAB, SCAB_HI = pc((30, 32, 56)), pc((52, 60, 98))         # 칼집: 짙은 남청 + 결 (검정은 아래 외곽선)
def scabbard(o, mouth, end, hilt=False):
    """벽사검 칼집 (검은·남청색, 금속 장식만 금색): 입구 금테 · 가운데 금띠 · 끝 금장식. hilt 면 꽂힌 칼의 자루(B3 sword 함수 그대로)"""
    if hilt: sword(o, mouth[0], mouth[1], None, tip=end, sheathed=True)
    L = math.hypot(end[0] - mouth[0], end[1] - mouth[1]); dx, dy = (end[0] - mouth[0]) / L, (end[1] - mouth[1]) / L; n = int(round(L))
    for i in range(1, n + 1):
        x, y = mouth[0] + dx * i, mouth[1] + dy * i
        put(o, x, y, SCAB_HI if i % 5 else SCAB); put(o, x, y + 1, DARK)
    for i in (1, n // 2): put(o, mouth[0] + dx * i, mouth[1] + dy * i, K['gold'][0])
    put(o, end[0], end[1], K['gold'][1]); put(o, mouth[0], mouth[1], K['gold'][1])

def limb(o, pts, widths, drapes=None, base=None):
    """팔 한 짝: pts = 어깨→팔꿈치→손목 칸 좌표, widths = 각 점의 팔 굵기(칸), drapes = 각 점에서 소매가 아래로 늘어지는 길이(칸, AI 서기의 부푼 흰 소매).
    외곽선 → 소매(위쪽 흰색, 아래로 늘어진 쪽 그늘) 순"""
    base = base or (WHITE, GREY); drapes = drapes or [0] * len(pts)
    samples = []
    for (x0, y0), (x1, y1), (w0, w1), (d0, d1) in zip(pts, pts[1:], zip(widths, widths[1:]), zip(drapes, drapes[1:])):
        n = int(max(abs(x1 - x0), abs(y1 - y0)) * 4) + 1
        for i in range(n + 1):
            t = i / n; samples.append((x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, w0 + (w1 - w0) * t, d0 + (d1 - d0) * t))
    cover = {}
    for x, y, w, dr in samples:
        r = w / 2
        for cy in range(int(y - r - 2), int(y + r + dr + 3)):
            for cx_ in range(int(x - r - 2), int(x + r + 3)):
                dy_ = cy - y; dd = math.hypot(cx_ - x, dy_ - min(max(dy_, 0), dr))     # 아래로 dr 만큼 늘인 둥근 막대
                side = dy_ - dr * 0.4                                                  # 늘어진 아래쪽 = 그늘
                if dd <= r: cover[(cx_, cy)] = min(cover.get((cx_, cy), (9, 0)), (0, side))
                elif dd <= r + 1: cover.setdefault((cx_, cy), (1, 0))
    for (cx_, cy), (k_, side) in cover.items():
        if k_ == 1: put(o, cx_, cy, DARK)
    for (cx_, cy), (k_, side) in cover.items():
        if k_ == 0: put(o, cx_, cy, base[1] if side > 0.8 else base[0])

def hand(o, x, y, dark=False):
    c1, c2 = (K['skin'][0], K['skin'][0]) if dark else (K['skin'][1], K['skin'][0])
    put(o, x, y, c1); put(o, x + 1, y, c1); put(o, x, y + 1, c2); put(o, x + 1, y + 1, c2)

def bracer(o, x, y):
    for dx_ in (0, 1):
        for dy_ in (0, 1): put(o, x + dx_, y + dy_, BRACER)
    put(o, x, y - 1, K['gold'][0])                                                 # 팔토시 금테

def blade_dir(ang): return math.cos(math.radians(ang)), math.sin(math.radians(ang))

# ── 서기 (B3 서기 + 칼집 색만): B3 와 같은 처리, 칼집을 검은·남청으로
idle_raw = G['place'](sample_mode, mi, src, scale); b4_idle = idle_raw.copy(); clean(b4_idle); outline(b4_idle)
handcells = b4_idle.copy()
for y in range(36, 50):                                    # B3 와 같이 옛 칼집 자리 정리 (밝은 칸 → 망토색)
    for x in range(14, 31):
        if b4_idle[y, x, 3] and lum(b4_idle[y, x]) > 500 and not G['near'](b4_idle[y, x], WHITE) and not G['near'](b4_idle[y, x], GREY): b4_idle[y, x] = G['CAPE']
scabbard(b4_idle, (29, 39), G['SCAB_END'], hilt=True)
for y in range(39, 44):
    for x in range(24, 30):
        if tuple(handcells[y, x, :3]) in {tuple(v[:3]) for v in K['skin']}: b4_idle[y, x] = handcells[y, x]

base = strip_arms(src)
# 서기 칸(2px)의 다리 그림 — 가까운 다리 칸 x 24~30·줄 55~61, 먼 다리 x 39~48·줄 54~61 (바지 자락·신발·금테 그대로)
LEG_TPL = {k: [(x, y, b4_idle[y, x].copy()) for y in range(y0, 62) for x in range(x0, x1) if b4_idle[y, x, 3]] for k, (x0, x1, y0) in
           {'near': (24, 31, 55), 'far': (39, 49, 54)}.items()}
def put_legs(o, legs):
    """서기 다리 그림을 통째로 옮겨 붙임 (도포 뒤 = 빈 칸에만). 먼 다리 먼저, 가까운 다리 나중 (가까운 다리가 겹치면 위)"""
    under = o[..., 3] == 0
    for k, dx, dy in (('far', legs[2], legs[3]), ('near', legs[0], legs[1])):
        cx, cy = int(round(dx * scale)), int(round(dy * scale))
        for x, y, c in LEG_TPL[k]:
            X, Y = x + cx, y + cy
            if 0 <= X < CELL and 0 <= Y < CELL and (under[Y, X] or k == 'near' and o[Y, X, 3] and (Y, X) in placed): o[Y, X] = c; placed.add((Y, X))
placed = set()
def frame(lean, up_dx, up_dy, ctrl, drop, legs=None):
    a, fu, fl = pose(base, lean, up_dx, up_dy, ctrl, drop, legs); o = place_at(a); clean(o); outline(o)
    if legs: placed.clear(); put_legs(o, legs)
    return o, (lambda p: to_cell(fu(*p))), (lambda p: to_cell(fl(*p)))

# 원본 좌표의 기준 부위
NEAR_SH, FAR_SH, MOUTH, SCAB_TAIL = (100, 112), (158, 110), (97, 180), (26, 233)   # 앞·뒤 어깨 관절(망토 속), 칼집 입구·끝

# ── 준비: 뒷발에 체중, 상체를 뒤로 젖혀 틀고(−8°) 뒤로, 앞발 가볍게 앞으로, 망토·도포 자락은 앞으로 쏠림(몸이 뒤로 가는 반동)
WIND = dict(lean=-8, up_dx=-6, up_dy=4, ctrl={-40: 10, 40: 6, 100: 0, 140: 3, 210: 8}, drop=4)
b4_wind, cu, cl = frame(**WIND)
SV = (G['SCAB_END'][0] - 29, G['SCAB_END'][1] - 39)                                   # 칼집 = 서기와 같은 벡터 (같은 길이·각도)
m_w = cl(MOUTH); SCABS = {'idle': ((29, 39), G['SCAB_END'])}
SCABS['windup'] = ((round(m_w[0]), round(m_w[1])), (round(m_w[0]) + SV[0], round(m_w[1]) + SV[1])); scabbard(b4_wind, *SCABS['windup'])
d = blade_dir(200); GW = (30, 23); TIP_W = (GW[0] + d[0] * BLADE, GW[1] + d[1] * BLADE)   # 두 손을 어깨 앞에 모아 칼을 어깨 위로 메듯 뒤위로 (칼끝이 머리보다 낮게)
hs, fs = cu(NEAR_SH), cu(FAR_SH)
limb(b4_wind, [fs, (fs[0] - 1, fs[1] + 4), (GW[0] + 4, GW[1] + 1.5)], [2.5, 2.5, 2], [0, 1, 1], base=(GREY, GREY))   # 뒷팔 (몸 뒤, 그늘색)
sword(b4_wind, GW[0], GW[1], None, tip=(round(TIP_W[0]), round(TIP_W[1])))
limb(b4_wind, [hs, (hs[0] - 1, hs[1] + 4), (GW[0] + 1.5, GW[1] + 1.5)], [3, 3, 2.5], [1, 3, 2])                    # 앞팔: 팔꿈치를 내리고 손을 어깨 앞으로, 소매가 아래로 늘어짐
bracer(b4_wind, GW[0] + 1, GW[1] + 2); hand(b4_wind, GW[0] + 1, GW[1]); hand(b4_wind, GW[0] + 3, GW[1] + 1, dark=True)

# ── 1타: 앞발 크게 내딛고(발끝 줄 +28px) 뒷발 조금 뒤로, 허리 내리고(7px) 상체를 앞으로 숙여(+9°) 앞으로, 망토·도포 뒷자락은 뒤로 끌림
PUNCH = dict(lean=9, up_dx=9, up_dy=7, ctrl={-40: -34, 40: -18, 100: -6, 140: 6, 210: 16}, drop=7, legs=(-10, 0, 26, 0))   # (나) 앞다리 통째로 +26 내딛고 뒷다리 −10, 도포 앞자락은 늘이기 16
b4_punch, cu, cl = frame(**PUNCH)
m_p = cl(MOUTH); SCABS['punch'] = ((round(m_p[0]), round(m_p[1])), (round(m_p[0]) + SV[0], round(m_p[1]) + SV[1])); scabbard(b4_punch, *SCABS['punch'])
ang = 40; d = blade_dir(ang); GP = (TIP[0] - d[0] * BLADE, TIP[1] - d[1] * BLADE); GPr = (round(GP[0]), round(GP[1]))
hs, fs = cu(NEAR_SH), cu(FAR_SH)
limb(b4_punch, [fs, (fs[0] + 1, fs[1] + 4), (GPr[0] - 3, GPr[1] - 1)], [2.5, 2.5, 2], [0, 1, 1], base=(GREY, GREY))   # 뒷팔
sword(b4_punch, GPr[0], GPr[1], None, tip=TIP)
limb(b4_punch, [hs, ((hs[0] + GPr[0]) / 2, (hs[1] + GPr[1]) / 2 + 1.5), (GPr[0] - 2, GPr[1])], [3, 3, 2.5], [1, 3, 1])  # 앞팔: 어깨 → 팔꿈치(앞아래) → 손목, 소매가 아래로
bracer(b4_punch, GPr[0] - 3, GPr[1] - 1); hand(b4_punch, GPr[0] - 1, GPr[1] - 1); hand(b4_punch, GPr[0] - 3, GPr[1] - 2, dark=True)

# ── 걷기·점프·맞음 (2026-11-04 오너 추가): 팔은 서기처럼 칼집을 쥔 채, 몸만 같은 방식으로 움직임. 칼집은 서기와 같은 벡터로 다시 그리고 손(피부)을 위에
base_arms = strip_arms(src, arms=False)
SKIN = {tuple(v[:3]) for v in K['skin']}
def frame_arms(lean, up_dx, up_dy, ctrl, drop, legs=None):
    a, fu, fl = pose(base_arms, lean, up_dx, up_dy, ctrl, drop, legs); o = place_at(a); clean(o); outline(o)
    if legs: placed.clear(); put_legs(o, legs)
    keep = [(x, y, o[y, x].copy()) for y in range(30, 50) for x in range(14, 36) if o[y, x, 3] and tuple(o[y, x, :3]) in SKIN]
    m = fl(*MOUTH); m = to_cell(m); mo = (round(m[0]), round(m[1])); scabbard(o, mo, (mo[0] + SV[0], mo[1] + SV[1]), hilt=True)
    for x, y, c in keep: o[y, x] = c
    SCABS[name_now[0]] = (mo, (mo[0] + SV[0], mo[1] + SV[1])); return o
name_now = ['']
# 걷기: 보폭이 넓어졌다(0·2) 좁아지며 몸이 올라감(1·3), 망토·도포 자락이 반대로 흔들림. 그림 한 장을 변형해 왼발·오른발이 바뀌지는 않음
MOVES = {
    'walk0': dict(lean=3, up_dx=3, up_dy=3, ctrl={-40: -16, 40: -9, 85: -4, 125: 0, 170: 6, 210: 10}, drop=3, legs=(-16, 0, 20, 0)),     # 보폭: 오너 "작다"(−8/+12) → "너무 넓다"(−30/+34) → 가운데 (−16/+20)
    # 2026-11-04 오너 "2번도": 걷기 6칸 — walk0 보폭 A → walk1 가까운 다리 들어 앞으로 → walk2 모음 → walk3 보폭 B → walk4 먼 다리 들어 앞으로 → walk5 모음
    'walk1': dict(lean=2, up_dx=2, up_dy=0, ctrl={-40: -4, 40: -2, 85: 0, 125: 0, 170: 2, 210: 4}, drop=0, legs=(20, -6, -10, 0)),
    'walk2': dict(lean=1, up_dx=1, up_dy=-2, ctrl={-40: 8, 40: 5, 85: 2, 125: 0, 170: -2, 210: -2}, drop=-2, legs=(47, -3, -40, 0)),
    'walk3': dict(lean=3, up_dx=3, up_dy=3, ctrl={-40: -22, 40: -12, 85: -2, 125: 2, 170: 6, 210: 10}, drop=3, legs=(113, 0, -109, 0)),  # 보폭 B: 가까운 다리 앞·먼 다리 뒤 (walk0 과 같은 폭)
    # 점프: 두 다리를 위로 당기고 가운데로 모음(늘이기 없음), 도포 자락 퍼짐 — 게임이 공중 높이만큼 올려 그림
    'jump': dict(lean=4, up_dx=2, up_dy=4, ctrl={-40: -20, 40: -10, 85: -2, 125: 0, 170: 4, 210: 14}, drop=4, legs=(14, -20, -16, -14)),
    # 맞음: 상체를 크게 뒤로 젖히고(−20°) 뒤로 밀리며 허리를 낮춤, 앞다리가 뒤로 끌림, 망토는 앞으로 쏠림
    'hurt': dict(lean=-20, up_dx=-16, up_dy=10, ctrl={-40: 18, 40: 12, 85: -2, 125: -2, 170: -6, 210: -10}, drop=10, legs=(-6, 0, -16, 0)),
}
b4_moves = {}
for n, kw in MOVES.items(): name_now[0] = n; b4_moves[n] = frame_arms(**kw)
# ── 점프 공격 (airKick, 2026-11-04 오너 "칼이 너무 밑으로만"): 다리 당긴 공중 자세, 상체 앞으로 숙이되 몸은 뒤로 물려 두 손을 가슴 앞에, 칼은 앞으로 25° 아래.
#    칼끝 = 점프 공격 사거리 50px (index.html JUMP_KICK.reach, 적 중심 기준) → 칸 (56, 37), 높이 45px
AIR = dict(lean=10, up_dx=-14, up_dy=4, ctrl={-40: -20, 40: -10, 85: -2, 125: 0, 170: 4, 210: 14}, drop=4, legs=(14, -20, -16, -14))
b4_air, cu, cl = frame(**AIR)
m_a = cl(MOUTH); SCABS['airKick'] = ((round(m_a[0]), round(m_a[1])), (round(m_a[0]) + SV[0], round(m_a[1]) + SV[1])); scabbard(b4_air, *SCABS['airKick'])
AIR_TIP = (56, 37); d = blade_dir(25); GA = (round(AIR_TIP[0] - d[0] * BLADE), round(AIR_TIP[1] - d[1] * BLADE))
hs, fs = cu(NEAR_SH), cu(FAR_SH)
limb(b4_air, [fs, (fs[0] + 1, fs[1] + 3), (GA[0] - 3, GA[1] - 1)], [2.5, 2.5, 2], [0, 1, 1], base=(GREY, GREY))
sword(b4_air, GA[0], GA[1], None, tip=AIR_TIP)
limb(b4_air, [hs, ((hs[0] + GA[0]) / 2, (hs[1] + GA[1]) / 2 + 1), (GA[0] - 2, GA[1])], [3, 3, 2.5], [1, 2, 1])
bracer(b4_air, GA[0] - 3, GA[1] - 1); hand(b4_air, GA[0] - 1, GA[1] - 1); hand(b4_air, GA[0] - 3, GA[1] - 2, dark=True)
WALK_MORE = {   # 걷기 6칸의 나머지 2칸 — 칸 번호를 바꾸지 않으려고 시트 끝(칸 10·11)에
    'walk4': dict(lean=2, up_dx=2, up_dy=0, ctrl={-40: -6, 40: -3, 85: 0, 125: 0, 170: 2, 210: 4}, drop=0, legs=(85, 0, -75, -6)),
    'walk5': dict(lean=1, up_dx=1, up_dy=-2, ctrl={-40: 14, 40: 8, 85: 2, 125: 0, 170: -2, 210: -2}, drop=-2, legs=(47, 0, -40, -3)),
}
for n, kw in WALK_MORE.items(): name_now[0] = n; b4_moves[n] = frame_arms(**kw)
sheet = np.concatenate([b4_idle, b4_wind, b4_punch] + [b4_moves[n] for n in MOVES] + [b4_air] + [b4_moves[n] for n in WALK_MORE], axis=1)   # 칸 0 서기 · 1 준비 · 2 1타 · 3~6 걷기 0~3 · 7 점프 · 8 맞음 · 9 점프 공격 · 10·11 걷기 4·5
Image.fromarray(sheet, 'RGBA').save(os.path.join(OUT, 'mugyeom-ai-b4.png'))
def top_px(o): ys = np.nonzero(o[:, :, 3].any(axis=1))[0]; return int((SOLE - ys.min()) * 2)
def front_px(o): xs = np.nonzero(o[:, :, 3].any(axis=0))[0]; return int((xs.max() + 1 - FOOTX) * 2)
def back_px(o): xs = np.nonzero(o[:, :, 3].any(axis=0))[0]; return int((xs.min() - FOOTX) * 2)
report = {'cells': ['idle', 'windup', 'punch'] + list(MOVES) + ['airKick'] + list(WALK_MORE), 'pose_walk_more': WALK_MORE, 'airKick': {'pose': AIR, 'tip_cell': AIR_TIP, 'tip_front_px': (AIR_TIP[0] + 1 - FOOTX) * 2, 'tip_height_px': (60.5 - AIR_TIP[1] - 1) * 2, 'blade_px': round(2 * math.hypot(AIR_TIP[0] - GA[0], AIR_TIP[1] - GA[1]), 1)}, 'pose_windup': {k: v for k, v in WIND.items()}, 'pose_punch': {k: v for k, v in PUNCH.items()}, 'pose_moves': MOVES,
          'height_px': {'idle': top_px(b4_idle), 'windup': top_px(b4_wind), 'punch': top_px(b4_punch), **{n: top_px(o) for n, o in b4_moves.items()}, 'airKick': top_px(b4_air)},
          'front_px': {'idle': front_px(b4_idle), 'windup': front_px(b4_wind), 'punch': front_px(b4_punch)},
          'back_px': {'idle': back_px(b4_idle), 'windup': back_px(b4_wind), 'punch': back_px(b4_punch)},
          'scabbard_px (입구~끝 직선)': {k: round(2 * math.hypot(e[0] - m[0], e[1] - m[1]), 1) for k, (m, e) in SCABS.items()},
          'blade_px': {'windup': round(2 * BLADE, 1), 'punch': round(2 * math.hypot(TIP[0] - GPr[0], TIP[1] - GPr[1]), 1)},
          'colors': int(len({tuple(c) for c in sheet[sheet[:, :, 3] > 0][:, :3]}))}
json.dump(report, open(os.path.join(OUT, 'report-b4.json'), 'w'), ensure_ascii=False, indent=1)
print(json.dumps(report, ensure_ascii=False))
