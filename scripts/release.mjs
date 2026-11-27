import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'
import { verifyRelease } from './verify_release.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const androidDir = path.join(rootDir, 'android')

function runCommand(command, cwd = rootDir) {
  console.log(`\n⚙️  Running: ${command} (in ${path.relative(rootDir, cwd) || '.'})`)
  execSync(command, { cwd, stdio: 'inherit' })
}

function computeFileHashAndSize(filePath) {
  const fileBuffer = fs.readFileSync(filePath)
  const hashSum = crypto.createHash('sha256')
  hashSum.update(fileBuffer)
  const sha256 = hashSum.digest('hex')
  const bytes = fs.statSync(filePath).size
  const mb = (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return { sha256, bytes, mb }
}

async function main() {
  const args = process.argv.slice(2)
  const skipApk = args.includes('--skip-apk')
  const bumpOnly = args.includes('--bump-only')
  const noBump = args.includes('--no-bump')

  // Find explicit version argument (e.g. "1.0.5" or "--version=1.0.5")
  let targetVersion = null
  let customNotes = null
  for (const arg of args) {
    if (arg.startsWith('--version=')) {
      targetVersion = arg.split('=')[1].trim()
    } else if (arg.startsWith('--notes=')) {
      customNotes = arg.slice(8).split('|').map((s) => s.trim()).filter(Boolean)
    } else if (/^\d+\.\d+\.\d+$/.test(arg)) {
      targetVersion = arg.trim()
    }
  }

  // Read current single source of truth from android/app/build.gradle
  const gradlePath = path.join(androidDir, 'app', 'build.gradle')
  let gradleContent = fs.readFileSync(gradlePath, 'utf8')

  const codeMatch = gradleContent.match(/versionCode\s+(\d+)/)
  const nameMatch = gradleContent.match(/versionName\s+"([^"]+)"/)

  if (!codeMatch || !nameMatch) {
    throw new Error('Could not parse versionCode or versionName from android/app/build.gradle')
  }

  const currentCode = parseInt(codeMatch[1], 10)
  const currentName = nameMatch[1]

  const newCode = noBump ? currentCode : currentCode + 1
  if (!targetVersion) {
    if (noBump) {
      targetVersion = currentName
    } else {
      // Auto-bump patch version if none specified
      const parts = currentName.split('.').map(Number)
      parts[2] = (parts[2] || 0) + 1
      targetVersion = parts.join('.')
    }
  }

  const todayStr = new Date().toISOString().split('T')[0]

  console.log(`\n======================================================`)
  console.log(`🚀 NAMMOORU BUS RELEASE PIPELINE`)
  console.log(`   Target Version: v${targetVersion}`)
  console.log(`   versionCode:    ${newCode} (from ${currentCode})`)
  console.log(`   Release Date:   ${todayStr}`)
  console.log(`======================================================\n`)

  // 1. Update android/app/build.gradle (SINGLE SOURCE OF TRUTH)
  console.log('📝 1/5 Updating android/app/build.gradle...')
  gradleContent = gradleContent
    .replace(/versionCode\s+\d+/, `versionCode ${newCode}`)
    .replace(/versionName\s+"[^"]+"/, `versionName "${targetVersion}"`)
  fs.writeFileSync(gradlePath, gradleContent, 'utf8')

  // 2. Update package.json
  console.log('📝 2/5 Updating package.json...')
  const pkgPath = path.join(rootDir, 'package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
  pkg.version = targetVersion
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8')

  // 3. Update src/config/links.js
  console.log('📝 3/5 Updating src/config/links.js...')
  const linksPath = path.join(rootDir, 'src', 'config', 'links.js')
  let linksContent = fs.readFileSync(linksPath, 'utf8')
  linksContent = linksContent
    .replace(/export const APK_VERSION = ["'][^"']+["'];?/, `export const APK_VERSION = "${targetVersion}";`)
    .replace(/export const APK_BUILD = ["'][^"']+["'];?/, `export const APK_BUILD = "${newCode}";`)
  fs.writeFileSync(linksPath, linksContent, 'utf8')

  // 4. Update public/version.json
  console.log('📝 4/5 Updating public/version.json...')
  const versionJsonPath = path.join(rootDir, 'public', 'version.json')
  const versionJson = JSON.parse(fs.readFileSync(versionJsonPath, 'utf8'))
  versionJson.latest.versionName = targetVersion
  versionJson.latest.versionCode = newCode
  versionJson.latest.releasedAt = todayStr
  if (customNotes && customNotes.length > 0) {
    versionJson.releaseNotes = {
      en: customNotes,
      kn: [
        'ನಿಜವಾದ ದೂರದ ಆಧಾರದ ಮೇಲೆ ದರ ಲೆಕ್ಕಾಚಾರ',
        'ಪ್ರಯಾಣ ವಿವರಗಳ ಖಾಲಿ ಜಾಗ ಸರಿಪಡಿಸಲಾಗಿದೆ',
        'ಉಳಿಸಿ/ಹಂಚಿಕೊಳ್ಳಿ/ಟ್ರ್ಯಾಕ್/SOS ಬಾರ್ ಕೆಳಭಾಗದಲ್ಲಿ ಸ್ಥಿರಗೊಳಿಸಲಾಗಿದೆ',
      ],
    }
  }
  fs.writeFileSync(versionJsonPath, JSON.stringify(versionJson, null, 2) + '\n', 'utf8')

  // 5. Update public/releases.json
  console.log('📝 5/5 Updating public/releases.json...')
  const releasesJsonPath = path.join(rootDir, 'public', 'releases.json')
  const releases = JSON.parse(fs.readFileSync(releasesJsonPath, 'utf8'))

  // Check if current release already in array, otherwise prepend
  const existingIdx = releases.findIndex((r) => r.versionCode === newCode || r.versionName === targetVersion)
  const releaseEntry = {
    versionName: targetVersion,
    versionCode: newCode,
    releasedAt: todayStr,
    apkUrl: '/downloads/nammooru-bus.apk',
    apkSize: versionJson.latest.apkSize || '7.3 MB',
    downloadPage: '/#app',
    whatsNewPage: '/whats-new',
    title: {
      en: `Release v${targetVersion} - Stabilize`,
      kn: `ಆವೃತ್ತಿ v${targetVersion} - ಸ್ಥಿರ ಆವೃತ್ತಿ`,
    },
    notes: versionJson.releaseNotes || {
      en: [`Release v${targetVersion}: Stability and performance updates`],
      kn: [`ಆವೃತ್ತಿ v${targetVersion}: ಸ್ಥಿರತೆ ಮತ್ತು ಕಾರ್ಯಕ್ಷಮತೆ ಸುಧಾರಣೆಗಳು`],
    },
  }

  if (existingIdx >= 0) {
    releases[existingIdx] = { ...releases[existingIdx], ...releaseEntry }
  } else {
    releases.unshift(releaseEntry)
  }
  fs.writeFileSync(releasesJsonPath, JSON.stringify(releases, null, 2) + '\n', 'utf8')

  // Verify all 5 files are 100% in sync
  const synced = verifyRelease()
  if (!synced) {
    throw new Error('Version synchronization verification failed!')
  }

  if (bumpOnly) {
    console.log('\n✨ Bump-only completed successfully.')
    return
  }

  // Safety net checks: lint, vitest, and smoke
  console.log('\n🛡️ Running Safety Net: npm run lint && npm run test...')
  runCommand('npm run lint')
  runCommand('npm run test')

  // Build web bundle
  console.log('\n📦 Compiling Web Production Bundle...')
  runCommand('npm run build')

  if (skipApk) {
    console.log('\n⚡ --skip-apk flag set: skipping Android Gradle APK build.')
    return
  }

  // Build Native APK
  console.log('\n🤖 Building Native Android Release APK...')
  runCommand('npx cap sync android')

  // Exclude recursive downloads directory from native assets
  const androidDownloads = path.join(androidDir, 'app', 'src', 'main', 'assets', 'public', 'downloads')
  if (fs.existsSync(androidDownloads)) {
    console.log('🧹 Removing downloads directory from native assets...')
    fs.rmSync(androidDownloads, { recursive: true, force: true })
  }

  // Gradle assembleRelease
  const isWindows = process.platform === 'win32'
  const gradlewCmd = isWindows ? '.\\gradlew.bat assembleRelease' : './gradlew assembleRelease'
  runCommand(gradlewCmd, androidDir)

  // Find generated APK
  const generatedApk = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk')
  if (!fs.existsSync(generatedApk)) {
    throw new Error(`Built APK not found at: ${generatedApk}`)
  }

  // Publish to public/downloads/nammooru-bus.apk
  const publicDownloads = path.join(rootDir, 'public', 'downloads')
  if (!fs.existsSync(publicDownloads)) {
    fs.mkdirSync(publicDownloads, { recursive: true })
  }
  const publishedApk = path.join(publicDownloads, 'nammooru-bus.apk')
  fs.copyFileSync(generatedApk, publishedApk)

  const { sha256, bytes, mb } = computeFileHashAndSize(publishedApk)

  console.log(`\n🎉 APK Published Successfully!`)
  console.log(`   Path:    public/downloads/nammooru-bus.apk`)
  console.log(`   Size:    ${mb} (${bytes} bytes)`)
  console.log(`   SHA-256: ${sha256}`)

  // Update APK_SIZE across links.js, version.json, releases.json
  linksContent = fs.readFileSync(linksPath, 'utf8')
  linksContent = linksContent.replace(/export const APK_SIZE = ["'][^"']+["'];?/, `export const APK_SIZE = "${mb}";`)
  fs.writeFileSync(linksPath, linksContent, 'utf8')

  const finalVerJson = JSON.parse(fs.readFileSync(versionJsonPath, 'utf8'))
  finalVerJson.latest.apkSize = mb
  finalVerJson.latest.sha256 = sha256
  fs.writeFileSync(versionJsonPath, JSON.stringify(finalVerJson, null, 2) + '\n', 'utf8')

  const finalReleases = JSON.parse(fs.readFileSync(releasesJsonPath, 'utf8'))
  if (finalReleases.length > 0) {
    finalReleases[0].apkSize = mb
    finalReleases[0].sha256 = sha256
  }
  fs.writeFileSync(releasesJsonPath, JSON.stringify(finalReleases, null, 2) + '\n', 'utf8')

  // Final verification check
  verifyRelease()
  console.log(`\n🏆 Release v${targetVersion} (Build ${newCode}) completed and verified!`)
}

main().catch((err) => {
  console.error('\n💥 Release pipeline failed:', err.message)
  process.exit(1)
})
