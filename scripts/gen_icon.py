"""Рисует иконку приложения VetID: лапка внутри кольца Face ID.

Запуск: python scripts/gen_icon.py
"""
import math
import os

from PIL import Image, ImageDraw, ImageFilter

S = 2048
ASSETS = os.path.join(os.path.dirname(__file__), "..", "assets")

CYAN = (92, 225, 255)
VIOLET = (192, 140, 255)


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def background():
    img = Image.new("RGB", (S, S), (5, 7, 15))
    glow = Image.new("RGB", (S, S), (0, 0, 0))
    d = ImageDraw.Draw(glow)
    d.ellipse((S * 0.05, S * 0.0, S * 0.85, S * 0.8), fill=(30, 70, 190))
    d.ellipse((S * 0.35, S * 0.4, S * 1.05, S * 1.1), fill=(90, 40, 150))
    glow = glow.filter(ImageFilter.GaussianBlur(S * 0.16))
    return Image.blend(img, glow, 0.75)


def emblem(size, transparent=False):
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    c = size / 2
    r1, r2 = size * 0.36, size * 0.43
    n = 64
    for i in range(n):
        a = i / n * 2 * math.pi - math.pi / 2
        col = lerp(CYAN, VIOLET, (math.sin(a) + 1) / 2)
        w = int(size * 0.016)
        d.line(
            (c + r1 * math.cos(a), c + r1 * math.sin(a), c + r2 * math.cos(a), c + r2 * math.sin(a)),
            fill=col + (255,),
            width=w,
        )
        for p in (
            (c + r1 * math.cos(a), c + r1 * math.sin(a)),
            (c + r2 * math.cos(a), c + r2 * math.sin(a)),
        ):
            d.ellipse((p[0] - w / 2, p[1] - w / 2, p[0] + w / 2, p[1] + w / 2), fill=col + (255,))

    white = (240, 248, 255, 255)
    pad_w, pad_h = size * 0.25, size * 0.21
    pcx, pcy = c, c + size * 0.07
    d.rounded_rectangle(
        (pcx - pad_w / 2, pcy - pad_h / 2, pcx + pad_w / 2, pcy + pad_h / 2), radius=pad_h * 0.48, fill=white
    )
    toes = [(-0.155, -0.055, 0.075), (-0.06, -0.135, 0.082), (0.06, -0.135, 0.082), (0.155, -0.055, 0.075)]
    for dx, dy, rr in toes:
        x, y, rad = c + dx * size, c + dy * size, rr * size / 2
        d.ellipse((x - rad * 0.86, y - rad, x + rad * 0.86, y + rad), fill=white)

    glow = layer.filter(ImageFilter.GaussianBlur(size * 0.025))
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.alpha_composite(glow)
    out.alpha_composite(glow)
    out.alpha_composite(layer)
    return out


def save(img, name, px):
    img.resize((px, px), Image.LANCZOS).save(os.path.join(ASSETS, name))


if __name__ == "__main__":
    bg = background().convert("RGBA")
    bg.alpha_composite(emblem(S))
    save(bg.convert("RGB"), "icon.png", 1024)

    em = emblem(S)
    save(em, "splash-icon.png", 1024)

    fg = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    small = emblem(int(S * 0.66))
    fg.alpha_composite(small, (int(S * 0.17), int(S * 0.17)))
    save(fg, "android-icon-foreground.png", 1024)
    save(background(), "android-icon-background.png", 1024)
    save(bg.convert("RGB"), "favicon.png", 48)
    print("ok")
