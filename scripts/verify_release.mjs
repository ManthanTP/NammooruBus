import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

export function getVersionState() {
  // 1. android/app/build.gradle (SINGLE SOURCE OF TRUTH)
  const gradlePath = path.join(rootDir, 'android', 'app', 'build.gradle')
  const gradleContent = fs.readFileSync(gradlePath, 'utf8')
  const gradleCodeMatch = gradleContent.match(/versionCode\s+(\d+)/)
  const gradleNameMatch = gradleContent.match(/versionName\s+"([^"]+)"/)

  const gradleVersionCode = gradleCodeMatch ? parseInt(gradleCodeMatch[1], 10) : null
  const gradleVersionName = gradleNameMatch ? gradleNameMatch[1] : null

  // 2. package.json
  const pkgPath = path.join(rootDir, 'package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
  const pkgVersion = pkg.version

  // 3. src/config/links.js
  const linksPath = path.join(rootDir, 'src', 'config', 'links.js')
  const linksContent = fs.readFileSync(linksPath, 'utf8')
  const linksNameMatch = linksContent.match(/export const APK_VERSION = ["']([^"']+)["']/)
  const linksCodeMatch = linksContent.match(/export const APK_BUILD = ["']([^"']+)["']/)
  const linksVersionName = linksNameMatch ? linksNameMatch[1] : null
  const linksVersionCode = linksCodeMatch ? parseInt(linksCodeMatch[1], 10) : null

  // 4. public/version.json
  const versionJsonPath = path.join(rootDir, 'public', 'version.json')
  const versionJson = JSON.parse(fs.readFileSync(versionJsonPath, 'utf8'))
  const versionJsonName = versionJson.latest?.versionName
  const versionJsonCode = versionJson.latest?.versionCode ? parseInt(versionJson.latest.versionCode, 10) : null

  // 5. public/releases.json
  const releasesJsonPath = path.join(rootDir, 'public', 'releases.json')
  const releasesJson = JSON.parse(fs.readFileSync(releasesJsonPath, 'utf8'))
  const latestRelease = Array.isArray(releasesJson) ? releasesJson[0] : null
  const releasesName = latestRelease?.versionName
  const releasesCode = latestRelease?.versionCode ? parseInt(latestRelease.versionCode, 10) : null

  return {
    gradle: { name: gradleVersionName, code: gradleVersionCode, path: 'android/app/build.gradle' },
    packageJson: { name: pkgVersion, code: null, path: 'package.json' },
    linksJs: { name: linksVersionName, code: linksVersionCode, path: 'src/config/links.js' },
    versionJson: { name: versionJsonName, code: versionJsonCode, path: 'public/version.json' },
    releasesJson: { name: releasesName, code: releasesCode, path: 'public/releases.json' },
  }
}

export function verifyRelease() {
  const state = getVersionState()
  const targetName = state.gradle.name
  const targetCode = state.gradle.code

  console.log(`\n🔍 Verifying Version Synchronization across 5 targets (Truth: build.gradle v${targetName} / Build ${targetCode}):`)

  const mismatches = []

  // Check version names
  if (state.packageJson.name !== targetName) {
    mismatches.push(`package.json version "${state.packageJson.name}" !== "${targetName}"`)
  }
  if (state.linksJs.name !== targetName) {
    mismatches.push(`src/config/links.js APK_VERSION "${state.linksJs.name}" !== "${targetName}"`)
  }
  if (state.versionJson.name !== targetName) {
    mismatches.push(`public/version.json latest.versionName "${state.versionJson.name}" !== "${targetName}"`)
  }
  if (state.releasesJson.name !== targetName) {
    mismatches.push(`public/releases.json latest release versionName "${state.releasesJson.name}" !== "${targetName}"`)
  }

  // Check version codes
  if (state.linksJs.code !== targetCode) {
    mismatches.push(`src/config/links.js APK_BUILD ${state.linksJs.code} !== ${targetCode}`)
  }
  if (state.versionJson.code !== targetCode) {
    mismatches.push(`public/version.json latest.versionCode ${state.versionJson.code} !== ${targetCode}`)
  }
  if (state.releasesJson.code !== targetCode) {
    mismatches.push(`public/releases.json latest release versionCode ${state.releasesJson.code} !== ${targetCode}`)
  }

  console.log(`  - android/app/build.gradle: v${state.gradle.name} (versionCode: ${state.gradle.code}) [SOURCE]`)
  console.log(`  - package.json:             v${state.packageJson.name}`)
  console.log(`  - src/config/links.js:      v${state.linksJs.name} (APK_BUILD: ${state.linksJs.code})`)
  console.log(`  - public/version.json:      v${state.versionJson.name} (versionCode: ${state.versionJson.code})`)
  console.log(`  - public/releases.json:     v${state.releasesJson.name} (versionCode: ${state.releasesJson.code})`)

  if (mismatches.length > 0) {
    console.error(`\n❌ Version mismatch detected! Single source of truth violated:`)
    mismatches.forEach((m) => console.error(`   • ${m}`))
    return false
  }

  console.log(`\n✅ All 5 release configuration targets are 100% synchronized!`)
  return true
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const success = verifyRelease()
  if (!success) {
    process.exit(1)
  }
}
