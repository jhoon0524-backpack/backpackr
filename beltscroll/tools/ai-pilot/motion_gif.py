# B3 움직임 GIF (2026-11-04): python3 -I tools/ai-pilot/motion_gif.py <저장소 beltscroll 폴더>
#  compare-b3.js 가 찍은 PC 실제 화면 매 프레임(tests/out/ai-pilot/b3-motion-*.png)을 A·B2·B3 나란히, 2배 확대해 GIF 로
#  b3-motion.gif      : 실제 속도 — 게임 60프레임/초를 2프레임마다 1장(30장/초, 30·35·35ms 반복 = 평균 33.3ms) → 준비 5f 는 2~3장
#  b3-motion-slow.gif : 매 프레임 1장 70ms (약 4배 느림) — 칸이 바뀌는 순간 확인용
import sys, os, json
from PIL import Image, ImageDraw
ROOT = sys.argv[1]; OUT = os.path.join(ROOT, 'tests', 'out', 'ai-pilot'); D = os.path.join(ROOT, 'docs', 'ai-pilot')
names = json.load(open(os.path.join(OUT, 'b3-motion.json'))); V = ['A', 'B2', 'B3']
LABEL = {'A': 'A 코드 시안', 'B2': 'B2 AI 자동 보정', 'B3': 'B3 AI 디자인+도트 보정'}
frames = []
for i in range(len(names['A'])):
    ims = [Image.open(os.path.join(OUT, f'b3-motion-{v}-{i:02d}.png')).convert('RGB') for v in V]
    w, h = ims[0].size; o = Image.new('RGB', (3 * w * 2 + 40, h * 2 + 24), (21, 21, 28)); d = ImageDraw.Draw(o)
    for k, (v, im) in enumerate(zip(V, ims)):
        o.paste(im.resize((w * 2, h * 2), Image.NEAREST), (10 + k * (w * 2 + 10), 22)); d.text((10 + k * (w * 2 + 10), 5), f'{LABEL[v]} · {names[v][i]}', fill=(220, 220, 220))
    frames.append(o.convert('P', palette=Image.ADAPTIVE, colors=255))
real = frames[::2]; dur = [30 if j % 3 == 0 else 35 for j in range(len(real))]
real[0].save(os.path.join(D, 'b3-motion.gif'), save_all=True, append_images=real[1:], duration=dur, loop=0, disposal=1)
frames[0].save(os.path.join(D, 'b3-motion-slow.gif'), save_all=True, append_images=frames[1:], duration=70, loop=0, disposal=1)
print('frames', len(frames), 'real', len(real), 'avg ms', round(sum(dur) / len(dur), 1))
