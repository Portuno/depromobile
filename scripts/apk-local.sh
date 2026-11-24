#!/usr/bin/env bash
# Arma el APK de producción en esta compu (Linux o macOS), sin gastar los builds del plan de Expo.
# Hace falta, una vez: Java 17 (JDK), el Android SDK (ANDROID_HOME) y estar logueado en Expo (npx eas-cli login).
#   sudo apt install openjdk-17-jdk          # o el de tu distro
#   Android SDK: Android Studio, o solo las command-line tools, con platform-tools, build-tools y platforms;android-35
# Uso: ./scripts/apk-local.sh   → deja el .apk en dist/
set -euo pipefail
cd "$(dirname "$0")/.."
command -v java >/dev/null || { echo "Falta Java 17 (JDK)"; exit 1; }
[ -n "${ANDROID_HOME:-}" ] || { echo "Falta ANDROID_HOME (la carpeta del Android SDK)"; exit 1; }
npm ci
npm test
npx tsc --noEmit
mkdir -p dist
npx -y eas-cli@latest build --platform android --profile production --local --non-interactive --output "dist/deprocast-$(node -p "require('./app.json').expo.version")-$(node -p "require('./app.json').expo.android.versionCode").apk"
ls -lh dist/*.apk
