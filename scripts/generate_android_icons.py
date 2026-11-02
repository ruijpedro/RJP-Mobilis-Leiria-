#!/usr/bin/env python3
"""Generate Android launcher assets after `npx cap sync android`.
Runs in GitHub Actions; requires Pillow. Does not depend on existing Android project.
"""
from pathlib import Path
from PIL import Image
import io

ROOT = Path(__file__).resolve().parents[1]
ANDROID = ROOT / "android/app/src/main/res"
ICON = ROOT / "assets/icon/mobilis-icon.png"
FOREGROUND = ROOT / "assets/icon/mobilis-adaptive-foreground.png"
SIZES = {"mdpi":48,"hdpi":72,"xhdpi":96,"xxhdpi":144,"xxxhdpi":192}

if not ANDROID.exists():
    raise SystemExit(f"Android resources unavailable: {ANDROID}. Run cap add/sync first.")
main = Image.open(ICON).convert("RGBA")
fg = Image.open(FOREGROUND).convert("RGBA")
for scale, pixels in SIZES.items():
    folder = ANDROID / f"mipmap-{scale}"
    folder.mkdir(parents=True, exist_ok=True)
    for name in ("ic_launcher.png", "ic_launcher_round.png"):
        main.resize((pixels,pixels),Image.Resampling.LANCZOS).save(folder/name)
    # Android foreground full asset is 108dp, including adaptive-safe padding.
    drawable = ANDROID / f"drawable-{scale}"
    drawable.mkdir(parents=True, exist_ok=True)
    fg.resize((pixels*108//48,pixels*108//48),Image.Resampling.LANCZOS).save(drawable/'ic_launcher_foreground.png')

(ANDROID/'values').mkdir(parents=True,exist_ok=True)
(ANDROID/'values'/'mobilis_icon_background.xml').write_text(
    '<?xml version="1.0" encoding="utf-8"?><resources><color name="mobilis_icon_background">#062E59</color></resources>\n',
    encoding='utf-8'
)
folder=ANDROID/'mipmap-anydpi-v26'
folder.mkdir(parents=True, exist_ok=True)
adaptive="""<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/mobilis_icon_background" />
    <foreground android:drawable="@drawable/ic_launcher_foreground" />
</adaptive-icon>
"""
for filename in ('ic_launcher.xml','ic_launcher_round.xml'):
    (folder/filename).write_text(adaptive, encoding='utf-8')
print('Mobilis launcher icons generated for five densities and adaptive Android.')
