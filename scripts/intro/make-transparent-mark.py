#!/usr/bin/env python3
"""Remove near-black background from mark PNG → transparent PNG."""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SRC = ROOT / "scripts" / "intro" / "fastcourt-intro-mark-source.png"
DEFAULT_OUT = ROOT / "scripts" / "intro" / "fastcourt-intro-mark.png"
PUBLIC_OUT = ROOT / "public" / "assets" / "branding" / "intro" / "fastcourt-intro-mark.png"


def remove_black_bg(src: Path, out: Path, threshold: int = 42) -> None:
    img = Image.open(src).convert("RGBA")
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if r <= threshold and g <= threshold and b <= threshold:
                px[x, y] = (r, g, b, 0)
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out, "PNG", optimize=True)
    print(f"Saved {out} ({w}x{h})")


if __name__ == "__main__":
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_SRC
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_OUT
    remove_black_bg(src, out)
    if out != PUBLIC_OUT:
        remove_black_bg(src, PUBLIC_OUT)
