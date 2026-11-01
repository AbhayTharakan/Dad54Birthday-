"""
Package the site into ../dad-birthday.zip for sending.

Leaves out raw-photos/ (originals) and scripts/ (dev tools Dad doesn't need).
The zip contains a single top-level "dad-birthday" folder.

Usage (from the dad-birthday folder):
    python scripts/make_zip.py
"""

import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT.parent / "dad-birthday.zip"
EXCLUDE_DIRS = {"raw-photos", "scripts", "__pycache__", ".git", ".vscode"}
EXCLUDE_FILES = {".DS_Store", "Thumbs.db", "desktop.ini"}


def main():
    count = 0
    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as z:
        for path in sorted(ROOT.rglob("*")):
            rel = path.relative_to(ROOT)
            if rel.parts[0] in EXCLUDE_DIRS or path.name in EXCLUDE_FILES or path.is_dir():
                continue
            # JPEGs are already compressed; store them as-is
            mode = zipfile.ZIP_STORED if path.suffix.lower() in (".jpg", ".mp4") else zipfile.ZIP_DEFLATED
            z.write(path, Path("dad-birthday") / rel, compress_type=mode)
            count += 1
    print(f"Wrote {OUT} ({count} files, {OUT.stat().st_size / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()
