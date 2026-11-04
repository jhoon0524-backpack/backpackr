# B4 요청 참고 그림 (2026-11-04): python3 -I tools/ai-pilot/b4_ref.py <ai-sprite-pilot 폴더> <출력 폴더>
#  AI 서기 원본(00_idle)의 칼집만 오너 결정 색(검은색·짙은 남청색, 금속 장식만 금색)으로 바꾼 참고 그림.
#  칼집 = 코등이 아래 (95,180) → 칼집 끝 (28,230) 선에서 6px 안의 금갈색 칸. 양 끝 7px(칼집 입구·끝 장식)·코등이·손(피부)·손잡이는 그대로.
#  출력: ref-idle-dark-scabbard.png (원본 크기, 투명 배경), ref-idle-dark-scabbard-x2.png (2배, 흙바닥 배경 — 확인용)
import sys, os
from PIL import Image
import numpy as np
SRC, OUT = sys.argv[1], sys.argv[2]; os.makedirs(OUT, exist_ok=True)
a = np.array(Image.open(os.path.join(SRC, 'frames', '00_idle.png')).convert('RGBA')).astype(np.int32)
P0, P1 = np.array([95.0, 180.0]), np.array([28.0, 230.0]); d = P1 - P0; L = np.hypot(*d); u = d / L
ys, xs = np.mgrid[0:a.shape[0], 0:a.shape[1]]
t = (xs - P0[0]) * u[0] + (ys - P0[1]) * u[1]; dist = np.abs((xs - P0[0]) * u[1] - (ys - P0[1]) * u[0])
r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
goldish = (r > g) & (g > b) & (r - b > 35) & (b < 120) & (a[:, :, 3] > 0)
m = goldish & (dist <= 6) & (t > 7) & (t < L - 7)
lum = (r * 3 + g * 6 + b) / 10
k = np.clip((lum - 40) / 160, 0, 1)[..., None]
DARK, HI = np.array([16, 18, 34]), np.array([58, 66, 104])        # 검은색 → 짙은 남청 (밝은 결은 남청 하이라이트)
a[m, :3] = (DARK + (HI - DARK) * k)[m].astype(np.int32)
img = Image.fromarray(a.astype(np.uint8), 'RGBA'); img.save(os.path.join(OUT, 'ref-idle-dark-scabbard.png'))
bg = Image.new('RGBA', img.size, (74, 66, 54, 255)); bg.alpha_composite(img); bg.resize((img.width * 2, img.height * 2), Image.NEAREST).save(os.path.join(OUT, 'ref-idle-dark-scabbard-x2.png'))
print('recolored px', int(m.sum()))

# 목표 위치 그림 (오너가 받은 그림을 눈으로 확인할 때 · 변환 기준): 원본 픽셀로 환산 — 2px 칸 1개 = 화면 2px = 원본 5.49px (서기 키 302px = 55칸)
from PIL import ImageDraw
al = a[:, :, 3] >= 128; ys2, xs2 = np.nonzero(al); top, bot = ys2.min(), ys2.max()
band = ys2 > bot - (bot - top) * 0.12; fx = (xs2[band].min() + xs2[band].max()) / 2   # 두 발 가운데 (convert.py 와 같은 식)
spx = (bot - top + 1) / 55 / 2                                                          # 화면 1px = 원본 몇 px
W = int(fx + 70 * spx) + 10; PAD = 24; cv = Image.new('RGBA', (W, a.shape[0] + 20 + PAD), (74, 66, 54, 255)); cv.alpha_composite(img, (0, PAD)); d = ImageDraw.Draw(cv)
gy = bot + 1 + PAD; X = lambda px: fx + px * spx; Y = lambda px: gy - px * spx
d.line([(0, gy), (W, gy)], fill=(90, 200, 255)); d.line([(fx, 0), (fx, gy)], fill=(90, 200, 255))      # 바닥·몸 중심(두 발 가운데)
d.line([(0, Y(110)), (W, Y(110))], fill=(120, 220, 120)); d.line([(0, Y(100)), (W, Y(100))], fill=(220, 220, 120))   # 키 110 / 공격 최저 100
d.line([(X(56), 0), (X(56), gy)], fill=(255, 90, 90)); r0 = 3
d.ellipse([X(56) - r0, Y(31) - r0, X(56) + r0, Y(31) + r0], outline=(255, 90, 90), width=2)               # 1타 칼끝 목표 (앞 56, 높이 31)
d.text((X(56) - 60, Y(31) + 6), 'tip 56/31', fill=(255, 140, 140)); d.text((4, Y(110) - 12), 'H110', fill=(120, 220, 120)); d.text((4, Y(100) + 2), 'H100', fill=(220, 220, 120))
cv = cv.resize((cv.width * 2, cv.height * 2), Image.NEAREST); cv.save(os.path.join(OUT, 'b4-target-guide.png'))
print('feet center x', round(float(fx), 1), 'ground y', int(gy - PAD), 'src px per screen px', round(float(spx), 3), 'tip target src', round(float(X(56)), 1), round(float(Y(31) - PAD), 1))
