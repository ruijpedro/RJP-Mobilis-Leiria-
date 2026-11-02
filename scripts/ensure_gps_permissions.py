#!/usr/bin/env python3
"""Garante permissões GPS no Manifest gerado pelo Capacitor."""
from pathlib import Path
import xml.etree.ElementTree as ET

path = Path("android/app/src/main/AndroidManifest.xml")
if not path.exists():
    raise SystemExit("AndroidManifest.xml não encontrado: executar npx cap sync android primeiro")
android = "http://schemas.android.com/apk/res/android"
ET.register_namespace("android", android)
tree = ET.parse(path)
root = tree.getroot()
existing = {element.get(f"{{{android}}}name") for element in root.findall("uses-permission")}
for permission in ("android.permission.ACCESS_FINE_LOCATION", "android.permission.ACCESS_COARSE_LOCATION"):
    if permission not in existing:
        el = ET.Element("uses-permission")
        el.set(f"{{{android}}}name", permission)
        root.insert(0, el)
# Capacitor pode recriar o Manifest: garantir ícones personalizados.
application = root.find("application")
if application is None:
    raise SystemExit("Application em falta no AndroidManifest.xml")
application.set(f"{{{android}}}icon", "@mipmap/ic_launcher")
application.set(f"{{{android}}}roundIcon", "@mipmap/ic_launcher_round")
tree.write(path, encoding="utf-8", xml_declaration=True)
print("Manifest Android: GPS e ícones personalizados associados explicitamente.")
