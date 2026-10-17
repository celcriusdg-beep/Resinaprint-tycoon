"""Turns an AI "pixel art" image into clean game sprites for Realm Heroes.
The AI draws each art pixel as a ~7x7 block with blurry JPEG edges; this rebuilds the true pixel grid
(median colour per cell), removes the white background by flood fill from the edges, snaps colours to a
small palette, flips the figure to face right, crops it and writes realm-heroes/img/<id>.png.

Usage: python3 tools/pixel_cutout.py <image> <grid cells across> <id>[:quadrant] ...
  quadrant is tl, tr, bl or br when the image holds four characters (default: whole image).
  Add ! after the id (vesper!) if the figure already faces right."""
import sys, os
import numpy as np
from PIL import Image

src, cells = sys.argv[1], int(sys.argv[2])
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'realm-heroes', 'img')
im = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
H, W, _ = im.shape
gy = cells * H // W
ys = np.linspace(0, H, gy + 1).astype(int)
xs = np.linspace(0, W, cells + 1).astype(int)
grid = np.zeros((gy, cells, 3), np.float32)
for j in range(gy):
    for i in range(cells):
        c = im[ys[j]:ys[j + 1], xs[i]:xs[i + 1]]
        m = c.shape[0] // 4, c.shape[1] // 4  # the centre of a cell is free of JPEG edge bleed
        grid[j, i] = np.median(c[m[0]:c.shape[0] - m[0], m[1]:c.shape[1] - m[1]].reshape(-1, 3), axis=0)

def components(mask, diag):
    """Labels connected regions of mask; returns (labels, sizes)."""
    h, w = mask.shape
    lab = np.zeros((h, w), int)
    sizes = [0]
    steps = [(1, 0), (-1, 0), (0, 1), (0, -1)] + ([(1, 1), (1, -1), (-1, 1), (-1, -1)] if diag else [])
    for y0 in range(h):
        for x0 in range(w):
            if not mask[y0, x0] or lab[y0, x0]:
                continue
            n = len(sizes); sizes.append(0)
            stack = [(y0, x0)]; lab[y0, x0] = n
            while stack:
                y, x = stack.pop(); sizes[n] += 1
                for dy, dx in steps:
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < h and 0 <= xx < w and mask[yy, xx] and not lab[yy, xx]:
                        lab[yy, xx] = n; stack.append((yy, xx))
    return lab, sizes

def background(g):
    """White touching the edge, plus enclosed pure-white areas (inside a bow string, a coiled tail)."""
    light = (g.min(axis=2) > 222) & (g.max(axis=2) - g.min(axis=2) < 30)
    lab, sizes = components(light, False)
    h, w = light.shape
    edge = set(lab[0]) | set(lab[-1]) | set(lab[:, 0]) | set(lab[:, -1])
    pure = (g.min(axis=2) > 236)
    bg = np.zeros((h, w), bool)
    for n in range(1, len(sizes)):
        region = lab == n
        if n in edge or (sizes[n] >= 6 and pure[region].mean() > 0.8):
            bg |= region
    return bg

QUAD = {'tl': (0, 0), 'tr': (0, 1), 'bl': (1, 0), 'br': (1, 1)}
bg = background(grid)
# each separate piece of art (a figure, a flame spark, a sword) goes to the quadrant holding its middle,
# so a weapon that crosses into a neighbour's quadrant stays with its owner
lab, sizes = components(~bg, True)
owner = {}
for n in range(1, len(sizes)):
    yy, xx = np.nonzero(lab == n)
    owner[n] = (int(yy.mean() >= gy / 2), int(xx.mean() >= cells / 2))
for arg in sys.argv[3:]:
    name, _, quad = arg.partition(':')
    keep_dir = name.endswith('!')
    name = name.rstrip('!')
    if quad:
        mine = np.isin(lab, [n for n, q in owner.items() if q == QUAD[quad] and sizes[n] >= 3])
    else:
        mine = ~bg
    rgba = np.dstack([np.clip(grid, 0, 255), np.where(mine, 255, 0)]).astype(np.uint8)
    img = Image.fromarray(rgba, 'RGBA')
    img = img.crop(img.getchannel('A').getbbox())
    # snap to a small palette to remove leftover JPEG noise
    pal = img.convert('RGB').quantize(colors=40, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
    img = Image.merge('RGBA', (*pal.split(), img.getchannel('A')))
    if not keep_dir:
        img = img.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    img.save(os.path.join(OUT, name + '.png'))
    a = np.asarray(img.getchannel('A')) > 0
    top = a[: max(1, a.shape[0] // 5)]
    cols = np.nonzero(top.any(axis=0))[0]
    print(name, img.size, 'head x %.2f' % ((cols.min() + cols.max()) / 2 / a.shape[1]))
