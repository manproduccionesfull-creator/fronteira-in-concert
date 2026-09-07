#!/usr/bin/env python3
"""Center face + upper body for professor circle photos."""
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

SIZE = 800
# Person fills most of the circle but face stays inside
FILL = 0.78


def detect_faces(bgr):
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    gray = cv2.equalizeHist(gray)
    faces = []
    for name in (
        "haarcascade_frontalface_default.xml",
        "haarcascade_frontalface_alt2.xml",
    ):
        cascade = cv2.CascadeClassifier(cv2.data.haarcascades + name)
        found = cascade.detectMultiScale(
            gray, scaleFactor=1.1, minNeighbors=5, minSize=(70, 70)
        )
        for f in found:
            faces.append(tuple(map(int, f)))
    uniq = []
    for x, y, w, h in faces:
        if any(abs(x - x2) < w * 0.4 and abs(y - y2) < h * 0.4 for x2, y2, w2, h2 in uniq):
            continue
        uniq.append((x, y, w, h))
    return uniq


def pick_main_face(faces, w, h):
    if not faces:
        return None
    scored = []
    for x, y, fw, fh in faces:
        cy = y + fh / 2.0
        if cy > h * 0.70 and h >= w * 1.1:
            continue  # ignore low false positives on stage photos
        area = fw * fh
        upper = 1.5 if cy < h * 0.55 else 1.0
        cx = x + fw / 2.0
        center = 1.0 - abs(cx - w / 2.0) / (w / 2.0) * 0.2
        scored.append((area * upper * center, (x, y, fw, fh)))
    if not scored:
        return None
    scored.sort(key=lambda t: t[0], reverse=True)
    return scored[0][1]


def clamp_box(w, h, left, top, right, bottom):
    left = max(0, int(left))
    top = max(0, int(top))
    right = min(w, int(right))
    bottom = min(h, int(bottom))
    if right <= left or bottom <= top:
        return 0, 0, w, h
    return left, top, right, bottom


def square_box(w, h, cx, cy, side):
    side = float(min(max(side, 1), w, h))
    half = side / 2.0
    left = cx - half
    top = cy - half
    if left < 0:
        left = 0
    if top < 0:
        top = 0
    if left + side > w:
        left = w - side
    if top + side > h:
        top = h - side
    left, top = max(0, int(round(left))), max(0, int(round(top)))
    side_i = int(min(side, w - left, h - top))
    return left, top, left + side_i, top + side_i


def choose_crop(w, h, faces):
    face = pick_main_face(faces, w, h)
    if face:
        x, y, fw, fh = face
        # Face + upper body: expand down from face
        top = y - fh * 0.55  # headroom
        bottom = y + fh * 3.2  # shoulders / chest / instrument
        left = x - fw * 1.4
        right = x + fw * 2.4
        # Make square around that region
        cx = (left + right) / 2.0
        cy = (top + bottom) / 2.0
        side = max(right - left, bottom - top) * 1.05
        side = max(side, max(fw, fh) * 3.2)
        side = min(side, min(w, h))
        return square_box(w, h, cx, cy, side)

    # No face: upper-body portrait heuristic
    if h >= w * 1.1:
        side = min(w * 0.95, h * 0.55)
        return square_box(w, h, w * 0.5, h * 0.28, side)
    side = min(w, h)
    return square_box(w, h, w / 2.0, h / 2.0, side)


def process(src: Path, dest: Path):
    data = np.fromfile(str(src), dtype=np.uint8)
    bgr = cv2.imdecode(data, cv2.IMREAD_COLOR)
    if bgr is None:
        im = Image.open(src).convert("RGB")
        bgr = cv2.cvtColor(np.array(im), cv2.COLOR_RGB2BGR)
    h, w = bgr.shape[:2]
    faces = detect_faces(bgr)
    left, top, right, bottom = choose_crop(w, h, faces)
    crop = bgr[top:bottom, left:right]
    rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
    person = Image.fromarray(rgb)

    # Fit into square canvas centered — fills circle, face kept
    max_dim = int(SIZE * FILL)
    cw, ch = person.size
    ratio = max_dim / max(cw, ch)
    nw, nh = max(1, int(cw * ratio)), max(1, int(ch * ratio))
    person = person.resize((nw, nh), Image.Resampling.LANCZOS)

    # background from crop average edge
    edge = rgb[0, 0].tolist() if rgb.size else [20, 20, 20]
    if sum(edge) > 500:
        bg = tuple(int(x) for x in edge)
    else:
        bg = (12, 12, 12)
    out = Image.new("RGB", (SIZE, SIZE), bg)
    ox = (SIZE - nw) // 2
    oy = (SIZE - nh) // 2
    out.paste(person, (ox, oy))
    dest.parent.mkdir(parents=True, exist_ok=True)
    out.save(dest, "JPEG", quality=92, optimize=True)
    return {"faces": len(faces), "crop": [left, top, right, bottom], "src": [w, h]}


def main():
    if len(sys.argv) < 3:
        print("usage: smart_prof_crop.py <src> <dest>", file=sys.stderr)
        sys.exit(2)
    print(process(Path(sys.argv[1]), Path(sys.argv[2])))


if __name__ == "__main__":
    main()
