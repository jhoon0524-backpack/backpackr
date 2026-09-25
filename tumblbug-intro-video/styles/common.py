"""스타일 시안 공통: 영상 인코딩, 스토리보드(시안) 이미지 생성

모든 시안 스크립트는 tumblbug-intro-video 폴더에서 실행합니다.
  예) python3 styles/style_a_kinetic.py
"""
import os
import subprocess
import sys

import imageio_ffmpeg
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from make_video import (ACCENTS, CORAL, CREAM, DARK, GRAY, WHITE, clamp, ease_back,  # noqa: E402,F401
                        ease_in_out, ease_out, emoji, font, lerp, mix, paste_center, prog, text)

OUT = "styles/samples"
FPS = 30


def encode(render, w, h, dur, wav, out):
    os.makedirs(OUT, exist_ok=True)
    cmd = [imageio_ffmpeg.get_ffmpeg_exe(), "-y", "-loglevel", "error",
           "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{w}x{h}", "-r", str(FPS), "-i", "-",
           "-i", wav, "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", f"{OUT}/{out}"]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for i in range(int(dur * FPS)):
        t = i / FPS
        img = render(t).convert("RGB")
        fade = clamp(t / 0.25) * clamp((dur - t) / 0.6)
        if fade < 1:
            img = Image.blend(Image.new("RGB", img.size, (0, 0, 0)), img, fade)
        proc.stdin.write(img.tobytes())
    proc.stdin.close()
    proc.wait()
    print("완료:", f"{OUT}/{out}")


def storyboard(render, shots, title, lines, out, vertical=False):
    """shots: [(초, 설명)] → 시안 한 장(제목 + 장면 6컷 + 설명)"""
    os.makedirs(OUT, exist_ok=True)
    tw, th = (300, 533) if vertical else (600, 338)
    cols = 6 if vertical else 3
    rows = (len(shots) + cols - 1) // cols
    gap, head = 30, 230
    W = cols * tw + (cols + 1) * gap
    H = head + rows * (th + 90) + gap
    sheet = Image.new("RGBA", (W, H), WHITE + (255,))
    d = ImageDraw.Draw(sheet)
    d.rectangle((0, 0, W, 8), fill=CORAL)
    d.text((gap, 60), title, font=font("Black", 52), fill=DARK, anchor="lm")
    for i, ln in enumerate(lines):
        d.text((gap, 120 + i * 36), ln, font=font("Medium", 26), fill=GRAY, anchor="lm")
    for i, (t, cap) in enumerate(shots):
        x = gap + (i % cols) * (tw + gap)
        y = head + (i // cols) * (th + 90)
        frame = render(t).convert("RGB").resize((tw, th), Image.LANCZOS)
        sheet.paste(frame, (x, y))
        d.rectangle((x, y, x + tw - 1, y + th - 1), outline=(225, 222, 224), width=2)
        d.rounded_rectangle((x, y + th + 12, x + 72, y + th + 44), 8, fill=DARK)
        d.text((x + 36, y + th + 28), f"{t:.0f}초", font=font("Bold", 20), fill=WHITE, anchor="mm")
        d.text((x + 84, y + th + 28), cap, font=font("Bold", 22), fill=DARK, anchor="lm")
    sheet.convert("RGB").save(f"{OUT}/{out}", quality=92)
    print("완료:", f"{OUT}/{out}")
