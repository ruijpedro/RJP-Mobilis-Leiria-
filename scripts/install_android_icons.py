from pathlib import Path
import shutil
root = Path(__file__).resolve().parents[1]
source = root / 'assets' / 'android'
target = root / 'android' / 'app' / 'src' / 'main' / 'res'
if not target.exists():
    raise SystemExit('Android não encontrado: executar npx cap add android primeiro')
for folder in source.iterdir():
    dest = target / folder.name
    dest.mkdir(exist_ok=True)
    for file in folder.glob('*.png'):
        shutil.copy2(file, dest / file.name)
print('Ícones Android aplicados com sucesso')
