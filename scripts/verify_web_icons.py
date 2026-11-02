#!/usr/bin/env python3
"""Valida ícones Web/PWA e as respetivas referências antes da publicação."""
import json
from pathlib import Path
from PIL import Image

public=Path("public")
dist=Path("dist")
manifest=json.loads((public/"manifest.webmanifest").read_text(encoding="utf-8"))
for entry in manifest.get("icons",[]):
    uri=entry["src"]
    if not uri.startswith("/") or uri.startswith("//"):
        raise SystemExit(f"Caminho de ícone PWA inválido: {uri}")
    target=dist/uri.lstrip("/")
    if not target.is_file():
        raise SystemExit(f"Manifesto aponta para ícone em falta: {uri}")
    with Image.open(target) as img:
        img.verify()
    print("PWA:",uri,"OK")
for name in ("favicon.png","icon-192.png","icon-512.png"):
    if not (dist/name).is_file():
        raise SystemExit(f"Imagem web não incluída na compilação: {name}")
print("Ícones WebApp verificados.")
