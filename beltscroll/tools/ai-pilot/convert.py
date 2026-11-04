# AI 레퍼런스 → 2px 시트 (2026-11-04 실험): python3 -I tools/ai-pilot/convert.py <ai-sprite-pilot 폴더> <출력 폴더>
#  B1 단순 축소: 몸통 덩어리만 남기고(떨어진 조각 제거) 같은 배율로 줄여(평균) 알파 50% 로 자름. 색·칼·이펙트 손대지 않음
#  B2 보정: 색을 32색(몸 24 + 금·주홍·피부·칼날 각 2)으로 묶어 칸마다 가장 많은 색(평균 아님), 바깥 윤곽 외곽선, 외톨이 칸 정리, 베기 이펙트 떼어 냄,
#           1타 칼날을 잘린 곳 너머 칼끝 56px 까지 다시 그림, 발 기준점·키 맞춤 — Claude 가 규칙·픽셀 단위로 고친 것(사람 도트 작가 아님)
#  출력: mugyeom-ai-b1.png · mugyeom-ai-b2.png (64×64 칸 × 2: 서기, 1타), fx-downslash-b2.png (1타 베기 이펙트만), report.json
import sys, os, json
from PIL import Image
import numpy as np

SRC, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
CELL = 64; FOOTX = 32; SOLE = 62            # 칸 64, 몸 기준점 가로 32, 발바닥 아래끝 62 (규격: footY 60.5)
TARGET_H = 55                                # 서기 키 55칸 = 화면 110px
TIP_CELL = FOOTX + 27                        # 칼끝 칸: (27+1)×2 = 56px

def load(name):
    a = np.array(Image.open(os.path.join(SRC, 'frames', name + '.png')).convert('RGBA')).astype(np.int32)
    return a

def components(mask):
    h, w = mask.shape; lab = np.zeros((h, w), np.int32); n = 0; sizes = {}
    for y in range(h):
        for x in range(w):
            if mask[y, x] and not lab[y, x]:
                n += 1; st = [(y, x)]; lab[y, x] = n; c = 0
                while st:
                    cy, cx = st.pop(); c += 1
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            ny, nx = cy + dy, cx + dx
                            if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not lab[ny, nx]: lab[ny, nx] = n; st.append((ny, nx))
                sizes[n] = c
    return lab, sizes

def main_mask(a):   # 알파 128 이상, 가장 큰 덩어리만 (이웃 동작 조각 제거)
    m = a[:, :, 3] >= 128; lab, sizes = components(m); big = max(sizes, key=sizes.get); return lab == big

def cool_bright(a):   # 베기 이펙트·칼날 색: 밝고 푸르스름 (흰 소매는 따뜻한 흰색이라 빠짐)
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    return (np.minimum(np.minimum(r, g), b) > 140) & (b >= r + 6)

def dilate(m, k):   # 둘레로 k칸 넓히기 (이펙트의 어두운 테두리까지 함께 떼려고)
    o = m.copy()
    for _ in range(k):
        n = o.copy(); n[1:] |= o[:-1]; n[:-1] |= o[1:]; n[:, 1:] |= o[:, :-1]; n[:, :-1] |= o[:, 1:]; o = n
    return o

def cls_mask(a, kind):   # 강조색 묶음 (팔레트에 꼭 넣을 색)
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]; mx = np.maximum(np.maximum(r, g), b); mn = np.minimum(np.minimum(r, g), b)
    if kind == 'gold': return (r > 140) & (g > 100) & (b < 90) & (r - b > 60)
    if kind == 'red': return (r > 130) & (g < 80) & (b < 80)
    if kind == 'skin': return (r > 170) & (g > 120) & (b > 90) & (r > b + 25) & (mx - mn < 110) & (mx - mn > 30)
    if kind == 'steel': return cool_bright(a)

def feet_center(m):   # 몸 기준점 = 두 발 가운데: 맨 아래 12% 띠의 덩어리들 가운데 (양 끝 발)
    ys, xs = np.nonzero(m); bot = ys.max(); band = (ys > bot - (bot - ys.min()) * 0.12)
    xb = xs[band]; return (xb.min() + xb.max()) / 2, bot

idle, slash = load('00_idle'), load('07_downslash')
mi = main_mask(idle); ys, xs = np.nonzero(mi); src_h = ys.max() - ys.min() + 1
scale = TARGET_H / src_h                      # 같은 배율을 두 동작에 (동작마다 크기 바뀌지 않게)
report = {'source_idle_height_px': int(src_h), 'cells_per_source_px': round(scale, 4), 'source_px_per_cell': round(1 / scale, 2)}

def place(sample, m, a, extra_mask=None):
    """칸 64×64 에 놓기: 발 가운데가 (FOOTX, SOLE) 에. sample(블록 픽셀들) → (r,g,b,a)"""
    fx, fy = feet_center(m)
    out = np.zeros((CELL, CELL, 4), np.uint8); inv = 1 / scale
    for cy in range(CELL):
        for cx in range(CELL):
            # 칸 (cx, cy) 가 덮는 원본 영역
            sx0 = fx + (cx - FOOTX) * inv; sy0 = fy + 1 + (cy - SOLE) * inv
            x0, x1 = int(np.floor(sx0)), int(np.ceil(sx0 + inv)); y0, y1 = int(np.floor(sy0)), int(np.ceil(sy0 + inv))
            if x1 <= 0 or y1 <= 0 or x0 >= a.shape[1] or y0 >= a.shape[0]: continue
            x0, y0 = max(x0, 0), max(y0, 0); x1, y1 = min(x1, a.shape[1]), min(y1, a.shape[0])
            blk = a[y0:y1, x0:x1]; mk = m[y0:y1, x0:x1]
            if extra_mask is not None: mk = mk & ~extra_mask[y0:y1, x0:x1]
            v = sample(blk, mk)
            if v is not None: out[cy, cx] = v
    return out

def sample_mean(blk, mk):   # B1: 평균 (알파 50% 이상만)
    if mk.mean() < 0.5: return None
    c = blk[mk][:, :3].mean(axis=0); return (int(c[0]), int(c[1]), int(c[2]), 255)

# B2 팔레트: 두 동작 몸통 색을 24색으로 묶음 (중앙값 자르기)
def quant(px, n):
    img = Image.fromarray(px.reshape(-1, 1, 3).astype(np.uint8), 'RGB').quantize(colors=n, method=Image.Quantize.MEDIANCUT)
    return np.array(img.getpalette()[:3 * n]).reshape(n, 3)
ACCENT = {}
def palette_of(*pairs):   # 몸 색 16 + 강조색(금·주홍·피부·칼날) 각 2 = 24색 — 넓이가 작은 금색 장식이 빠지지 않게
    acc = np.zeros(pairs[0][0].shape[:2], bool)
    parts = []
    for kind in ('gold', 'red', 'skin', 'steel'):
        px = np.concatenate([a[m & cls_mask(a, kind)][:, :3] for a, m in pairs]); ACCENT[kind] = quant(px, 2); parts.append(ACCENT[kind])
    base = np.concatenate([a[m & ~cls_mask(a, 'gold') & ~cls_mask(a, 'red') & ~cls_mask(a, 'skin') & ~cool_bright(a)][:, :3] for a, m in pairs])
    return np.concatenate([quant(base, 24)] + parts)

ms = main_mask(slash)
PAL = palette_of((idle, mi), (slash, ms))
def nearest(c): return int(((PAL - c) ** 2).sum(axis=1).argmin())
def sample_mode(blk, mk):   # B2: 칸 안에서 가장 많은 팔레트 색 (평균이 만드는 흐린 중간색 없음)
    if mk.mean() < 0.5: return None
    cs = blk[mk][:, :3]; idx = [nearest(c) for c in cs[:: max(1, len(cs) // 12)]]
    k = max(set(idx), key=idx.count); p = PAL[k]; return (int(p[0]), int(p[1]), int(p[2]), 255)

def tidy(o):   # 외톨이 칸 없애기·작은 구멍 메우기·바깥 윤곽 외곽선
    al = o[:, :, 3] > 0; H, W = al.shape
    nb = lambda y, x: sum(1 for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)) if 0 <= y + dy < H and 0 <= x + dx < W and al[y + dy, x + dx])
    for y in range(H):
        for x in range(W):
            if al[y, x] and nb(y, x) <= 1: o[y, x] = 0
            elif not al[y, x] and nb(y, x) >= 4:
                o[y, x] = o[y - 1, x]
    al = o[:, :, 3] > 0; dark = PAL[np.argmin(PAL.sum(axis=1))]
    edge = []
    for y in range(H):
        for x in range(W):
            if al[y, x] and any(not (0 <= y + dy < H and 0 <= x + dx < W and al[y + dy, x + dx]) for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1))):
                if o[y, x, :3].sum() > 150: edge.append((y, x))
    for y, x in edge: o[y, x, :3] = dark
    return o

def front(o):   # 가장 앞 칸 → 화면 px
    xs = np.nonzero(o[:, :, 3].any(axis=0))[0]; return int((xs.max() + 1 - FOOTX) * 2)

def height(o):
    ys = np.nonzero(o[:, :, 3].any(axis=1))[0]; return int((SOLE - ys.min()) * 2)

# ── B1 단순 축소
b1_idle = place(sample_mean, mi, idle); b1_slash = place(sample_mean, ms, slash)
# ── B2 보정
# 1타: 칼날+베기 이펙트 = 밝고 푸르스름한 큰 덩어리(초승달). 흰 바지의 푸른 반사광 같은 작은 조각은 빼고, 어두운 테두리까지 3칸 넓혀 몸통에서 뗌 (손·코등이·끈은 남김)
_lab, _sz = components(cool_bright(slash) & ms)
_arc = np.isin(_lab, [k for k, v in _sz.items() if v > 400])
fx_mask = dilate(_arc, 3) & ms & ~(cls_mask(slash, 'gold') | cls_mask(slash, 'skin') | cls_mask(slash, 'red'))
b2_idle = tidy(place(sample_mode, mi, idle))
b2_slash = tidy(place(sample_mode, ms, slash, extra_mask=fx_mask))
def largest_only(o):
    lab, sz = components(o[:, :, 3] > 0); big = max(sz, key=sz.get); o[(lab != big) & (lab > 0)] = 0; return o
b2_idle = largest_only(b2_idle); b2_slash = largest_only(b2_slash)
# 1타 칼날 다시 그리기: 원본 코등이(금색)·손 자리에서 원본 칼날 방향으로 칼끝 56px 까지
fxc, fyc = feet_center(ms)
gy, gx = np.nonzero((slash[:, :, 0] > 170) & (slash[:, :, 1] > 120) & (slash[:, :, 2] < 90) & ms)   # 금색
keep = gy < fyc - 30; gy, gx = gy[keep], gx[keep]                                                   # 신발 금테 제외
sel = gx > np.percentile(gx, 80)                                                                     # 가장 앞쪽 금색 = 코등이
gfx, gfy = gx[sel].mean(), gy[sel].mean()
gcx = FOOTX + (gfx - fxc) * scale; gcy = SOLE + (gfy - (fyc + 1)) * scale
by, bx = np.nonzero(fx_mask); near = (bx > gfx) & (np.abs(by - gfy - (bx - gfx) * 0.55) < 25)   # 코등이 앞 칼날 띠
k = np.polyfit(bx[near], by[near], 1)[0] if near.sum() > 20 else 0.5                              # 원본 칼날 기울기
st2 = ACCENT['steel'][np.argsort(ACCENT['steel'].sum(axis=1))]; steelD, steel = st2[0], st2[1]   # 칼날: 강철 2색 (밝은 면 위, 어두운 면 아래)
tip_x = TIP_CELL; tip_y = gcy + (tip_x - gcx) * k
n = int(round(tip_x - gcx))
for i in range(1, n + 1):
    x = int(round(gcx + i)); y = int(round(gcy + i * k))
    if 0 <= y < CELL and 0 <= x < CELL:
        b2_slash[y, x] = (*steel, 255)
        if y + 1 < CELL and i < n: b2_slash[y + 1, x] = (*steelD, 255)
report['b2_slash_blade'] = {'guard_cell': [round(gcx, 1), round(gcy, 1)], 'slope_dy_per_dx': round(float(k), 3), 'tip_cell': [tip_x, round(tip_y, 1)], 'tip_px': (tip_x + 1 - FOOTX) * 2, 'tip_height_px': round((SOLE - tip_y - 1) * 2, 1)}
# 베기 이펙트만 (2px, 보정판과 같은 배율·기준점) — 본체와 떼어 따로 검토
fx_only = place(lambda blk, mk: (235, 240, 255, 255) if mk.mean() >= 0.35 else None, fx_mask, slash)
for name, o in [('b1', [b1_idle, b1_slash]), ('b2', [b2_idle, b2_slash])]:
    sheet = np.concatenate(o, axis=1); Image.fromarray(sheet, 'RGBA').save(os.path.join(OUT, f'mugyeom-ai-{name}.png'))
    report[name] = {'idle_height_px': height(o[0]), 'slash_height_px': height(o[1]), 'idle_front_px': front(o[0]), 'slash_front_px': front(o[1]),
                    'colors': int(len({tuple(c) for c in sheet[sheet[:, :, 3] > 0][:, :3]}))}
Image.fromarray(fx_only, 'RGBA').save(os.path.join(OUT, 'fx-downslash-b2.png'))
report['palette_b2'] = ['#%02x%02x%02x' % tuple(int(v) for v in c) for c in PAL]
json.dump(report, open(os.path.join(OUT, 'report.json'), 'w'), ensure_ascii=False, indent=1)
print(json.dumps(report, ensure_ascii=False))
