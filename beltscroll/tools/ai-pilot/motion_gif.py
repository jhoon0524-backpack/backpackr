# B3 움직임 GIF (2026-11-04): python3 -I tools/ai-pilot/motion_gif.py <저장소 beltscroll 폴더>
#  python3 -I tools/ai-pilot/motion_gif.py <폴더> b4 → A·B3·B4 (b4-motion*.gif)
#  2026-11-04 오너 결정: 기본 출력은 tests/out/ai-pilot (저장소에 안 올라감). 단계가 끝날 때만 끝에 --docs 를 붙여 docs/ai-pilot 에 저장·커밋
#  compare-b3.js 가 찍은 PC 실제 화면 매 프레임(tests/out/ai-pilot/b3-motion-*.png)을 A·B2·B3 나란히, 2배 확대해 GIF 로
#  b3-motion.gif      : 실제 속도 — 게임 60프레임/초를 2프레임마다 1장(30장/초, 30·35·35ms 반복 = 평균 33.3ms) → 준비 5f 는 2~3장
#  b3-motion-slow.gif : 매 프레임 1장 70ms (약 4배 느림) — 칸이 바뀌는 순간 확인용
import sys, os, json
from PIL import Image, ImageDraw
ARGS = [a for a in sys.argv[1:] if a != '--docs']; ROOT = ARGS[0]; R = ARGS[1] if len(ARGS) > 1 else 'b3';   # b4 → A·B3·B4
OUT = os.path.join(ROOT, 'tests', 'out', 'ai-pilot'); D = os.path.join(ROOT, 'docs', 'ai-pilot') if '--docs' in sys.argv else OUT
names = json.load(open(os.path.join(OUT, f'{R}-motion.json'))); V = {'b4': ['A', 'B3', 'B4'], 'b4m': ['NOW', 'B4']}.get(R, ['A', 'B2', 'B3'])   # b4m = 걷기·점프·맞음 (b4_moves_gif.js)
LABEL = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'labels.json')))   # 판 이름: compare-b3.js 와 같은 파일
frames = []
for i in range(len(names[V[0]])):
    ims = [Image.open(os.path.join(OUT, f'{R}-motion-{v}-{i:02d}.png')).convert('RGB') for v in V]
    Z = 1 if R == 'b4m' else 2                                   # b4m(프레임 많음)은 확대 없이 — 파일 크기 (2026-11-04 director)
    w, h = ims[0].size; o = Image.new('RGB', (len(V) * (w * Z + 10) + 10, h * Z + 24), (21, 21, 28)); d = ImageDraw.Draw(o)
    for k, (v, im) in enumerate(zip(V, ims)):
        o.paste(im.resize((w * Z, h * Z), Image.NEAREST), (10 + k * (w * Z + 10), 22)); d.text((10 + k * (w * Z + 10), 5), f'{LABEL[v]} · {names[v][i]}', fill=(220, 220, 220))
    frames.append(o.convert('P', palette=Image.ADAPTIVE, colors=255))
real = frames[::2]; dur = [30 if j % 3 == 0 else 35 for j in range(len(real))]
real[0].save(os.path.join(D, f'{R}-motion.gif'), save_all=True, append_images=real[1:], duration=dur, loop=0, disposal=1)
frames[0].save(os.path.join(D, f'{R}-motion-slow.gif'), save_all=True, append_images=frames[1:], duration=70, loop=0, disposal=1)
print('frames', len(frames), 'real', len(real), 'avg ms', round(sum(dur) / len(dur), 1))
