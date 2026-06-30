#!/usr/bin/env python3
"""Paint over custom app-logo badge baked into landing screenshots."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
LANDING = ROOT / "public" / "assets" / "landing"

# Top-left header badge region (1024px-wide captures).
LOGO_PATCH = {
    "left": 10,
    "top": 8,
    "right": 70,
    "bottom": 54,
    "fill": (15, 23, 42),
}

TARGETS = (
    "explore-organize.png",
    "explore-practice-planner.png",
)


def patch_logo(path: Path) -> None:
    img = Image.open(path).convert("RGB")
    draw = ImageDraw.Draw(img)
    draw.rectangle(
        [
            LOGO_PATCH["left"],
            LOGO_PATCH["top"],
            LOGO_PATCH["right"],
            LOGO_PATCH["bottom"],
        ],
        fill=LOGO_PATCH["fill"],
    )
    img.save(path, "PNG", optimize=True)
    print(f"Patched {path.name}")


if __name__ == "__main__":
    for name in TARGETS:
        patch_logo(LANDING / name)
