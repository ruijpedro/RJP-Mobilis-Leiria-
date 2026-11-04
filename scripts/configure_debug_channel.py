#!/usr/bin/env python3
"""Isola a APK de desenvolvimento para impedir conflito com a release assinada.

Executar depois de npx cap sync android e antes de assembleDebug.
"""
from pathlib import Path
import re
import sys

def configure(text):
    if not re.search(r'\bbuildTypes\s*\{', text):
        raise ValueError('Bloco buildTypes não encontrado')
    if 'applicationIdSuffix ".dev"' in text:
        return text
    # Cria um buildType debug explícito sem modificar a identidade de release.
    return re.sub(r'(\bbuildTypes\s*\{)',
                  r'\1\n        debug {\n            applicationIdSuffix ".dev"\n            versionNameSuffix "-dev"\n        }',
                  text, count=1)

if __name__ == "__main__":
    p=Path(sys.argv[1] if len(sys.argv)>1 else 'android/app/build.gradle')
    p.write_text(configure(p.read_text(encoding='utf-8')),encoding='utf-8')
    print('Canal debug: pt.rjp.mobilisleiria.dev — separado da APK assinada')
