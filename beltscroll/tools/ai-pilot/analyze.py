# AI 레퍼런스 15장 일관성 검사 (2026-11-04 실험): python3 -I tools/ai-pilot/analyze.py <ai-sprite-pilot 폴더> <출력 폴더>
#  - 반투명 가장자리 칸 수, 몸통(가장 큰 덩어리)과 떨어진 조각(잘린 이웃 동작·베기 이펙트 후보), 인물 키·폭, 색 구성 비율
#  - 조각을 분홍으로 표시한 확인용 그림 components.png
import sys, os, json
from PIL import Image, ImageDraw
import numpy as np

SRC, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
idx = json.load(open(os.path.join(SRC, 'frame_index.json')))

# 색 묶음 (사람 눈 기준 대략): 남청 도포 / 검은 망토·머리 / 흰 소매·바지 / 주홍 끈 / 금색 장식 / 피부 / 칼날(밝은 회청) / 기타
def color_class(r, g, b):
    mx, mn = max(r, g, b), min(r, g, b)
    if mx < 45: return 'black'
    if r > 150 and g < 90 and b < 90: return 'red'
    if r > 140 and g > 100 and b < 90 and r - b > 60: return 'gold'
    if r > 170 and g > 120 and b > 90 and r > b + 25 and mx - mn < 110: return 'skin'
    if mn > 190 and mx - mn < 40: return 'white'
    if mn > 140 and b >= r and mx - mn < 70: return 'steel'
    if b > r + 15 and b > 60: return 'navy'
    return 'other'

def components(mask):
    h, w = mask.shape
    lab = np.zeros((h, w), np.int32); n = 0; sizes = []
    for y in range(h):
        for x in range(w):
            if mask[y, x] and not lab[y, x]:
                n += 1; st = [(y, x)]; lab[y, x] = n; cnt = 0; ys = []; xs = []
                while st:
                    cy, cx = st.pop(); cnt += 1; ys.append(cy); xs.append(cx)
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            ny, nx = cy + dy, cx + dx
                            if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not lab[ny, nx]:
                                lab[ny, nx] = n; st.append((ny, nx))
                sizes.append((n, cnt, min(xs), min(ys), max(xs), max(ys)))
    return lab, sizes

rows = []; tiles = []
for f in idx['frames']:
    im = Image.open(os.path.join(SRC, f['file'])).convert('RGBA'); a = np.array(im)
    alpha = a[:, :, 3]; semi = int(((alpha > 0) & (alpha < 250)).sum()); near = int(((alpha >= 250) & (alpha < 255)).sum()); opaque = alpha >= 128   # 반투명 가장자리(1~249) / 거의 불투명(250~254, 안쪽 대부분)
    lab, comps = components(opaque)
    comps.sort(key=lambda c: -c[1]); main = comps[0]
    stray = [c for c in comps[1:] if c[1] >= 15]   # 15칸 이상 떨어진 조각
    m = lab == main[0]
    ys, xs = np.nonzero(m)
    cls = {}
    for (y, x) in zip(ys[::3], xs[::3]):
        r, g, b = (int(v) for v in a[y, x, :3]); k = color_class(r, g, b); cls[k] = cls.get(k, 0) + 1
    tot = sum(cls.values())
    pct = {k: round(100 * v / tot) for k, v in sorted(cls.items(), key=lambda kv: -kv[1])}
    # 칼날 칸이 몸통 덩어리 밖(떨어진 조각)에 있는지
    stray_steel = 0
    for c in stray:
        sy, sx = np.nonzero(lab == c[0])
        for (y, x) in zip(sy, sx):
            r, g, b = (int(v) for v in a[y, x, :3])
            if color_class(r, g, b) in ('steel', 'white'): stray_steel += 1
    rows.append({'name': f['name'], 'size': [im.width, im.height], 'semi_edge_px': semi, 'near_opaque_px': near,
                 'main_bbox': [int(main[2]), int(main[3]), int(main[4]), int(main[5])], 'main_h': int(main[5] - main[3] + 1), 'main_w': int(main[4] - main[2] + 1),
                 'stray_pieces': len(stray), 'stray_px': int(sum(c[1] for c in stray)), 'stray_light_px': stray_steel, 'colors_pct': pct})
    # 확인용: 몸통은 그대로, 떨어진 조각은 분홍
    vis = im.copy(); px = vis.load()
    for c in stray:
        sy, sx = np.nonzero(lab == c[0])
        for (y, x) in zip(sy, sx): px[int(x), int(y)] = (255, 60, 200, 255)
    t = Image.new('RGBA', (240, 360), (44, 46, 56, 255)); vis.thumbnail((236, 330)); t.alpha_composite(vis, (2, 2))
    ImageDraw.Draw(t).text((4, 340), f"{f['name']}  stray {len(stray)}", fill=(230, 230, 230, 255)); tiles.append(t)

sheet = Image.new('RGBA', (240 * 5, 360 * 3), (30, 30, 36, 255))
for i, t in enumerate(tiles): sheet.alpha_composite(t, ((i % 5) * 240, (i // 5) * 360))
sheet.save(os.path.join(OUT, 'components.png'))
json.dump(rows, open(os.path.join(OUT, 'analysis.json'), 'w'), ensure_ascii=False, indent=1)
for r in rows:
    print(f"{r['name']:<20} 칸 {r['size'][0]}x{r['size'][1]} 몸통 {r['main_w']}x{r['main_h']} 반투명 가장자리 {r['semi_edge_px']:>5} 안쪽 250~254 {r['near_opaque_px']:>5} 떨어진 조각 {r['stray_pieces']}개 {r['stray_px']}px(밝은색 {r['stray_light_px']}) 색 {r['colors_pct']}")
