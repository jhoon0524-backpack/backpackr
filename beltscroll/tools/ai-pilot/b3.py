# B3 (2026-11-04 오너 지시 "AI 스프라이트 B3 개선 실험"): python3 -I tools/ai-pilot/b3.py <ai-sprite-pilot 폴더> <출력 폴더>
#  AI 윤무겸 서기(00_idle) 디자인 하나를 바탕으로 서기 · 준비(windup) · 1타(punch) 세 칸을 만든다. B1·B2(convert.py)는 손대지 않음.
#  - 서기: B2 와 같은 배율(서기 키 55칸)·발 기준점·칸마다 가장 많은 색 + 소매 흰 점·외톨이 칸 정리, 외곽선 규칙 하나로 통일
#  - 준비·1타: 서기 칸의 몸(다리·도포·망토·머리)은 그대로 두고 앞팔만 지우고 다시 그림 (Claude 가 규칙·좌표로 그린 것, 사람 도트 작가 아님)
#  - 칼: 벽사검 한 모양(곧은 외날, 금 코등이, 검은 손잡이, 주홍 매듭)을 한 함수로 그려 두 칸이 같은 칼. 서기는 칼집에 꽂힌 상태 그대로
#  - 이펙트: 넣지 않음 (게임 JS 이펙트 그대로)
#  출력: mugyeom-ai-b3.png (64×64 칸 × 3: 서기, 준비, 1타), report-b3.json
import sys, os, json, math
from PIL import Image
import numpy as np

SRC, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
CELL = 64; FOOTX = 32; SOLE = 62; TARGET_H = 55          # convert.py 와 같은 규격
TIP_CELL = FOOTX + 27                                    # 칼끝 칸 59 → 화면 (59+1−32)×2 = 56px

# ── convert.py 와 같은 함수 (B2 를 그대로 보존하려고 convert.py 는 고치지 않고 여기 옮겨 둠)
def load(name): return np.array(Image.open(os.path.join(SRC, 'frames', name + '.png')).convert('RGBA')).astype(np.int32)
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
def main_mask(a): m = a[:, :, 3] >= 128; lab, sizes = components(m); return lab == max(sizes, key=sizes.get)
def cool_bright(a): r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]; return (np.minimum(np.minimum(r, g), b) > 140) & (b >= r + 6)
def cls_mask(a, kind):
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]; mx = np.maximum(np.maximum(r, g), b); mn = np.minimum(np.minimum(r, g), b)
    if kind == 'gold': return (r > 140) & (g > 100) & (b < 90) & (r - b > 60)
    if kind == 'red': return (r > 130) & (g < 80) & (b < 80)
    if kind == 'skin': return (r > 170) & (g > 120) & (b > 90) & (r > b + 25) & (mx - mn < 110) & (mx - mn > 30)
def feet_center(m):
    ys, xs = np.nonzero(m); bot = ys.max(); band = (ys > bot - (bot - ys.min()) * 0.12); xb = xs[band]; return (xb.min() + xb.max()) / 2, bot
def quant(px, n):
    img = Image.fromarray(px.reshape(-1, 1, 3).astype(np.uint8), 'RGB').quantize(colors=n, method=Image.Quantize.MEDIANCUT)
    return np.array(img.getpalette()[:3 * n]).reshape(n, 3)
def place(sample, m, a, scale):
    fx, fy = feet_center(m); out = np.zeros((CELL, CELL, 4), np.uint8); inv = 1 / scale
    for cy in range(CELL):
        for cx in range(CELL):
            sx0 = fx + (cx - FOOTX) * inv; sy0 = fy + 1 + (cy - SOLE) * inv
            x0, x1 = int(np.floor(sx0)), int(np.ceil(sx0 + inv)); y0, y1 = int(np.floor(sy0)), int(np.ceil(sy0 + inv))
            if x1 <= 0 or y1 <= 0 or x0 >= a.shape[1] or y0 >= a.shape[0]: continue
            x0, y0 = max(x0, 0), max(y0, 0); x1, y1 = min(x1, a.shape[1]), min(y1, a.shape[0])
            v = sample(a[y0:y1, x0:x1], m[y0:y1, x0:x1])
            if v is not None: out[cy, cx] = v
    return out

# ── 서기
idle = load('00_idle'); mi = main_mask(idle); ys, xs = np.nonzero(mi); scale = TARGET_H / (ys.max() - ys.min() + 1)
ACC = {k: quant(idle[mi & cls_mask(idle, k)][:, :3], 2) for k in ('gold', 'red', 'skin')}
base = idle[mi & ~cls_mask(idle, 'gold') & ~cls_mask(idle, 'red') & ~cls_mask(idle, 'skin')][:, :3]
PAL = np.concatenate([quant(base, int(os.environ.get('B3_BASE', 16)))] + [ACC[k] for k in ('gold', 'red', 'skin')])
def nearest(c): return int(((PAL - c) ** 2).sum(axis=1).argmin())
def sample_mode(blk, mk):
    if mk.mean() < 0.5: return None
    cs = blk[mk][:, :3]; idx = [nearest(c) for c in cs[:: max(1, len(cs) // 12)]]
    p = PAL[max(set(idx), key=idx.count)]; return (int(p[0]), int(p[1]), int(p[2]), 255)
b3_raw = place(sample_mode, mi, idle, scale)
w06 = load('06_attack_windup'); m06 = main_mask(w06)
STEEL = quant(w06[m06 & cool_bright(w06)][:, :3], 2); STEEL = STEEL[np.argsort(STEEL.sum(axis=1))]   # 칼날 색: AI 06 칼날에서 2색 (어두운 면, 밝은 면)
def lum(c): return int(c[0]) * 3 + int(c[1]) * 6 + int(c[2])
order = sorted(range(len(PAL)), key=lambda i: lum(PAL[i]))
def col(i): p = PAL[i]; return (int(p[0]), int(p[1]), int(p[2]), 255)
DARK = col(order[0])                                       # 외곽선 = 가장 어두운 색
K = {k: [col(len(PAL) - 6 + 2 * j + q) for q in (0, 1)] for j, k in enumerate(('gold', 'red', 'skin'))}   # 강조색 2개씩 (팔레트 뒤 6색)
for k in K: K[k].sort(key=lum)                             # [어두운, 밝은]
WHITE, GREY = col(order[-1]), None
light = [i for i in order if lum(PAL[i]) > 1200 and tuple(col(i)) not in [tuple(c) for v in K.values() for c in v]]
WHITE = col(light[-1]); GREY = col(light[0])               # 소매: 흰색, 그늘 회색
def near(c, ref): return tuple(int(v) for v in c[:3]) == tuple(ref[:3])
ACCENTS = {tuple(c[:3]) for v in K.values() for c in v}
N4 = ((-1, 0), (1, 0), (0, -1), (0, 1)); N8 = [(dy, dx) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if dy or dx]

def clean(o):
    """소매 흰 점·외톨이 칸 정리: 상하좌우에 같은 색이 하나도 없는 칸 → 둘레 8칸에서 가장 많은 색(4칸 이상일 때).
    금·주홍은 그대로 두고, 피부는 둘레에 피부가 하나도 없을 때만(손·얼굴 지킴), 어두운 칸이 피부로 바뀌는 것(눈)은 막음"""
    src = o.copy(); n = 0
    for y in range(1, CELL - 1):
        for x in range(1, CELL - 1):
            if not src[y, x, 3]: continue
            c = tuple(src[y, x, :3])
            if any(src[y + dy, x + dx, 3] and tuple(src[y + dy, x + dx, :3]) == c for dy, dx in N4): continue
            nb = [tuple(src[y + dy, x + dx, :3]) for dy, dx in N8 if src[y + dy, x + dx, 3]]
            if not nb: continue
            m = max(set(nb), key=nb.count)
            if nb.count(m) < 4: continue
            if c in {tuple(v[:3]) for v in K['gold'] + K['red']}: continue
            if c in {tuple(v[:3]) for v in K['skin']} and any(t in {tuple(v[:3]) for v in K['skin']} for t in nb): continue
            if m in {tuple(v[:3]) for v in K['skin']} and lum(c) < 600: continue
            o[y, x, :3] = m; n += 1
    return n

def outline(o):
    """외곽선 규칙 하나: 바깥(투명)과 닿은 칸 중 밝은 칸(어두운 칸 4개 밖) → 외곽선 색. 금·주홍·피부 강조색은 그대로.
    외톨이 칸(상하좌우 이웃 0) 지우고, 상하좌우가 모두 찬 구멍은 위 칸 색으로 메움"""
    al = o[:, :, 3] > 0; darks = {tuple(col(i)[:3]) for i in order[:4]}
    for y in range(CELL):
        for x in range(CELL):
            k = sum(1 for dy, dx in N4 if 0 <= y + dy < CELL and 0 <= x + dx < CELL and al[y + dy, x + dx])
            if al[y, x] and k == 0: o[y, x] = 0
            elif not al[y, x] and k == 4: o[y, x] = o[y - 1, x]
    al = o[:, :, 3] > 0
    for y in range(CELL):
        for x in range(CELL):
            if al[y, x] and any(not (0 <= y + dy < CELL and 0 <= x + dx < CELL and al[y + dy, x + dx]) for dy, dx in N4):
                c = tuple(o[y, x, :3])
                if c not in darks and c not in ACCENTS: o[y, x] = DARK
    return o

def put(o, x, y, c):
    x, y = int(round(x)), int(round(y))
    if 0 <= x < CELL and 0 <= y < CELL: o[y, x] = c

def sword(o, gx, gy, ang, length=None, tip=None, sheathed=False, grip=True):
    """벽사검 한 모양: 손잡이 4칸(검정) + 금 머리 1칸 + 주홍 매듭 2칸, 금 코등이 3칸(칼과 직각), 곧은 외날 2색(위 밝은 면·아래 어두운 면), 칼끝 1칸.
    (gx, gy) = 코등이 칸, ang = 칼끝 방향(도, 화면 기준 아래가 +). sheathed 면 칼날 대신 칼집(금갈색 2칸 폭)"""
    if tip is None: dx, dy = math.cos(math.radians(ang)), math.sin(math.radians(ang))
    else: length = math.hypot(tip[0] - gx, tip[1] - gy); dx, dy = (tip[0] - gx) / length, (tip[1] - gy) / length
    n = int(round(length)); cells = []
    for i in range(1, n + 1):
        x, y = gx + dx * i, gy + dy * i; cells.append((x, y))
        if sheathed: put(o, x, y, K['gold'][0]); put(o, x, y + 1, DARK)
        else:
            put(o, x, y, (*STEEL[1], 255))
            if i < n - 1: put(o, x, y + 1, (*STEEL[0], 255))
    if tip is not None: put(o, tip[0], tip[1], K['gold'][1] if sheathed else (*STEEL[1], 255))   # 칼끝 / 칼집 끝 금테
    if sheathed and not grip: put(o, gx, gy, K['gold'][1]); return cells          # 빈 칼집: 칼집 입구 금테만
    for i in range(1, 5): put(o, gx - dx * i, gy - dy * i, DARK)                 # 손잡이
    put(o, gx - dx * 5, gy - dy * 5, K['gold'][1])                                # 손잡이 머리 (금)
    px, py = gx - dx * 5, gy - dy * 5
    put(o, px, py + 1, K['red'][1]); put(o, px - 1, py + 2, K['red'][0])           # 주홍 매듭 (아래로 늘어짐)
    for s in (-1, 0, 1): put(o, gx - dy * s, gy + dx * s, K['gold'][1] if s == 0 else K['gold'][0])   # 코등이
    return cells

def pc(rgb): return col(nearest(np.array(rgb)))
CAPE, ROBE, BRACER = pc((25, 20, 27)), pc((36, 35, 53)), col(order[2])
def is_arm(c): return near(c, WHITE) or near(c, GREY) or tuple(c[:3]) in {tuple(v[:3]) for v in K['skin']}

def spans(o, rows, c):   # rows = {y: (x0, x1)} 가로 띠로 칠하기
    for y, (x0, x1) in rows.items():
        for x in range(x0, x1 + 1): put(o, x, y, c)

SCAB_END = (29 - 19, 39 + 13)                       # 칼집 끝: 칼날 길이(약 23칸)와 같게 — AI 서기 칼집(약 14칸)은 칼보다 짧아 늘림
def scabbard(o, hilt):
    """서기 칼집(칼이 꽂힌 상태) / 공격 칸 빈 칼집: AI 서기 칼집 자리(손 아래 → 뒤쪽 아래)를 같은 칼 모양 규칙으로 다시 그림"""
    for y in range(36, 50):                       # 옛 칼집(흐릿한 금갈색 대각선) 지우고 망토색
        for x in range(14, 31):
            if o[y, x, 3] and x < 30 and lum(o[y, x]) > 500 and not near(o[y, x], WHITE) and not near(o[y, x], GREY): o[y, x] = CAPE
    if hilt: sword(o, 29, 39, None, tip=SCAB_END, sheathed=True)
    else: sword(o, 29, 39, None, tip=SCAB_END, sheathed=True, grip=False)

def body(dx):   # 서기 몸 + 상체(34줄 위)를 dx 칸 앞(+)/뒤(−)로, 앞팔(소매·팔토시·손) 지우고 망토·도포색으로 메움
    o = b3_raw.copy(); clean(o)
    if dx:
        top = o[:35].copy(); o[:35] = 0
        if dx > 0: o[:35, dx:] = top[:, :-dx]
        else: o[:35, :dx] = top[:, -dx:]
    for y in range(27, 44):
        for x in range(18, 32 + dx):
            if not o[y, x, 3]: continue
            if is_arm(o[y, x]) or (y >= 36 and x <= 29): o[y, x] = CAPE if x < 28 + dx else ROBE
    return o

def stamp(o, x0, y0, rows, only=None):
    """글자 그림을 칸에 찍기: W 흰 소매, G 소매 그늘, D 외곽선, B 팔토시, S·s 손(밝은·어두운 피부), . 그대로"""
    C = {'W': WHITE, 'G': GREY, 'D': DARK, 'B': BRACER, 'S': K['skin'][1], 's': K['skin'][0]}
    for j, r in enumerate(rows):
        for i, ch in enumerate(r):
            if ch in C and (only is None or ch in only): put(o, x0 + i, y0 + j, C[ch])

# 1타: 앞팔을 가슴 앞으로 뻗음 — 어깨 쪽은 좁고 팔뚝에서 부풀었다가 팔토시에서 모이는 AI 소매 모양. 손 (39~40, 28~31), 코등이 (41,29)
ARM_PUNCH = (25, 26, ["....DDDDD.......",
                      "..DDWWWWWDD.....",
                      "DDWWWWWWWWWDBBSS",
                      "WWWWWWWWWWGDBBSS",
                      "WWWWGWWWWGGDBBSS",
                      "DGWWWGWWGGGDBBss",
                      ".DGGWWGGGGD.....",
                      "..DGGGGGGD......",
                      "...DDDDDD......."])
# 준비: 앞팔을 머리 뒤로 들어 올림 — 들린 팔뚝에서 소매가 어깨 쪽으로 늘어짐. 손 (26~28, 14~15), 코등이 (25,13)
ARM_WINDUP = (21, 14, [".....SS...",
                       ".....SSs..",
                       "....DBBD..",
                       "....BBBD..",
                       "...DWWWD..",
                       "..DWWWWWD.",
                       ".DWWWWWWD.",
                       ".DWWWWWWWD",
                       "DWWWWWWWWD",
                       "DGWWWWWWWD",
                       "DGWWWWWWGD",
                       "DGGWWWWGGD",
                       ".DGGWWGGD.",
                       ".DGGGGGGD.",
                       "..DGGGGD..",
                       "...DDDD..."])

b3_idle = b3_raw.copy(); n_clean = clean(b3_idle); outline(b3_idle)
hand = b3_idle.copy(); scabbard(b3_idle, True)
for y in range(39, 44):                             # 서기 손(피부)은 칼집 위로 다시
    for x in range(24, 30):
        if tuple(hand[y, x, :3]) in {tuple(v[:3]) for v in K['skin']}: b3_idle[y, x] = hand[y, x]
b3_wind = body(-1); outline(b3_wind); stamp(b3_wind, *ARM_WINDUP); scabbard(b3_wind, False)
WIND_GUARD, WIND_TIP = (25, 13), (3, 7)
sword(b3_wind, *WIND_GUARD, None, tip=WIND_TIP); stamp(b3_wind, *ARM_WINDUP, only='Ss')
b3_punch = body(1); outline(b3_punch); stamp(b3_punch, *ARM_PUNCH); scabbard(b3_punch, False)
PUNCH_GUARD, PUNCH_TIP = (41, 29), (TIP_CELL, 44)      # 칼끝 칸 (59,44): 화면 앞 56px, 높이 (60.5−44−1)×2 = 31px
sword(b3_punch, *PUNCH_GUARD, None, tip=PUNCH_TIP); stamp(b3_punch, *ARM_PUNCH, only='Ss')
sheet = np.concatenate([b3_idle, b3_wind, b3_punch], axis=1)
Image.fromarray(sheet, 'RGBA').save(os.path.join(OUT, 'mugyeom-ai-b3.png'))
def top_px(o): ys = np.nonzero(o[:, :, 3].any(axis=1))[0]; return int((SOLE - ys.min()) * 2)
def front_px(o): xs = np.nonzero(o[:, :, 3].any(axis=0))[0]; return int((xs.max() + 1 - FOOTX) * 2)
blade = lambda g, t: round(2 * math.hypot(t[0] - g[0], t[1] - g[1]), 1)
report = {'cells_per_source_px': round(scale, 4), 'palette': len(PAL) + 2, 'cleaned_cells_idle': n_clean,
          'height_px (발바닥 아래끝 기준 = sheets 키와 같은 식)': {'idle': top_px(b3_idle), 'windup': top_px(b3_wind), 'punch': top_px(b3_punch)},
          'front_px': {'idle': front_px(b3_idle), 'windup': front_px(b3_wind), 'punch': front_px(b3_punch)},
          'blade_px (코등이~칼끝 직선)': {'windup': blade(WIND_GUARD, WIND_TIP), 'punch': blade(PUNCH_GUARD, PUNCH_TIP), 'scabbard': blade((29, 39), SCAB_END)},
          'colors': int(len({tuple(c) for c in sheet[sheet[:, :, 3] > 0][:, :3]}))}
json.dump(report, open(os.path.join(OUT, 'report-b3.json'), 'w'), ensure_ascii=False, indent=1)
print(json.dumps(report, ensure_ascii=False))
