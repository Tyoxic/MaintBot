"""
Pads each screenshot in this folder to 1290x2796 (Apple's required size for
6.7" iPhone App Store screenshots). Outputs to pictures/app_store/.

Strategy: scale to fit width while preserving aspect ratio, then center
on a white canvas with letterbox padding above and below.
"""

from pathlib import Path
from PIL import Image

# Apple accepts multiple sizes depending on the display class; generate both
# the 6.7" (iPhone 15/16 Pro Max) and the 6.5" (12/13/14 Pro Max) sets so the
# uploader can drop into whichever slot App Store Connect is asking for.
SIZES = [
    ("app_store_6_7",    1290, 2796),  # 6.7-inch — iPhone 15/16 Pro Max
    ("app_store_6_5",    1284, 2778),  # 6.5-inch — iPhone 12/13/14 Pro Max
    ("app_store_ipad13", 2064, 2752),  # 13-inch iPad Pro M4 required by Apple
    ("app_store_ipad12", 2048, 2732),  # 12.9-inch iPad Pro (older) — fallback
]
BACKGROUND = (255, 255, 255)  # white
SOURCE_DIR = Path(__file__).parent

EXTS = {".png", ".jpg", ".jpeg"}

for folder_name, target_w, target_h in SIZES:
    out_dir = SOURCE_DIR / folder_name
    out_dir.mkdir(exist_ok=True)
    count = 0
    print(f"\n=== {folder_name} ({target_w}x{target_h}) ===")
    for src in sorted(SOURCE_DIR.iterdir()):
        if src.suffix.lower() not in EXTS:
            continue
        if src.parent != SOURCE_DIR:
            continue
        if "app_store" in str(src):
            continue

        img = Image.open(src).convert("RGB")
        w, h = img.size

        scale = min(target_w / w, target_h / h)
        new_w = min(target_w, round(w * scale))
        new_h = min(target_h, round(h * scale))

        resized = img.resize((new_w, new_h), Image.LANCZOS)

        canvas = Image.new("RGB", (target_w, target_h), BACKGROUND)
        x = (target_w - new_w) // 2
        y = (target_h - new_h) // 2
        canvas.paste(resized, (x, y))

        out = out_dir / (src.stem + ".png")
        canvas.save(out, "PNG", optimize=True)
        print(f"  {src.name:35s} -> {new_w}x{new_h} (pad {x},{y}) -> {out.name}")
        count += 1
    print(f"  {count} screenshots saved in {out_dir}")
