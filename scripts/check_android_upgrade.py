#!/usr/bin/env python3
"""Garante compatibilidade da nova APK Android com a release assinada anterior.

Requer o aapt e o apksigner do Android SDK. Nunca altera a chave JKS.
"""
import re
import subprocess
import sys
from pathlib import Path


def identity(apk, aapt, apksigner):
    badging=subprocess.run([aapt,"dump","badging",str(apk)],check=True,
                           capture_output=True,text=True).stdout
    certificates=subprocess.run([apksigner,"verify","--print-certs",str(apk)],
                                check=True,capture_output=True,text=True).stdout
    match=re.search(r"^package: name='([^']+)' versionCode='([0-9]+)' versionName='([^']+)'",
                    badging,re.M)
    signature=re.search(r"Signer #1 certificate SHA-256 digest: ([a-fA-F0-9]+)",certificates)
    if not match or not signature:
        raise SystemExit("Não foi possível verificar package/versionCode/certificado da APK.")
    return {"package":match.group(1),"versionCode":int(match.group(2)),
            "versionName":match.group(3),"sha256":signature.group(1).lower()}


def compare(previous, current):
    if current["package"]!=previous["package"]:
        raise ValueError("O identificador Android mudou: não atualiza a app já instalada.")
    if current["sha256"]!=previous["sha256"]:
        raise ValueError("O certificado Android mudou: não instala por cima da versão anterior.")
    if current["versionCode"]<=previous["versionCode"]:
        raise ValueError("versionCode não é superior ao da APK anterior.")
    return True


if __name__=="__main__":
    if len(sys.argv)!=5:
        raise SystemExit("Uso: check_android_upgrade.py anterior.apk nova.apk caminho-aapt caminho-apksigner")
    old,new=Path(sys.argv[1]),Path(sys.argv[2])
    aapt,apksigner=sys.argv[3:]
    if not old.is_file() or not new.is_file():
        raise SystemExit("Uma das APK não existe")
    previous=identity(old,aapt,apksigner)
    current=identity(new,aapt,apksigner)
    print("APK anterior:",previous["package"],previous["versionName"],previous["versionCode"])
    print("APK nova:",current["package"],current["versionName"],current["versionCode"])
    try:
        compare(previous,current)
    except ValueError as exc:
        print("INCOMPATÍVEL:",exc,file=sys.stderr)
        raise SystemExit(1)
    print("Atualização Android compatível: package e assinatura iguais, versionCode superior.")
