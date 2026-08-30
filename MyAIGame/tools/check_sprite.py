#!/usr/bin/env python3
"""ART_SPEC.md 의 팔레트와 그리기 규칙을 스프라이트가 지켰는지 검사한다.

    python3 tools/check_sprite.py assets/sprites/pixelmong.png
    python3 tools/check_sprite.py assets/sprites/*.png --fix

--fix 를 주면 팔레트 밖 색을 가장 가까운 팔레트 색으로 바꿔 덮어쓴다.
AI 생성기는 팔레트를 정확히 지키지 못하므로 통과 여부만 보지 말고 고쳐서 쓴다.
"""

import sys
from pathlib import Path

from PIL import Image

# ART_SPEC.md 2번 팔레트. 문서를 고치면 여기도 함께 고친다.
PALETTE = [
    (0xFF, 0xB3, 0xA7), (0xF4, 0x79, 0x6B), (0xC4, 0x57, 0x4C), (0x8E, 0x3A, 0x33),
    (0xA7, 0xD8, 0xFF), (0x6B, 0xAE, 0xF4), (0x4C, 0x7F, 0xC4), (0x33, 0x57, 0x8E),
    (0xD4, 0xBB, 0xFF), (0xA8, 0x7D, 0xF4), (0x7C, 0x57, 0xC4), (0x55, 0x3A, 0x8E),
    (0xA7, 0xF4, 0xC8), (0x6B, 0xD9, 0xA0), (0x4C, 0xA6, 0x78), (0x33, 0x75, 0x55),
    (0xFF, 0xFF, 0xFF), (0xF5, 0xF0, 0xE8), (0xDC, 0xD3, 0xC6), (0xB5, 0xA9, 0x9A),
    (0x8A, 0x7D, 0x6E), (0x5C, 0x52, 0x47), (0x33, 0x2E, 0x28),
]

# ART_SPEC.md 1번 캔버스 크기
ALLOWED_SIZES = {(16, 16), (32, 32), (48, 48), (64, 64), (640, 360)}


def nearest(rgb):
    return min(PALETTE, key=lambda p: sum((a - b) ** 2 for a, b in zip(rgb, p)))


def check(path, fix=False):
    img = Image.open(path).convert("RGBA")
    w, h = img.size
    px = img.load()

    off_palette = {}
    semi_alpha = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if a != 255:
                semi_alpha += 1
                if fix:
                    a = 255
            if (r, g, b) not in PALETTE:
                off_palette[(r, g, b)] = off_palette.get((r, g, b), 0) + 1
                if fix:
                    r, g, b = nearest((r, g, b))
            if fix:
                px[x, y] = (r, g, b, a)

    problems = []
    if (w, h) not in ALLOWED_SIZES:
        problems.append(f"캔버스 크기 {w}x{h} 는 규격에 없다")
    if off_palette:
        top = sorted(off_palette.items(), key=lambda kv: -kv[1])[:3]
        shown = ", ".join(f"#{r:02X}{g:02X}{b:02X}({n}px)" for (r, g, b), n in top)
        problems.append(f"팔레트 밖 색 {len(off_palette)}종 {sum(off_palette.values())}px — {shown}")
    if semi_alpha:
        problems.append(f"반투명 픽셀 {semi_alpha}px — 안티에일리어싱 흔적")

    if fix and (off_palette or semi_alpha):
        img.save(path)
        print(f"[고침] {path}")
        for p in problems:
            print(f"        {p}")
        return True

    if problems:
        print(f"[실패] {path}")
        for p in problems:
            print(f"        {p}")
        return False

    print(f"[통과] {path}")
    return True


def main():
    args = [a for a in sys.argv[1:] if a != "--fix"]
    fix = "--fix" in sys.argv[1:]
    if not args:
        print(__doc__)
        return 1
    results = [check(Path(a), fix) for a in args]
    return 0 if all(results) else 1


if __name__ == "__main__":
    sys.exit(main())
