#!/usr/bin/env python3
"""Usa a mesma arte IconKitchen no Android e WebApp."""
from pathlib import Path
from PIL import Image
import base64, io

root = Path(__file__).resolve().parents[1]
raw = (root / 'assets/icon/iconkit-launcher.b64').read_text().strip()
im = Image.open(io.BytesIO(base64.b64decode(raw, validate=True))).convert('RGBA')
assert im.width >= 96 and im.height >= 96
public = root / 'public'
public.mkdir(parents=True, exist_ok=True)
for name, size in [('favicon.png', 64), ('icon-192.png', 192), ('icon-512.png', 512)]:
    im.resize((size,size), Image.Resampling.LANCZOS).save(public/name, optimize=True)
print('Ícones WebApp/IconKitchen atualizados:', ', '.join(('favicon.png', 'icon-192.png', 'icon-512.png')))
