"""Rasterise the Figma-style Zora portrait used by components/Zora.tsx.

Temporary generator: flat vector shapes, drawn at 4x and downsampled for clean
edges. Palette follows the shared Figma frame — rust headwrap, berry/pink
kitenge, gold hoops, brown skin — on a QD-OLED black-plum ground.
"""
from PIL import Image, ImageDraw, ImageFilter

S = 4
W = 512 * S
H = 512 * S

# ---------- palette ----------
INK = "#F7F7FF"
HAIR = "#16121B"
HAIR_2 = "#241D2A"
SKIN = "#A75F41"
SKIN_LIGHT = "#C97B5A"
SKIN_DEEP = "#7E412C"
RUST = "#B7410E"
RUST_LIGHT = "#EA580C"
RUST_DARK = "#7C2D12"
GOLD = "#E9B845"
GOLD_LIGHT = "#FCD34D"
BERRY = "#8C2D47"
PINK = "#E24A6C"
PINK_LIGHT = "#F56193"
CREAM = "#FFF1E6"
CYAN = "#00E5FF"
MAGENTA = "#FF2DAA"

img = Image.new("RGB", (W, H), "#050508")
d = ImageDraw.Draw(img)


def box(x0, y0, x1, y1):
    return [int(x0 * S), int(y0 * S), int(x1 * S), int(y1 * S)]


def ell(x0, y0, x1, y1, fill, outline=None, width=0):
    d.ellipse(box(x0, y0, x1, y1), fill=fill, outline=outline, width=int(width * S))


def rrect(x0, y0, x1, y1, r, fill, outline=None, width=0):
    d.rounded_rectangle(box(x0, y0, x1, y1), radius=int(r * S), fill=fill, outline=outline, width=int(width * S))


def poly(points, fill):
    d.polygon([(int(x * S), int(y * S)) for x, y in points], fill=fill)


def line(points, fill, width):
    d.line([(int(x * S), int(y * S)) for x, y in points], fill=fill, width=int(width * S), joint="curve")


def arc(x0, y0, x1, y1, start, end, fill, width):
    d.arc(box(x0, y0, x1, y1), start=start, end=end, fill=fill, width=int(width * S))


# ---------- deep-space QD ground ----------
for y in range(H):
    t = y / H
    r = int(12 * (1 - t) + 3 * t)
    g = int(4 * (1 - t) + 3 * t)
    b = int(18 * (1 - t) + 8 * t)
    d.line([(0, y), (W, y)], fill=(r, g, b))

glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
gd = ImageDraw.Draw(glow)
gd.ellipse(box(-90, 170, 240, 500), fill=(0, 229, 255, 42))
gd.ellipse(box(300, 110, 610, 430), fill=(255, 45, 170, 46))
gd.ellipse(box(150, -120, 430, 150), fill=(139, 92, 255, 38))
glow = glow.filter(ImageFilter.GaussianBlur(int(46 * S)))
img = Image.alpha_composite(img.convert("RGBA"), glow)
d = ImageDraw.Draw(img)

# faint quantum arc behind the shoulders
arc(48, 330, 464, 560, 200, 340, "#123544", 2.5)
arc(62, 344, 450, 548, 200, 340, "#2A0A24", 1.5)

# ---------- shoulders / blouse ----------
# A single soft shoulder curve, not a shelf: the top starts under the neck.
ell(4, 392, 508, 820, BERRY)
ell(34, 430, 478, 820, "#6F1F38")
# off-shoulder pink panels
poly([(18, 476), (148, 424), (196, 512), (18, 512)], PINK)
poly([(494, 476), (364, 424), (316, 512), (494, 512)], PINK)
# rounded neckline / inner top
ell(176, 414, 336, 570, "#2B0B1B")
ell(188, 424, 324, 548, BERRY)
# kitenge print: gold rings + diamonds on the pink panels
for cx, cy, r in [(78, 466, 22), (112, 500, 15), (52, 506, 13), (434, 466, 22), (400, 500, 15), (460, 506, 13)]:
    ell(cx - r, cy - r, cx + r, cy + r, None, GOLD, 2.2)
    ell(cx - r * 0.45, cy - r * 0.45, cx + r * 0.45, cy + r * 0.45, GOLD)
for cx, cy in [(128, 452), (384, 452), (64, 490), (448, 490)]:
    poly([(cx, cy - 7), (cx + 7, cy), (cx, cy + 7), (cx - 7, cy)], CREAM)
# center berry panel with cream geometry
for cy in (472, 500, 528):
    line([(196, cy), (256, cy - 18), (316, cy)], GOLD, 2)
    ell(251, cy - 23, 261, cy - 13, CREAM)

# ---------- neck & chest ----------
rrect(226, 330, 286, 438, 32, SKIN)
rrect(226, 330, 256, 405, 15, SKIN_LIGHT)
# collarbone shadows
arc(214, 392, 250, 418, 20, 110, SKIN_DEEP, 2.4)
arc(262, 392, 298, 418, 70, 160, SKIN_DEEP, 2.4)

# ---------- afro ----------
ell(86, 62, 426, 350, HAIR)
ell(96, 94, 416, 336, HAIR_2)
ell(108, 108, 404, 324, HAIR)
# coils around the silhouette
for cx, cy, r in [
    (112, 130, 30), (100, 190, 32), (104, 258, 30), (126, 314, 26),
    (168, 348, 24), (212, 366, 22), (300, 366, 22), (346, 348, 24),
    (390, 314, 26), (410, 258, 30), (414, 190, 32), (402, 130, 30),
    (360, 82, 28), (312, 64, 26), (256, 56, 26), (200, 64, 26), (154, 82, 28),
]:
    ell(cx - r, cy - r, cx + r, cy + r, None, "#0B090E", 2)
    arc(cx - r * 0.55, cy - r * 0.55, cx + r * 0.55, cy + r * 0.55, 20, 250, "#2E2634", 2.4)

# ---------- ears ----------
ell(140, 226, 174, 286, SKIN)
ell(338, 226, 372, 286, SKIN)
arc(146, 238, 168, 272, 110, 250, SKIN_DEEP, 2)
arc(344, 238, 366, 272, 290, 70, SKIN_DEEP, 2)

# ---------- headwrap ----------
# base turban mass, then the face is painted over its lower edge
ell(104, 22, 408, 270, RUST_DARK)
ell(112, 18, 400, 252, RUST)
ell(126, 28, 386, 232, RUST_LIGHT)
# fabric folds
arc(132, 42, 380, 226, 205, 335, RUST_DARK, 3)
arc(144, 60, 366, 246, 200, 330, "#9A3412", 3)
arc(160, 84, 350, 258, 200, 325, RUST_DARK, 2.2)
line([(170, 76), (206, 44), (238, 96)], "#D97706", 3)
line([(276, 40), (306, 72), (332, 52)], "#D97706", 3)
# gold band / brow line
arc(122, 120, 390, 306, 200, 340, GOLD, 8)
arc(132, 132, 380, 296, 202, 338, GOLD_LIGHT, 2)
# baby hairs at the temples
line([(190, 190), (178, 204), (176, 220)], "#201820", 2)
line([(196, 194), (188, 210), (188, 224)], "#201820", 2)
line([(316, 190), (328, 202), (330, 218)], "#201820", 2)
line([(310, 196), (320, 210), (322, 222)], "#201820", 2)
# knot at the right
ell(348, 84, 424, 164, RUST)
ell(356, 92, 416, 154, RUST_LIGHT)
arc(362, 100, 410, 148, 210, 330, RUST_DARK, 3)

# ---------- face ----------
ell(166, 126, 346, 364, SKIN)
# jaw/cheek light
arc(176, 170, 336, 360, 70, 130, SKIN_LIGHT, 3)
ell(184, 258, 220, 300, SKIN_LIGHT)
ell(292, 258, 328, 300, SKIN_LIGHT)
# ears again over afro
ell(142, 226, 174, 284, SKIN)
ell(338, 226, 370, 284, SKIN)

# forehead highlight
arc(178, 140, 334, 214, 200, 340, SKIN_LIGHT, 3)

# ---------- brows ----------
line([(194, 218), (224, 208), (250, 216)], "#3A2017", 8)
line([(266, 208), (296, 198), (324, 208)], "#3A2017", 8)
line([(198, 212), (222, 203), (246, 210)], "#5C3324", 2)
line([(270, 202), (296, 193), (320, 203)], "#5C3324", 2)

# ---------- eyes ----------
# left
ell(193, 228, 245, 258, CREAM)
ell(204, 233, 238, 256, "#FFFFFF")
ell(212, 234, 232, 258, "#2B1A14")
ell(216, 238, 228, 252, "#090607")
ell(222, 239, 227, 244, "#FFFFFF")
line([(192, 228), (218, 224), (246, 230)], "#2B1A14", 3)
# right
ell(267, 224, 319, 254, CREAM)
ell(278, 229, 312, 252, "#FFFFFF")
ell(288, 230, 308, 254, "#2B1A14")
ell(292, 234, 304, 248, "#090607")
ell(298, 235, 303, 240, "#FFFFFF")
line([(266, 224), (294, 220), (320, 226)], "#2B1A14", 3)
# lower lash hints
arc(194, 238, 246, 268, 10, 170, "#3A2017", 1.6)
arc(268, 234, 320, 264, 10, 170, "#3A2017", 1.6)

# ---------- nose ----------
line([(256, 258), (249, 292), (259, 300)], SKIN_DEEP, 3)
ell(246, 294, 254, 302, "#6B3524")
ell(260, 294, 268, 302, "#6B3524")
line([(251, 302), (259, 304)], "#6B3524", 2)
# gold nose stud
ell(265, 288, 272, 295, GOLD)

# ---------- lips ----------
poly([(214, 316), (238, 308), (256, 314), (274, 308), (298, 318), (282, 330), (256, 334), (230, 330)], "#713F27")
poly([(222, 322), (240, 316), (256, 320), (272, 316), (290, 322), (274, 328), (256, 330), (238, 328)], "#8F5136")
# small teeth catchlight, then the smile line
poly([(232, 315), (246, 312), (252, 318), (238, 322)], CREAM)
line([(214, 316), (238, 308), (256, 314), (274, 308), (298, 318)], "#4B2418", 2)
arc(214, 318, 298, 338, 20, 160, "#4B2418", 2.2)

# blush
blush = Image.new("RGBA", (W, H), (0, 0, 0, 0))
bd = ImageDraw.Draw(blush)
bd.ellipse(box(180, 278, 222, 304), fill=(226, 74, 108, 52))
bd.ellipse(box(292, 278, 334, 304), fill=(226, 74, 108, 52))
blush = blush.filter(ImageFilter.GaussianBlur(int(10 * S)))
img = Image.alpha_composite(img.convert("RGBA"), blush)
d = ImageDraw.Draw(img)

# ---------- earrings ----------
ell(126, 278, 172, 334, None, GOLD, 6)
ell(132, 284, 166, 328, None, GOLD_LIGHT, 1.5)
ell(340, 278, 386, 334, None, GOLD, 6)
ell(346, 284, 380, 328, None, GOLD_LIGHT, 1.5)

# ---------- flower in the wrap ----------
for i in range(5):
    ang = i * 72
    cx, cy = 388, 108
    # simple petal circles around the center
    import math
    px = cx + 13 * math.cos(math.radians(ang))
    py = cy + 13 * math.sin(math.radians(ang))
    ell(px - 10, py - 10, px + 10, py + 10, PINK_LIGHT)
ell(378, 98, 398, 118, PINK)
ell(384, 104, 392, 112, GOLD)

# ---------- necklace ----------
arc(214, 398, 298, 450, 20, 160, GOLD, 2.6)
ell(250, 442, 262, 454, GOLD)
ell(253, 445, 259, 451, GOLD_LIGHT)

# ---------- code motif on the blouse ----------
# a small </> in cream/gold on the berry center panel
line([(214, 486), (200, 500), (214, 514)], GOLD_LIGHT, 3)
line([(298, 486), (312, 500), (298, 514)], GOLD_LIGHT, 3)
line([(268, 480), (244, 520)], CREAM, 2.4)

# ---------- QD rim light ----------
rim = Image.new("RGBA", (W, H), (0, 0, 0, 0))
rd = ImageDraw.Draw(rim)
rd.arc(box(104, 22, 408, 370), 96, 176, fill=(0, 229, 255, 120), width=int(3 * S))
rd.arc(box(104, 22, 408, 370), 4, 86, fill=(255, 45, 170, 130), width=int(3 * S))
rim = rim.filter(ImageFilter.GaussianBlur(int(2 * S)))
img = Image.alpha_composite(img.convert("RGBA"), rim)

# ---------- downsample ----------
out = img.convert("RGB").resize((512, 512), Image.LANCZOS)
out.save("assets/characters/zora-portrait.png", "PNG")
print("wrote assets/characters/zora-portrait.png")
