# B5 (2026-11-05 오너 원문 "나"): python3 -I tools/ai-pilot/b5.py <출력 폴더>
#  오너가 올린 AI 움직임 GIF(assets/reference/ai-sprite-gif/mugyeom-anim-15.gif, 15장)를 2px 로. B4(b4.py)는 그대로.
#  - 배율: GIF 서기 장(0번) 키 = 55칸(110px), 모든 장 같은 배율. 늘리지 않음
#  - 위치: 가로는 GIF 캔버스 그대로(0번 장의 발 기준점을 모든 장에) — 몸이 앞뒤로 움직이는 것이 그대로 남음. 세로는 장마다 발바닥을 바닥 줄에
#  - 칼: AI 휜 칼날·초승달 이펙트(밝고 푸르스름한 덩어리, 손·금색 제외)를 지우고, 같은 자리에 곧은 칼날(B3 칼 색 2단)을 Claude 가 다시 그림.
#        코등이·손·손잡이·주홍 매듭은 AI 그림 그대로. 칼집(긴 금갈색 덩어리)은 검은·남청으로, 양 끝 금속 장식만 금색 (B4 결정)
#  - 팔레트·외톨이 정리·외곽선: B3 와 같은 함수 (runpy 로 b3.py 를 임시 폴더 출력으로 실행해 가져옴)
#  출력: mugyeom-ai-b5.png (64×64 칸 × 11: GIF 0·1·2·3·4·5·7·11·12·14·13번), mugyeom-ai-b5-test.png (시험판용 B4 12칸 + B5 11칸), report-b5.json
import sys, os, json, math, runpy, tempfile
from PIL import Image, ImageSequence
import numpy as np

OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..', '..')
argv = sys.argv; sys.argv = [os.path.join(HERE, 'b3.py'), os.path.join(ROOT, 'assets', 'reference', 'ai-sprite-pilot'), tempfile.mkdtemp()]
G = runpy.run_path(os.path.join(HERE, 'b3.py')); sys.argv = argv
CELL, FOOTX, SOLE = G['CELL'], G['FOOTX'], G['SOLE']
PAL, sample_mode, clean, outline, put, K, DARK, STEEL, lum, components, cool_bright, cls_mask, feet_center = (G[k] for k in
    ('PAL', 'sample_mode', 'clean', 'outline', 'put', 'K', 'DARK', 'STEEL', 'lum', 'components', 'cool_bright', 'cls_mask', 'feet_center'))

GIF = os.path.join(ROOT, 'assets', 'reference', 'ai-sprite-gif', 'mugyeom-anim-15.gif')
FR = [np.array(f.convert('RGBA')).astype(np.int32) for f in ImageSequence.Iterator(Image.open(GIF))]
m0 = FR[0][..., 3] > 0; ys0, _ = np.nonzero(m0)
scale = 55 / (ys0.max() - ys0.min() + 1)                   # 서기 장 키 = 55칸
FX0, _ = feet_center(m0)                                   # 0번 장 발 기준점 (가로) — 모든 장에

# 칼날을 다시 그릴 장: 코등이(원본 px) → 칼날 방향 끝(원본 px). 원본을 확대해 Claude 가 잰 자리 (README 9절)
BLADES = {5: ((228, 45), (338, 128)), 7: ((283, 248), (355, 297)), 11: ((178, 195), (65, 250)), 12: ((277, 134), (398, 136)), 14: ((205, 205), (115, 232))}
BLADE = 23.4                                               # 칼날 길이(칸) — B3·B4 와 같은 46.8px

def dilate(m, k):
    o = m.copy()
    for _ in range(k):
        n = o.copy(); n[1:] |= o[:-1]; n[:-1] |= o[1:]; n[:, 1:] |= o[:, :-1]; n[:, :-1] |= o[:, 1:]; o = n
    return o

def strip_blade(a):
    """AI 칼날·이펙트: 밝고 푸르스름한 덩어리(30px 이상) + 둘레 2px (손·금색·주홍 제외) → 지움"""
    m = a[..., 3] > 0; cb = cool_bright(a) & m; lab, sz = components(cb)
    blade = np.isin(lab, [k for k, v in sz.items() if v >= 30])
    keep = cls_mask(a, 'skin') | cls_mask(a, 'gold') | cls_mask(a, 'red')
    rm = dilate(blade, 2) & m & ~keep
    a = a.copy(); a[rm] = 0
    lab2, sz2 = components(a[..., 3] > 0); big = max(sz2, key=sz2.get); stray = (lab2 > 0) & (lab2 != big)   # 이펙트 테두리처럼 몸에서 떨어진 조각
    a[stray] = 0; return a, int(rm.sum() + stray.sum())

# 칼집 선 (칼집 끝 → 손 위 칼집 입구, 원본 px, 확대해 Claude 가 잰 자리). 3·4번 장은 칼집이 몸 뒤라 안 보임
SCAB = {0: ((148, 255), (197, 208)), 1: ((140, 255), (190, 212)), 2: ((132, 239), (205, 205)), 13: ((102, 245), (228, 190))}
# 7번(1타) 초승달 이펙트의 어두운 테두리가 몸에 붙어 남음 → 몸·손·발이 없는 자리를 지움 (원본 px 상자: x0, y0, x1, y1)
CLEAR = {7: [(250, 40, 402, 220), (300, 40, 402, 272)]}
def dark_scabbard(a, i):
    """칼집 선 6px 안의 금갈색 → 검정~짙은 남청 (밝기 따라), 양 끝 7px 는 금속 장식이라 그대로 (B4 b4_ref.py 와 같은 방법)"""
    if i not in SCAB: return a, 0
    (x0, y0), (x1, y1) = SCAB[i]; P0 = np.array([x0, y0], float); d = np.array([x1 - x0, y1 - y0], float); L = np.hypot(*d); u = d / L
    ys, xs = np.mgrid[0:a.shape[0], 0:a.shape[1]]; t = (xs - P0[0]) * u[0] + (ys - P0[1]) * u[1]; dist = np.abs((xs - P0[0]) * u[1] - (ys - P0[1]) * u[0])
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    goldish = (r > g) & (g > b) & (r - b > 25) & (a[..., 3] > 0) & ~cls_mask(a, 'skin')
    m = goldish & (dist <= 6) & (t > 7) & (t < L - 7)
    lm = (r * 3 + g * 6 + b) / 10; k = np.clip((lm - 40) / 160, 0, 1)[..., None]
    col = (np.array([16, 18, 34]) + (np.array([58, 66, 104]) - np.array([16, 18, 34])) * k).astype(np.int32)
    a = a.copy(); a[m, :3] = col[m]; return a, int(m.sum())

def place_at(a, fx, fy):
    m = a[..., 3] > 0; out = np.zeros((CELL, CELL, 4), np.uint8); inv = 1 / scale
    for cy in range(CELL):
        for cx in range(CELL):
            sx0 = fx + (cx - FOOTX) * inv; sy0 = fy + 1 + (cy - SOLE) * inv
            x0, x1 = int(np.floor(sx0)), int(np.ceil(sx0 + inv)); y0, y1 = int(np.floor(sy0)), int(np.ceil(sy0 + inv))
            x0, y0 = max(x0, 0), max(y0, 0); x1, y1 = min(x1, a.shape[1]), min(y1, a.shape[0])
            if x1 <= x0 or y1 <= y0: continue
            v = sample_mode(a[y0:y1, x0:x1], m[y0:y1, x0:x1])
            if v is not None: out[cy, cx] = v
    return out

def blade(o, g, tip):
    """곧은 칼날만 (손잡이·코등이는 AI 그림): 밝은 면 위·어두운 면 아래 2칸, 칼끝 1칸"""
    L = math.hypot(tip[0] - g[0], tip[1] - g[1]); dx, dy = (tip[0] - g[0]) / L, (tip[1] - g[1]) / L; n = int(round(L))
    flat = abs(tip[1] - g[1]) < 1.5                         # 거의 수평인 칼(3타 찌르기)은 한 줄로 — 반올림으로 1칸 꺾이지 않게 (2026-11-05 director)
    for i in range(1, n + 1):
        x, y = g[0] + dx * i, (tip[1] if flat else g[1] + dy * i); put(o, x, y, (*STEEL[1], 255))
        if i < n - 1: put(o, x, y + (1 if abs(dy) < 0.8 else 0) , (*STEEL[0], 255)) if abs(dy) < 0.8 else put(o, x + 1, y, (*STEEL[0], 255))
    put(o, tip[0], tip[1], (*STEEL[1], 255))

def frame(i):
    a, removed = strip_blade(FR[i]); a, scab = dark_scabbard(a, i)
    for x0, y0, x1, y1 in CLEAR.get(i, []): a[y0:y1, x0:x1] = 0
    ys, _ = np.nonzero(a[..., 3] > 0); fy = ys.max()       # 발바닥(장마다)
    tocell = lambda p: (FOOTX + (p[0] - FX0) * scale, SOLE + (p[1] - (fy + 1)) * scale)
    info = {'gif_frame': i, 'removed_blade_px': removed, 'scabbard_recolored_px': scab}
    sh = 0
    if i in BLADES:
        g0, e0 = map(tocell, BLADES[i]); d = (e0[0] - g0[0], e0[1] - g0[1]); L = math.hypot(*d); u = (d[0] / L, d[1] / L)
        if i == 7:                                          # 1타: 칼끝을 판정 56px 칸(x 59)까지 — AI 칼 방향 그대로
            t = (59 - g0[0]) / u[0]; tip = (59, g0[1] + u[1] * t); info['blade_cells'] = round(t, 1)
        elif i == 12:                                       # 3타 찌르기: 그림은 물리지 않고(몸이 앞으로) 칼날을 칼끝 x 59 까지만 — 2026-11-05 오너 "좋아"(추천 (가))
            tip = (59, g0[1] + u[1] * (59 - g0[0]) / u[0])
            xs_ = np.nonzero((a[..., 3] > 0).any(0))[0]; info['cut_back_cells'] = max(0, -int(math.floor(FOOTX + (xs_.min() - FX0) * scale)))   # 칸 0 밖으로 잘린 망토·띠 (칸 수)
        else:
            tip = (g0[0] + u[0] * BLADE, g0[1] + u[1] * BLADE)
    o = place_at(a, FX0 - sh / scale, fy); clean(o); outline(o)
    if i in BLADES:
        tp = (int(round(tip[0])), int(round(tip[1]))); blade(o, (g0[0], g0[1]), tp)
        info.update(guard_cell=[round(g0[0], 1), round(g0[1], 1)], tip_cell=list(tp), tip_front_px=(tp[0] + 1 - FOOTX) * 2, tip_height_px=(60.5 - tp[1] - 1) * 2,
                    blade_px=round(2 * math.hypot(tp[0] - g0[0], tp[1] - g0[1]), 1), shift_cells=sh)
    return o, info

ORDER = [0, 1, 2, 3, 4, 5, 7, 11, 12, 14, 13]              # 시트 칸 0~10 ← GIF 장 번호
cells, infos = [], []
for i in ORDER: o, inf = frame(i); cells.append(o); infos.append(inf)
sheet = np.concatenate(cells, axis=1)
Image.fromarray(sheet, 'RGBA').save(os.path.join(OUT, 'mugyeom-ai-b5.png'))
b4 = np.array(Image.open(os.path.join(ROOT, 'assets', 'sprites', 'trial', 'ai', 'mugyeom-ai-b4.png')).convert('RGBA'))
Image.fromarray(np.concatenate([b4, sheet], axis=1), 'RGBA').save(os.path.join(OUT, 'mugyeom-ai-b5-test.png'))   # 시험판용: B4 12칸 + B5 11칸(칸 12~22) — GIF 에 없는 칸은 B4 를 씀
def top_px(o): ys = np.nonzero(o[:, :, 3].any(axis=1))[0]; return int((SOLE - ys.min()) * 2)
report = {'source': 'assets/reference/ai-sprite-gif/mugyeom-anim-15.gif', 'cells_per_source_px': round(scale, 4), 'anchor_x_src': FX0, 'order (시트 칸 ← GIF 장)': ORDER,
          'cells': [dict(inf, height_px=top_px(o)) for o, inf in zip(cells, infos)], 'colors': int(len({tuple(c) for c in sheet[sheet[:, :, 3] > 0][:, :3]}))}
json.dump(report, open(os.path.join(OUT, 'report-b5.json'), 'w'), ensure_ascii=False, indent=1)
print(json.dumps(report, ensure_ascii=False))
