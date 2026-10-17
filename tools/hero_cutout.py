"""Cuts Realm Heroes paintings out of their plain backgrounds and writes trimmed transparent WebP sprites.
Usage: python3 tools/hero_cutout.py <folder with <id>.png paintings> [id ...]
Each sprite is cropped to the figure, scaled to 640px tall, saved to realm-heroes/img/<id>.webp."""
import sys, os
import numpy as np
from PIL import Image, ImageFilter
from rembg import remove, new_session

SRC = sys.argv[1]
ONLY = sys.argv[2:]
OUT = os.path.join(os.path.dirname(__file__), '..', 'realm-heroes', 'img')
CROP_BOTTOM = {'aurelia': 0.12}  # trims a painted pedestal under the feet
sess = new_session('isnet-general-use')
for f in sorted(os.listdir(SRC)):
    k, ext = os.path.splitext(f)
    if ext != '.png' or (ONLY and k not in ONLY) or k.endswith('_s'):
        continue
    im = Image.open(os.path.join(SRC, f)).convert('RGB')
    if k in CROP_BOTTOM:
        im = im.crop((0, 0, im.width, int(im.height * (1 - CROP_BOTTOM[k]))))
    cut = remove(im, session=sess, post_process_mask=True)
    # The model drops thin props (staff tips, glowing orbs). The backdrop is a plain grey, so also keep
    # every pixel that clearly differs from it, and take the union of both masks.
    px = np.asarray(im).astype(np.float32)
    border = np.concatenate([px[:8].reshape(-1, 3), px[-8:].reshape(-1, 3), px[:, :8].reshape(-1, 3), px[:, -8:].reshape(-1, 3)])
    bg = np.median(border, axis=0)
    dist = np.sqrt(((px - bg) ** 2).sum(axis=2))
    sat = px.max(axis=2) - px.min(axis=2)
    key = np.clip((np.maximum(dist - 38, (sat - 30) * 1.5)) * 255 / 30, 0, 255).astype(np.uint8)
    key = Image.fromarray(key).filter(ImageFilter.MedianFilter(3))
    alpha = Image.fromarray(np.maximum(np.asarray(cut.getchannel('A')), np.asarray(key)))
    cut = im.convert('RGBA')  # rembg blanks the colour under pixels it dropped; take it from the painting
    cut.putalpha(alpha)
    a = cut.getchannel('A').point(lambda v: 255 if v > 24 else 0)
    box = a.getbbox()
    cut = cut.crop(box)
    h = 640
    cut = cut.resize((round(cut.width * h / cut.height), h), Image.LANCZOS)
    cut.save(os.path.join(OUT, k + '.webp'), 'WEBP', quality=86, method=6)
    print(k, cut.size, flush=True)
