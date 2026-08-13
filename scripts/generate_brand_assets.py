"""Generate PrayerCare production icon assets from the master logo.
Preserves the logo design; only sizing, padding, backgrounds, and safe-area.
Never stretches — non-square crops are letterboxed on brand cream (#FAF9F7).
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image

PROJECT = Path(__file__).resolve().parent.parent
IMAGES = PROJECT / "assets" / "images"
BRAND = PROJECT / "assets" / "brand"
MASTER_SRC = BRAND / "prayercare-logo-master.png"

CREAM = (250, 249, 247, 255)
CREAM_RGB = (250, 249, 247)


def near_white(r: int, g: int, b: int, a: int) -> bool:
    return a > 10 and r >= 240 and g >= 240 and b >= 240


def content_bbox(im: Image.Image, white_as_bg: bool = True):
    w, h = im.size
    px = im.load()
    minx, miny, maxx, maxy = w, h, -1, -1
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 8:
                continue
            if white_as_bg and near_white(r, g, b, a):
                continue
            minx = min(minx, x)
            miny = min(miny, y)
            maxx = max(maxx, x)
            maxy = max(maxy, y)
    if maxx < 0:
        return (0, 0, w, h)
    return (minx, miny, maxx + 1, maxy + 1)


def trim_to_icon_tile(im: Image.Image) -> Image.Image:
    """Remove white page/shadow; return icon content without distorting."""
    bbox = content_bbox(im, white_as_bg=True)
    cropped = im.crop(bbox)
    w, h = cropped.size
    # Small inset to drop soft outer shadow fringe
    inset = max(2, int(min(w, h) * 0.012))
    cropped = cropped.crop((inset, inset, w - inset, h - inset))
    # Pad to square on cream so we never stretch
    side = max(cropped.size)
    square = Image.new("RGBA", (side, side), CREAM)
    x = (side - cropped.width) // 2
    y = (side - cropped.height) // 2
    square.alpha_composite(cropped.convert("RGBA"), (x, y))
    return square


def fit_centered(im: Image.Image, size: int, bg: tuple, scale: float) -> Image.Image:
    """Fit image inside size×size without stretching. scale = max fraction of canvas."""
    canvas = Image.new("RGBA", (size, size), bg)
    src = im.convert("RGBA")
    max_side = max(1, int(size * scale))
    ratio = min(max_side / src.width, max_side / src.height)
    nw = max(1, int(src.width * ratio))
    nh = max(1, int(src.height * ratio))
    resized = src.resize((nw, nh), Image.Resampling.LANCZOS)
    x = (size - nw) // 2
    y = (size - nh) // 2
    canvas.alpha_composite(resized, (x, y))
    return canvas


def extract_mark(icon_rgba: Image.Image) -> Image.Image:
    """White + gold mark only; black becomes transparent."""
    im = icon_rgba.convert("RGBA")
    w, h = im.size
    px = im.load()
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    out_px = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 8:
                continue
            if r <= 40 and g <= 40 and b <= 40:
                continue
            out_px[x, y] = (r, g, b, a)
    bbox = out.getbbox()
    return out.crop(bbox) if bbox else out


def darken_mark_for_cream(mark: Image.Image) -> Image.Image:
    """Make outline + flame darker so the mark reads clearly on cream UI."""
    # Deep forest outline + bronze flame so the mark reads on cream
    OUTLINE = (42, 62, 52, 255)
    GOLD_LIGHT = (122, 82, 18, 255)
    GOLD_DARK = (88, 56, 10, 255)

    im = mark.convert("RGBA")
    w, h = im.size
    px = im.load()
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    out_px = out.load()

    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 12:
                continue
            # Near-white / light gray outline → sage
            if r >= 200 and g >= 200 and b >= 200:
                out_px[x, y] = OUTLINE
                continue
            # Gold / yellow flame → deepen
            if r > g and r > b and (r - b) > 30:
                # Blend toward darker gold by brightness
                t = max(0.0, min(1.0, (r - 120) / 135.0))
                nr = int(GOLD_DARK[0] * (1 - t) + GOLD_LIGHT[0] * t)
                ng = int(GOLD_DARK[1] * (1 - t) + GOLD_LIGHT[1] * t)
                nb = int(GOLD_DARK[2] * (1 - t) + GOLD_LIGHT[2] * t)
                out_px[x, y] = (nr, ng, nb, a)
                continue
            out_px[x, y] = (r, g, b, a)
    return out


def to_rgb(im: Image.Image, bg=(0, 0, 0)) -> Image.Image:
    rgb = Image.new("RGB", im.size, bg)
    rgba = im.convert("RGBA")
    rgb.paste(rgba, mask=rgba.split()[3])
    return rgb


def main() -> None:
    IMAGES.mkdir(parents=True, exist_ok=True)
    BRAND.mkdir(parents=True, exist_ok=True)

    if not MASTER_SRC.exists():
        raise SystemExit(f"Missing master logo: {MASTER_SRC}")

    raw = Image.open(MASTER_SRC).convert("RGBA")
    print("master size:", raw.size)

    tile = trim_to_icon_tile(raw)
    print("square tile:", tile.size)

    mark = extract_mark(tile)
    mark_ui = darken_mark_for_cream(mark)

    # Marketing masters
    m2048 = fit_centered(tile, 2048, CREAM, scale=1.0)
    to_rgb(m2048, CREAM_RGB).save(BRAND / "prayercare-icon-2048.png", "PNG")
    fit_centered(mark, 2048, (0, 0, 0, 0), scale=0.72).save(
        BRAND / "prayercare-mark-transparent-2048.png", "PNG"
    )
    print("brand masters saved in assets/brand/")

    # App / splash / store icons use darker mark on cream (visible)
    icon = fit_centered(mark_ui, 1024, CREAM, scale=0.78)
    icon_rgb = to_rgb(icon, CREAM_RGB)
    icon_rgb.save(IMAGES / "icon.png", "PNG")
    print("icon.png", icon_rgb.size, icon_rgb.mode)

    splash = fit_centered(mark_ui, 1024, CREAM, scale=0.70)
    splash_rgb = to_rgb(splash, CREAM_RGB)
    splash_rgb.save(IMAGES / "splash-icon.png", "PNG")
    print("splash-icon.png", splash_rgb.size)

    fg = fit_centered(mark_ui, 1024, (0, 0, 0, 0), scale=0.62)
    fg.save(IMAGES / "android-icon-foreground.png", "PNG")
    print("android-icon-foreground.png", fg.size)

    Image.new("RGB", (1024, 1024), CREAM_RGB).save(IMAGES / "android-icon-background.png", "PNG")
    print("android-icon-background.png 1024x1024 cream")

    fav = icon_rgb.resize((96, 96), Image.Resampling.LANCZOS)
    fav.save(IMAGES / "favicon.png", "PNG")
    print("favicon.png", fav.size)

    # Compact UI mark for headers / tab bar (transparent PNG)
    ui_mark = fit_centered(mark_ui, 256, (0, 0, 0, 0), scale=0.92)
    ui_mark.save(IMAGES / "brand-mark.png", "PNG")
    print("brand-mark.png", ui_mark.size)

    mono = Image.new("RGBA", mark_ui.size, (0, 0, 0, 0))
    for y in range(mark_ui.height):
        for x in range(mark_ui.width):
            if mark_ui.getpixel((x, y))[3] > 20:
                mono.putpixel((x, y), (255, 255, 255, 255))
    fit_centered(mono, 432, (0, 0, 0, 0), scale=0.62).save(
        IMAGES / "android-icon-monochrome.png", "PNG"
    )
    print("android-icon-monochrome.png")
    print("DONE")


if __name__ == "__main__":
    main()
