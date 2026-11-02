# RJP Mobilis Leiria RC3.6 — Ícone próprio

- Imagem-fonte: `assets/icon/mobilis-icon.png`.
- O GitHub Actions aplica os ícones **depois** do `npx cap sync android` e **antes** de `./gradlew assembleDebug`.
- São produzidos mipmaps mdpi/hdpi/xhdpi/xxhdpi/xxxhdpi, além de recursos para adaptive icons Android 8+.
- Incluídos favicon e Web App Manifest.
- O ícone só muda no dispositivo depois de instalares a nova APK; por vezes o launcher mantém cache (experimentar reiniciar ou remover atalho antigo).
- A APK debug pode exigir desinstalação se a assinatura da app anterior for diferente. Para futuras atualizações sem desinstalar, usar chave de assinatura estável.
