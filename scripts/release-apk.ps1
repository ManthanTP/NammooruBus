<#
.SYNOPSIS
  Builds, signs, and packages the production release APK for Nammooru Bus.
#>

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RootDir = Split-Path -Parent $ScriptDir
$AndroidDir = Join-Path $RootDir "android"
$PublicDownloads = Join-Path $RootDir "public\downloads"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Nammooru Bus: Production Release APK Build" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Check keystore configuration
$KeystoreProps = Join-Path $AndroidDir "keystore.properties"
if (-not (Test-Path $KeystoreProps)) {
    Write-Warning "keystore.properties not found in android/ directory."
    Write-Host "Creating sample keystore.properties from example..."
    $UserHome = [System.Environment]::GetFolderPath('UserProfile')
    $DefaultKeystore = Join-Path $UserHome "nammooru-release-key.keystore"

    if (-not (Test-Path $DefaultKeystore)) {
        Write-Host "Generating new release keystore at: $DefaultKeystore" -ForegroundColor Yellow
        keytool -genkeypair -v -keystore $DefaultKeystore -alias nammooru -keyalg RSA -keysize 2048 -validity 10000 -storepass nammooru2026 -keypass nammooru2026 -dname "CN=Nammooru Bus, OU=Engineering, O=Nammooru, L=Hubballi, ST=Karnataka, C=IN"
    }

    @"
storeFile=$($DefaultKeystore.Replace('\', '\\'))
storePassword=nammooru2026
keyAlias=nammooru
keyPassword=nammooru2026
"@ | Set-Content $KeystoreProps
    Write-Host "Wrote keystore.properties pointing to: $DefaultKeystore" -ForegroundColor Green
}

# 2. Build web bundle & sync
Write-Host "`n[1/4] Compiling web app bundle..." -ForegroundColor Yellow
Set-Location $RootDir
npm run build

Write-Host "`n[2/4] Syncing native Android assets with Capacitor..." -ForegroundColor Yellow
npx cap sync android

# 3. Assemble Release APK
Write-Host "`n[3/4] Running Gradle assembleRelease..." -ForegroundColor Yellow
Set-Location $AndroidDir
.\gradlew.bat assembleRelease

# 4. Copy to public/downloads/nammooru-bus.apk
Write-Host "`n[4/4] Publishing APK to website downloads..." -ForegroundColor Yellow
$BuiltApk = Join-Path $AndroidDir "app\build\outputs\apk\release\app-release.apk"

if (-not (Test-Path $BuiltApk)) {
    Write-Error "Release APK was not generated at expected path: $BuiltApk"
}

if (-not (Test-Path $PublicDownloads)) {
    New-Item -ItemType Directory -Force -Path $PublicDownloads | Out-Null
}

$TargetApk = Join-Path $PublicDownloads "nammooru-bus.apk"
Copy-Item -Path $BuiltApk -Destination $TargetApk -Force

$ApkItem = Get-Item $TargetApk
$SizeMb = [math]::Round($ApkItem.Length / 1MB, 2)
$Hash = (Get-FileHash $TargetApk -Algorithm SHA256).Hash

Write-Host "`n==========================================" -ForegroundColor Green
Write-Host " ✅ Production APK Successfully Created!" -ForegroundColor Green
Write-Host " Location: $TargetApk" -ForegroundColor Green
Write-Host " Size: $SizeMb MB ($($ApkItem.Length) bytes)" -ForegroundColor Green
Write-Host " SHA-256: $Hash" -ForegroundColor Green
Write-Host " Web URL: /downloads/nammooru-bus.apk" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
