#!/usr/bin/env python3
"""Resize and compress an image for web delivery. Args: input output [max_side]"""
import sys
from pathlib import Path

try:
    from PIL import Image, ImageOps
except ImportError:
    sys.exit(2)

MAX_SIDE = 1600
JPEG_QUALITY = 78
WEBP_QUALITY = 80


def main():
    if len(sys.argv) < 3:
        print('usage: compress_image.py input output [max_side]', file=sys.stderr)
        sys.exit(1)
    src = Path(sys.argv[1])
    dst = Path(sys.argv[2])
    max_side = int(sys.argv[3]) if len(sys.argv) > 3 else MAX_SIDE

    img = Image.open(src)
    img = ImageOps.exif_transpose(img)

    w, h = img.size
    if max(w, h) > max_side:
        img.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)

    ext = dst.suffix.lower()
    save_kwargs = {}
    if ext in ('.jpg', '.jpeg'):
        if img.mode in ('RGBA', 'P', 'LA'):
            bg = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            bg.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
            img = bg
        elif img.mode != 'RGB':
            img = img.convert('RGB')
        save_kwargs = dict(format='JPEG', quality=JPEG_QUALITY, optimize=True, progressive=True)
    elif ext == '.webp':
        save_kwargs = dict(format='WEBP', quality=WEBP_QUALITY, method=4)
    elif ext == '.png':
        if img.mode == 'P':
            img = img.convert('RGBA')
        save_kwargs = dict(format='PNG', optimize=True)
    elif ext == '.gif':
        # Keep first frame only if animated — avoid heavy gifs growing
        img.save(dst, format='GIF', optimize=True)
        return
    else:
        img.save(dst)
        return

    img.save(dst, **save_kwargs)


if __name__ == '__main__':
    main()
