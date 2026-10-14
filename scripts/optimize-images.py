"""Build display-sized web assets; keep all supplied originals unchanged.
Requires Pillow (python3 -m pip install Pillow).
"""
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]

def encode(source, target, width, lossless=False):
    with Image.open(ROOT / source) as original:
        image = ImageOps.exif_transpose(original)
        target_width = min(width, image.width)
        image = image.resize((target_width, round(target_width * image.height / image.width)), Image.Resampling.LANCZOS)
        path = ROOT / target
        if path.suffix == '.png':
            image.save(path, optimize=True)
        else:
            image.save(path, 'WEBP', quality=84, method=6, lossless=lossless)
        print(f'{source}: {original.width}w -> {image.width}w, {path.stat().st_size:,} bytes ({target})')

encode('public/brand/cygnus-symbol.png', 'public/brand/cygnus-symbol-web.png', 420)
for tone in ['light', 'dark']:
    encode(f'public/brand/cygnus-{tone}-original.png', f'public/brand/cygnus-{tone}-web.webp', 768, True)
encode('college-logo.png', 'public/brand/college-web.webp', 384, True)
for folder, names in {
    'about-assets': ['ai_hackathon', 'banner_notext'],
    'showcase-assets': ['crew', 'rover', 'vision', 'project-atlas', 'project-iris', 'project-dexter', 'project-pulse'],
}.items():
    for name in names:
        for width in [640, 1280]:
            encode(f'{folder}/{name}.jpg', f'{folder}/{name}-{width}.webp', width)

# The favicon used to embed the entire 859 KB source symbol in a 128px SVG.
import base64
import io
import re
with Image.open(ROOT / 'public/brand/cygnus-symbol.png') as symbol:
    symbol.thumbnail((192, 96), Image.Resampling.LANCZOS)
    buffer = io.BytesIO()
    symbol.save(buffer, 'PNG', optimize=True)
    favicon = ROOT / 'public/cygnus-favicon.svg'
    favicon.write_text(re.sub(r'data:image/png;base64,[^"\s]+', 'data:image/png;base64,' + base64.b64encode(buffer.getvalue()).decode(), favicon.read_text()))
    print(f'Favicon: {favicon.stat().st_size:,} bytes')
