"""Generate PrayerCare production icon assets from the master logo.
Preserves the logo design; only sizing, padding, backgrounds, and safe-area.
Never stretches — non-square crops are letterboxed on brand black.
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image

MASTER_SRC = Path(
    r"C:\Users\carin\.cursor\projects\c-Users-carin-Documents-PrayerCareapp\assets"
    r"\c__Users_carin_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_"
    r"PrayercareIcon-c7b74364-35d3-4a18-af1b-b49975d6eeb3.png"
)
PROJECT = Path(r"C:\Users\carin\Documents\PrayerCareapp")
IMAGES = PROJECT / "assets" / "images"
BRAND = PROJECT / "assets" / "brand"

BLACK = (0, 0, 0, 255)
CREAM = (250, 249, 247, 255)


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
    # Pad to square on black so we never stretch
    side = max(cropped.size)
    square = Image.new("RGBA", (side, side), BLACK)
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


def to_rgb(im: Image.Image, bg=(0, 0, 0)) -> Image.Image:
    rgb = Image.new("RGB", im.size, bg)
    rgba = im.convert("RGBA")
    rgb.paste(rgba, mask=rgba.split()[3])
    return rgb


def main() -> None:
    IMAGES.mkdir(parents=True, exist_ok=True)
    BRAND.mkdir(parents=True, exist_ok=True)

    raw = Image.open(MASTER_SRC).convert("RGBA")
    print("master size:", raw.size)

    # Preserve original (copy into project; never overwrite user's Cursor upload path)
    master_copy = BRAND / "prayercare-logo-master.png"
    raw.save(master_copy, "PNG")
    print("master copy:", master_copy)

    tile = trim_to_icon_tile(raw)
    print("square tile:", tile.size)

    # Marketing masters
    m2048 = fit_centered(tile, 2048, BLACK, scale=1.0)
    to_rgb(m2048).save(BRAND / "prayercare-icon-2048.png", "PNG")
    mark = extract_mark(tile)
    fit_centered(mark, 2048, (0, 0, 0, 0), scale=0.72).save(
        BRAND / "prayercare-mark-transparent-2048.png", "PNG"
    )
    print("brand masters saved in assets/brand/")

    # 1) App icon — full-bleed black square, no alpha (iOS/Android store icon)
    icon = fit_centered(tile, 1024, BLACK, scale=1.0)
    icon_rgb = to_rgb(icon)
    icon_rgb.save(IMAGES / "icon.png", "PNG")
    print("icon.png", icon_rgb.size, icon_rgb.mode)

    # 2) Splash — same mark/tile, slightly inset on cream (#FAF9F7)
    splash = fit_centered(tile, 1024, CREAM, scale=0.70)
    splash_rgb = to_rgb(splash, (250, 249, 247))
    splash_rgb.save(IMAGES / "splash-icon.png", "PNG")
    print("splash-icon.png", splash_rgb.size)

    # 3) Android foreground — mark only, ~62% safe zone
    fg = fit_centered(mark, 1024, (0, 0, 0, 0), scale=0.62)
    fg.save(IMAGES / "android-icon-foreground.png", "PNG")
    print("android-icon-foreground.png", fg.size)

    # 4) Android background — solid black (matches icon)
    Image.new("RGB", (1024, 1024), (0, 0, 0)).save(IMAGES / "android-icon-background.png", "PNG")
    print("android-icon-background.png 1024x1024 black")

    # 5) Favicon 96×96
    fav = icon_rgb.resize((96, 96), Image.Resampling.LANCZOS)
    fav.save(IMAGES / "favicon.png", "PNG")
    print("favicon.png", fav.size)

    # Monochrome themed icon (white silhouette)
    mono = Image.new("RGBA", mark.size, (0, 0, 0, 0))
    for y in range(mark.height):
        for x in range(mark.width):
            if mark.getpixel((x, y))[3] > 20:
                mono.putpixel((x, y), (255, 255, 255, 255))
    fit_centered(mono, 432, (0, 0, 0, 0), scale=0.62).save(
        IMAGES / "android-icon-monochrome.png", "PNG"
    )
    print("android-icon-monochrome.png")
    print("DONE")


if __name__ == "__main__":
    main()
