# 몸 움직임 재기 (2026-11-04 B4): python3 -I tools/ai-pilot/motion_measure.py <시트 PNG>...  (64×64 칸 3개: 서기·준비·1타)
#  얼굴 = 맨 윗줄 아래 6~13줄·칸 30~51 의 피부색 칸 가운데 (B3 준비의 손(칸 26~28)·B4 준비의 손(23~24줄)과 안 섞이게 좁힘), 발 = 발끝 3줄(59~61)의 덩어리 좌우 끝
#  값은 기준점(칸 32, 바닥선 footY 60.5) 기준 화면 px. 앞 +, 위 +
import sys
import numpy as np
from PIL import Image
SK = {(206, 157, 120), (246, 214, 176)}                       # B3·B4 팔레트 피부 2색
for f in sys.argv[1:]:
    a = np.array(Image.open(f).convert('RGBA')).astype(int)
    for i, n in enumerate(['idle', 'windup', 'punch']):
        s = a[:, i * 64:(i + 1) * 64]; top = np.nonzero((s[..., 3] > 0).any(1))[0].min()
        pts = [(x, y) for y in range(top + 6, top + 14) for x in range(30, 52) if s[y, x, 3] and tuple(s[y, x, :3]) in SK]
        fx = (np.mean([p[0] for p in pts]) + 0.5 - 32) * 2; fy = (60.5 - np.mean([p[1] for p in pts]) - 0.5) * 2
        feet = np.nonzero((s[59:62, :, 3] > 0).any(0))[0]; runs = []
        for x in feet:
            if runs and x == runs[-1][1] + 1: runs[-1][1] = x
            else: runs.append([x, x])
        print(f.split('/')[-1], n, f'얼굴 앞 {fx:.1f} 높이 {fy:.1f} (칸 {len(pts)}) · 발', ' / '.join(f'{(r[0] - 32) * 2}~{(r[1] + 1 - 32) * 2}' for r in runs))
