"""Lift the flame + speech-bubble mark out of assets/images/icon.png onto transparency.

Writes:
  mark-light.png  cream outline + gold flame, for dark brand backgrounds
  mark-brand.png  original evergreen outline + bronze flame, for light backgrounds
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "assets" / "images" / "icon.png"
OUT = Path(__file__).resolve().parent

# Inside the white tile, clear of its dark rounded corners.
CROP = (280, 150, 780, 862)

PALETTES = {
    "mark-light.png": {"outline": (247, 242, 231), "flame": (214, 179, 106)},
    "mark-brand.png": {"outline": (43, 65, 54), "flame": (122, 80, 22)},
}


def main() -> None:
    src = Image.open(SRC).convert("RGB").crop(CROP)
    w, h = src.size
    px = src.load()

    for name, colors in PALETTES.items():
        out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        dst = out.load()
        for y in range(h):
            for x in range(w):
                r, g, b = px[x, y]
                lum = 0.3 * r + 0.59 * g + 0.11 * b
                alpha = max(0.0, min(1.0, (240 - lum) / 150))
                if alpha <= 0.02:
                    continue
                is_flame = r - g > 18 and r > b + 30
                cr, cg, cb = colors["flame"] if is_flame else colors["outline"]
                dst[x, y] = (cr, cg, cb, round(alpha * 255))
        bbox = out.getbbox()
        if bbox:
            out = out.crop(bbox)
        out.save(OUT / name)
        print(f"wrote {name} {out.size}")


if __name__ == "__main__":
    main()
