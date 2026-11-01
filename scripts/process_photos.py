"""
Process raw photos for the birthday site.

  raw-photos/<category>/*  ->  images/<category>/*.jpg
  + images/photos.js  (a global `window.PHOTOS` object, safe over file://)

- Converts HEIC/HEIF/PNG/WEBP/etc. to JPG
- Fixes rotation from EXIF
- Resizes to max 1600px on the long side, JPEG quality ~80
- Re-running keeps captions you've already written in images/photos.js
- Videos (MP4/MOV) are re-encoded to 720p H.264 MP4 with a poster frame

Usage (from the dad-birthday folder):
    python scripts/process_photos.py

Requires:  pip install pillow pillow-heif imageio-ffmpeg
"""

import json
import re
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageOps
from pillow_heif import register_heif_opener

register_heif_opener()

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "raw-photos"
OUT = ROOT / "images"
CATEGORIES = ["home", "world", "silly", "cool", "food"]
MAX_SIDE = 1600
QUALITY = 80
EXTS = {".jpg", ".jpeg", ".png", ".heic", ".heif", ".webp", ".bmp", ".tif", ".tiff", ".gif"}
VIDEO_EXTS = {".mp4", ".mov", ".m4v"}
VIDEO_SHORT_SIDE = 720
VIDEO_CRF = 27
PHOTOS_JS = OUT / "photos.js"


def load_existing_captions():
    """Read captions from a previous photos.js so re-runs don't wipe them."""
    if not PHOTOS_JS.exists():
        return {}
    text = PHOTOS_JS.read_text(encoding="utf-8")
    m = re.search(r"window\.PHOTOS\s*=\s*(\{.*\})\s*;", text, re.S)
    if not m:
        return {}
    try:
        data = json.loads(m.group(1))
    except json.JSONDecodeError:
        print("  ! Couldn't parse existing photos.js; captions will start empty.")
        return {}
    return {
        (cat, p["src"]): p.get("caption", "")
        for cat, items in data.items()
        for p in items
    }


def slug(name):
    s = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return s or "photo"


def process_one(src, dst):
    with Image.open(src) as im:
        im = ImageOps.exif_transpose(im)
        if im.mode not in ("RGB", "L"):
            # Flatten transparency onto white so PNGs don't go black
            im = im.convert("RGBA")
            bg = Image.new("RGB", im.size, (255, 255, 255))
            bg.paste(im, mask=im.split()[-1])
            im = bg
        elif im.mode == "L":
            im = im.convert("RGB")
        im.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
        im.save(dst, "JPEG", quality=QUALITY, optimize=True, progressive=True)
        return im.size


def ffmpeg_exe():
    import imageio_ffmpeg  # pip install imageio-ffmpeg (bundles ffmpeg)
    return imageio_ffmpeg.get_ffmpeg_exe()


def process_video(src, dst, poster):
    """Re-encode to H.264/AAC MP4 at 720p (plays in every browser) plus a poster frame."""
    ff = ffmpeg_exe()
    scale = (f"scale='if(gt(iw,ih),-2,{VIDEO_SHORT_SIDE})':'if(gt(iw,ih),{VIDEO_SHORT_SIDE},-2)'")
    subprocess.run([
        ff, "-v", "error", "-y", "-i", str(src),
        "-vf", scale, "-c:v", "libx264", "-preset", "slow", "-crf", str(VIDEO_CRF),
        "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart",
        str(dst),
    ], check=True)
    subprocess.run([
        ff, "-v", "error", "-y", "-ss", "1", "-i", str(dst), "-frames:v", "1", "-q:v", "4", str(poster),
    ], check=True)
    with Image.open(poster) as im:
        return im.size


def main():
    captions = load_existing_captions()
    result = {}
    counts = {}

    for cat in CATEGORIES:
        src_dir = RAW / cat
        out_dir = OUT / cat
        src_dir.mkdir(parents=True, exist_ok=True)
        out_dir.mkdir(parents=True, exist_ok=True)

        sources = sorted(
            (p for p in src_dir.iterdir() if p.is_file() and p.suffix.lower() in EXTS | VIDEO_EXTS),
            key=lambda p: p.name.lower(),
        )

        used = set()
        entries = []
        for src in sources:
            is_video = src.suffix.lower() in VIDEO_EXTS
            ext = ".mp4" if is_video else ".jpg"
            base = slug(src.stem)
            name = base + ext
            n = 2
            while name in used or (is_video and name[:-4] + "-poster.jpg" in used):
                name = f"{base}-{n}{ext}"
                n += 1
            used.add(name)
            dst = out_dir / name
            poster = out_dir / (name[:-4] + "-poster.jpg")
            if is_video:
                used.add(poster.name)
            try:
                fresh = dst.exists() and dst.stat().st_mtime >= src.stat().st_mtime
                if is_video and fresh and poster.exists():
                    with Image.open(poster) as im:
                        w, h = im.size
                elif is_video:
                    w, h = process_video(src, dst, poster)
                    print(f"  {cat}/{src.name} -> {name} ({w}x{h}, {dst.stat().st_size / 1e6:.1f} MB)")
                elif fresh:
                    with Image.open(dst) as im:
                        w, h = im.size
                else:
                    w, h = process_one(src, dst)
                    print(f"  {cat}/{src.name} -> {name} ({w}x{h})")
            except Exception as e:  # corrupt file, unsupported codec, etc.
                print(f"  ! Skipped {cat}/{src.name}: {e}")
                used.discard(name)
                used.discard(poster.name)
                continue
            rel = f"images/{cat}/{name}"
            entry = {"src": rel, "width": w, "height": h}
            if is_video:
                entry["type"] = "video"
                entry["poster"] = f"images/{cat}/{poster.name}"
            entry["caption"] = captions.get((cat, rel), "")
            entries.append(entry)

        # Remove outputs whose source photo/video was deleted
        for old in list(out_dir.glob("*.jpg")) + list(out_dir.glob("*.mp4")):
            if old.name not in used:
                old.unlink()

        result[cat] = entries
        counts[cat] = len(entries)

    body = json.dumps(result, indent=2, ensure_ascii=False)
    PHOTOS_JS.write_text(
        "// Generated by scripts/process_photos.py.\n"
        "// Fill in the \"caption\" fields. Re-running the script keeps your captions.\n"
        f"window.PHOTOS = {body};\n",
        encoding="utf-8",
    )

    print("\nPhotos per category:")
    for cat in CATEGORIES:
        print(f"  {cat:6} {counts[cat]}")
    print(f"\nWrote {PHOTOS_JS.relative_to(ROOT)}")


if __name__ == "__main__":
    sys.exit(main())
