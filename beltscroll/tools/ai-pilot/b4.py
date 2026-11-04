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

def strip_arms(a, scab=True):
    """두 팔·칼자루(·칼집) 지우기: 앞팔 자리는 망토/도포색, 뒷팔 자리는 도포 앞끝 안쪽만 도포색·바깥은 투명"""
    a = a.copy(); ys, xs = np.mgrid[0:H0, 0:W0]
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

def pose(a, lean, up_dx, up_dy, ctrl, drop):
    """lean: 상체 기울기(도, + 앞으로), up_dx·dy: 상체 이동(원본 px), ctrl: 허리선 아래 가로 늘이기 {원본 x: 발끝 줄에서의 이동 px}, drop: 허리 내림 px"""
    W, H = W0 + 2 * OX, H0 + 2 * OY
    canvas = np.zeros((H, W, 4), np.uint8); can = np.zeros_like(canvas); can[OY:OY + H0, OX:OX + W0] = a.astype(np.uint8)
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
    out = Image.fromarray(canvas, 'RGBA'); out.alpha_composite(Image.fromarray(up, 'RGBA'))
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
def frame(lean, up_dx, up_dy, ctrl, drop):
    a, fu, fl = pose(base, lean, up_dx, up_dy, ctrl, drop); o = place_at(a); clean(o); outline(o)
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
PUNCH = dict(lean=9, up_dx=9, up_dy=7, ctrl={-40: -34, 40: -18, 100: -8, 140: 6, 210: 28}, drop=7)
b4_punch, cu, cl = frame(**PUNCH)
m_p = cl(MOUTH); SCABS['punch'] = ((round(m_p[0]), round(m_p[1])), (round(m_p[0]) + SV[0], round(m_p[1]) + SV[1])); scabbard(b4_punch, *SCABS['punch'])
ang = 40; d = blade_dir(ang); GP = (TIP[0] - d[0] * BLADE, TIP[1] - d[1] * BLADE); GPr = (round(GP[0]), round(GP[1]))
hs, fs = cu(NEAR_SH), cu(FAR_SH)
limb(b4_punch, [fs, (fs[0] + 1, fs[1] + 4), (GPr[0] - 3, GPr[1] - 1)], [2.5, 2.5, 2], [0, 1, 1], base=(GREY, GREY))   # 뒷팔
sword(b4_punch, GPr[0], GPr[1], None, tip=TIP)
limb(b4_punch, [hs, ((hs[0] + GPr[0]) / 2, (hs[1] + GPr[1]) / 2 + 1.5), (GPr[0] - 2, GPr[1])], [3, 3, 2.5], [1, 3, 1])  # 앞팔: 어깨 → 팔꿈치(앞아래) → 손목, 소매가 아래로
bracer(b4_punch, GPr[0] - 3, GPr[1] - 1); hand(b4_punch, GPr[0] - 1, GPr[1] - 1); hand(b4_punch, GPr[0] - 3, GPr[1] - 2, dark=True)

sheet = np.concatenate([b4_idle, b4_wind, b4_punch], axis=1)
Image.fromarray(sheet, 'RGBA').save(os.path.join(OUT, 'mugyeom-ai-b4.png'))
def top_px(o): ys = np.nonzero(o[:, :, 3].any(axis=1))[0]; return int((SOLE - ys.min()) * 2)
def front_px(o): xs = np.nonzero(o[:, :, 3].any(axis=0))[0]; return int((xs.max() + 1 - FOOTX) * 2)
def back_px(o): xs = np.nonzero(o[:, :, 3].any(axis=0))[0]; return int((xs.min() - FOOTX) * 2)
report = {'pose_windup': {k: v for k, v in WIND.items()}, 'pose_punch': {k: v for k, v in PUNCH.items()},
          'height_px': {'idle': top_px(b4_idle), 'windup': top_px(b4_wind), 'punch': top_px(b4_punch)},
          'front_px': {'idle': front_px(b4_idle), 'windup': front_px(b4_wind), 'punch': front_px(b4_punch)},
          'back_px': {'idle': back_px(b4_idle), 'windup': back_px(b4_wind), 'punch': back_px(b4_punch)},
          'scabbard_px (입구~끝 직선)': {k: round(2 * math.hypot(e[0] - m[0], e[1] - m[1]), 1) for k, (m, e) in SCABS.items()},
          'blade_px': {'windup': round(2 * BLADE, 1), 'punch': round(2 * math.hypot(TIP[0] - GPr[0], TIP[1] - GPr[1]), 1)},
          'colors': int(len({tuple(c) for c in sheet[sheet[:, :, 3] > 0][:, :3]}))}
json.dump(report, open(os.path.join(OUT, 'report-b4.json'), 'w'), ensure_ascii=False, indent=1)
print(json.dumps(report, ensure_ascii=False))
