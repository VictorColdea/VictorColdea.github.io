#!/usr/bin/env python3
"""
compress_photos.py

Run this LOCALLY on your own machine — it is not part of the website
and never gets deployed. It reads every photo in Photos/, and writes a
resized + compressed copy into Photos/web/ for the site to actually
serve. The originals in Photos/ are never touched, so extract_photo_info.py
can still read their full EXIF data later.

Why: phone photos come out of the camera at 3000-4000px wide and
1-4MB each. Nobody's browser needs to download that just to show a
photo in a gallery grid, so this shrinks the long edge down to
MAX_DIMENSION and re-encodes at JPEG quality QUALITY.

SETUP (once):
    pip install pillow

USAGE:
    Run it from the same folder as script.js and Photos/:
    python3 compress_photos.py

    Re-run any time — it skips a file if Photos/web/<name> already
    exists and is newer than the original, so it's safe to run again
    after adding a few new photos.

    After it finishes, it prints a PHOTOS-array snippet with updated
    `src`, `width`, and `height` fields for every photo — paste those
    over the matching fields in script.js (src changes from
    "Photos/x.jpg" to "Photos/web/x.jpg"; width/height are new).
"""

import os
import sys

try:
    from PIL import Image, ImageOps
except ImportError:
    sys.exit("Pillow is required. Install it with: pip install pillow")

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SOURCE_DIR = os.path.join(SCRIPT_DIR, "Photos")
OUTPUT_DIR = os.path.join(SOURCE_DIR, "web")

MAX_DIMENSION = 2000  # longest edge, in pixels
QUALITY = 80

IMAGE_EXTENSIONS = (".jpg", ".jpeg", ".png")


def compress_one(src_path, dst_path):
    with Image.open(src_path) as im:
        im = ImageOps.exif_transpose(im)  # bake in correct orientation
        if im.mode not in ("RGB", "L"):
            im = im.convert("RGB")

        width, height = im.size
        longest = max(width, height)
        if longest > MAX_DIMENSION:
            scale = MAX_DIMENSION / longest
            im = im.resize(
                (max(1, round(width * scale)), max(1, round(height * scale))),
                Image.LANCZOS,
            )

        im.save(dst_path, "JPEG", quality=QUALITY, optimize=True, progressive=True)
        return im.size


def main():
    if not os.path.isdir(SOURCE_DIR):
        sys.exit(f"Couldn't find {SOURCE_DIR}")

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    files = sorted(
        f for f in os.listdir(SOURCE_DIR)
        if f.lower().endswith(IMAGE_EXTENSIONS) and os.path.isfile(os.path.join(SOURCE_DIR, f))
    )

    if not files:
        sys.exit(f"No images found in {SOURCE_DIR}")

    results = []
    total_before = 0
    total_after = 0

    for name in files:
        src_path = os.path.join(SOURCE_DIR, name)
        stem, _ = os.path.splitext(name)
        dst_name = stem + ".jpg"
        dst_path = os.path.join(OUTPUT_DIR, dst_name)

        if os.path.exists(dst_path) and os.path.getmtime(dst_path) >= os.path.getmtime(src_path):
            with Image.open(dst_path) as existing:
                width, height = existing.size
            before = os.path.getsize(src_path)
            after = os.path.getsize(dst_path)
            results.append((name, dst_name, width, height, before, after, True))
            total_before += before
            total_after += after
            continue

        before = os.path.getsize(src_path)
        width, height = compress_one(src_path, dst_path)
        after = os.path.getsize(dst_path)
        results.append((name, dst_name, width, height, before, after, False))
        total_before += before
        total_after += after

    print(f"\n{'file':45s} {'dims':>11s} {'before':>9s} {'after':>9s}  {'saved':>6s}")
    print("-" * 90)
    for name, dst_name, width, height, before, after, skipped in results:
        saved_pct = 100 * (1 - after / before) if before else 0
        tag = " (cached)" if skipped else ""
        print(f"{name:45s} {width:>5d}x{height:<5d} {before/1024:>7.0f}K {after/1024:>7.0f}K  {saved_pct:>5.1f}%{tag}")

    print("-" * 90)
    print(f"Total: {total_before/1024/1024:.1f}MB -> {total_after/1024/1024:.1f}MB "
          f"({100 * (1 - total_after / total_before):.1f}% smaller)\n")

    print("Paste these into the matching PHOTOS entries in script.js")
    print("(src, plus new width/height fields for layout-shift-free lazy loading):\n")
    for name, dst_name, width, height, *_ in results:
        print(f'  "{name}" -> src: "Photos/web/{dst_name}", width: {width}, height: {height}')


if __name__ == "__main__":
    main()
