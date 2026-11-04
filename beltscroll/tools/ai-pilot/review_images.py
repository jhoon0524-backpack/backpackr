# 검토용 그림 (2026-11-04 AI 실험): python3 -I tools/ai-pilot/review_images.py <저장소 beltscroll 폴더> <분석 출력 폴더(components.png 있는 곳)>
#  docs/ai-pilot/sheet-zoom.png   : A·B1·B2 서기·1타 칸 8배 확대 (흙바닥 색 배경, 하늘색 = 몸 중심·바닥, 빨강 = 칼끝 56px)
#  docs/ai-pilot/fx-review.png    : 1타 — 본체만 / 베기 이펙트만 / 겹친 모습 (4배) + 실제 게임 크기(2배)
#  docs/ai-pilot/consistency.png  : AI 원본 15장 — 몸통과 떨어진 조각(분홍) 표시 (analyze.py 결과)
import sys, os, shutil
from PIL import Image, ImageDraw
ROOT, ANA = sys.argv[1], sys.argv[2]
D = os.path.join(ROOT, 'docs', 'ai-pilot'); os.makedirs(D, exist_ok=True)
BG = (74, 66, 54, 255)
def cell(path, i): return Image.open(os.path.join(ROOT, path)).convert('RGBA').crop((i * 64, 0, i * 64 + 64, 64))
def zoom(im, z): return im.resize((im.width * z, im.height * z), Image.NEAREST)
def guides(img, z):
    d = ImageDraw.Draw(img)
    d.line([(32 * z, 0), (32 * z, 64 * z)], fill=(90, 200, 255, 255), width=1)
    d.line([(0, 62 * z), (64 * z, 62 * z)], fill=(90, 200, 255, 255), width=1)
    d.line([(60 * z, 0), (60 * z, 64 * z)], fill=(255, 90, 90, 255), width=1)   # 칼끝 56px = 칸 경계 60
    return img
SHEETS = [('A 지금 2px 코드 시안', 'assets/sprites/trial/mugyeom-2px.png'), ('B1 AI 단순 축소', 'assets/sprites/trial/ai/mugyeom-ai-b1.png'), ('B2 AI 보정', 'assets/sprites/trial/ai/mugyeom-ai-b2.png')]
Z = 8; W = 64 * Z
out = Image.new('RGBA', (3 * (W + 16) + 16, 2 * (W + 16) + 16), (22, 22, 28, 255))
for c, (label, path) in enumerate(SHEETS):
    for r in range(2):
        t = Image.new('RGBA', (64, 64), BG); t.alpha_composite(cell(path, r)); t = guides(zoom(t, Z), Z)
        out.alpha_composite(t, (16 + c * (W + 16), 16 + r * (W + 16)))
out.save(os.path.join(D, 'sheet-zoom.png'))
body = cell('assets/sprites/trial/ai/mugyeom-ai-b2.png', 1); fx = Image.open(os.path.join(ROOT, 'assets/sprites/trial/ai/fx-downslash-b2.png')).convert('RGBA')
fx_t = fx.copy(); a = fx_t.split()[3].point(lambda v: int(v * 0.8)); fx_t.putalpha(a)   # 이펙트는 80% 불투명으로 겹쳐 봄
both = body.copy(); both.alpha_composite(fx_t)
Z2 = 4; tiles = []
for im in (body, fx, both):
    t = Image.new('RGBA', (64, 64), BG); t.alpha_composite(im); tiles.append(guides(zoom(t, Z2), Z2))
small = []
for im in (body, both):
    t = Image.new('RGBA', (64, 64), BG); t.alpha_composite(im); small.append(zoom(t, 2))
fxr = Image.new('RGBA', (3 * (256 + 12) + 12 + 2 * (128 + 12), 256 + 24), (22, 22, 28, 255))
for i, t in enumerate(tiles): fxr.alpha_composite(t, (12 + i * 268, 12))
for i, t in enumerate(small): fxr.alpha_composite(t, (12 + 3 * 268 + i * 140, 12 + 128))
fxr.save(os.path.join(D, 'fx-review.png'))
shutil.copy(os.path.join(ANA, 'components.png'), os.path.join(D, 'consistency.png'))
print('ok')
