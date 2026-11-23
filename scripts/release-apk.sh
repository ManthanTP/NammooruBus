#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
ANDROID_DIR="$ROOT_DIR/android"
PUBLIC_DOWNLOADS="$ROOT_DIR/public/downloads"

echo "=========================================="
echo " Nammooru Bus: Production Release APK Build"
echo "=========================================="

KEYSTORE_PROPS="$ANDROID_DIR/keystore.properties"
if [ ! -f "$KEYSTORE_PROPS" ]; then
    echo "Warning: keystore.properties not found in android/ directory."
    KEYSTORE_PATH="$HOME/nammooru-release-key.keystore"
    if [ ! -f "$KEYSTORE_PATH" ]; then
        echo "Generating release keystore at: $KEYSTORE_PATH"
        keytool -genkeypair -v -keystore "$KEYSTORE_PATH" -alias nammooru -keyalg RSA -keysize 2048 -validity 10000 -storepass nammooru2026 -keypass nammooru2026 -dname "CN=Nammooru Bus, OU=Engineering, O=Nammooru, L=Hubballi, ST=Karnataka, C=IN"
    fi
    cat <<EOF > "$KEYSTORE_PROPS"
storeFile=$KEYSTORE_PATH
storePassword=nammooru2026
keyAlias=nammooru
keyPassword=nammooru2026
EOF
    echo "Created keystore.properties."
fi

echo "[1/4] Compiling web app bundle..."
cd "$ROOT_DIR"
npm run build

echo "[2/4] Syncing native Android assets with Capacitor..."
npx cap sync android

echo "[3/4] Running Gradle assembleRelease..."
cd "$ANDROID_DIR"
./gradlew assembleRelease

echo "[4/4] Publishing APK to website downloads..."
BUILT_APK="$ANDROID_DIR/app/build/outputs/apk/release/app-release.apk"
if [ ! -f "$BUILT_APK" ]; then
    echo "Error: Release APK not found at $BUILT_APK"
    exit 1
fi

mkdir -p "$PUBLIC_DOWNLOADS"
TARGET_APK="$PUBLIC_DOWNLOADS/nammooru-bus.apk"
cp -f "$BUILT_APK" "$TARGET_APK"

echo "=========================================="
echo " ✅ Production APK Successfully Created!"
echo " Location: $TARGET_APK"
echo " Web URL: /downloads/nammooru-bus.apk"
echo "=========================================="
