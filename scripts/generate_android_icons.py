#!/usr/bin/env python3
"""Cria ícones Android RJP Mobilis com NOMES próprios, sem colisões Capacitor."""
from pathlib import Path
from PIL import Image, ImageChops
import base64, io

ROOT=Path(__file__).resolve().parents[1]
RES=ROOT/"android/app/src/main/res"
SIZES={"mdpi":48,"hdpi":72,"xhdpi":96,"xxhdpi":144,"xxxhdpi":192}

def load_image(encoded, fallback):
    source=ROOT/"assets/icon"/encoded
    if source.exists():
        data=base64.b64decode(source.read_text(encoding="ascii").strip(),validate=True)
        img=Image.open(io.BytesIO(data)).convert("RGBA")
    else:
        img=Image.open(ROOT/"assets/icon"/fallback).convert("RGBA")
    img.load()
    return img

if not RES.is_dir():
    raise SystemExit("Pasta res Android não existe; executar npx cap sync android")

launcher=load_image("iconkit-launcher.b64","mobilis-icon.png")
foreground=load_image("iconkit-foreground.b64","mobilis-adaptive-foreground.png")
if min(launcher.size)<96 or min(foreground.size)<96:
    raise SystemExit("Imagens do ícone RJP demasiado pequenas")

# Prefixo único evita que o Capacitor possa escolher o seu ícone predefinido.
for density,pixels in SIZES.items():
    mip=RES/f"mipmap-{density}"
    mip.mkdir(parents=True,exist_ok=True)
    launcher.resize((pixels,pixels),Image.Resampling.LANCZOS).save(mip/"rjp_mobilis_launcher.png")
    launcher.resize((pixels,pixels),Image.Resampling.LANCZOS).save(mip/"rjp_mobilis_round.png")
    draw=RES/f"drawable-{density}"
    draw.mkdir(parents=True,exist_ok=True)
    dimension=pixels*108//48
    foreground.resize((dimension,dimension),Image.Resampling.LANCZOS).save(draw/"rjp_mobilis_foreground.png")
    alpha=foreground.getchannel("A").resize((dimension,dimension),Image.Resampling.LANCZOS)
    mono=Image.new("RGBA",(dimension,dimension),(255,255,255,0))
    mono.putalpha(alpha)
    mono.save(draw/"rjp_mobilis_monochrome.png")

values=RES/"values"
values.mkdir(parents=True,exist_ok=True)
(values/"rjp_mobilis_background.xml").write_text(
    '<?xml version="1.0" encoding="utf-8"?>\n<resources><color name="rjp_mobilis_background">#062E59</color></resources>\n',
    encoding="utf-8"
)
adaptive='''<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/rjp_mobilis_background" />
    <foreground android:drawable="@drawable/rjp_mobilis_foreground" />
    <monochrome android:drawable="@drawable/rjp_mobilis_monochrome" />
</adaptive-icon>
'''
folder=RES/"mipmap-anydpi-v26"
folder.mkdir(parents=True,exist_ok=True)
for name in ("rjp_mobilis_launcher.xml","rjp_mobilis_round.xml"):
    (folder/name).write_text(adaptive,encoding="utf-8")

# Falhar antes de gerar APK se o XML não for válido.
import xml.etree.ElementTree as ET
for name in ("rjp_mobilis_launcher.xml","rjp_mobilis_round.xml"):
    ET.parse(folder/name)
for density in SIZES:
    assert (RES/f"mipmap-{density}"/"rjp_mobilis_launcher.png").stat().st_size>500
print("Ícones RJP Mobilis únicos verificados: 5 densidades + launcher adaptativo.")
