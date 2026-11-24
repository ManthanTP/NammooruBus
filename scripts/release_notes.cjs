#!/usr/bin/env node

/**
 * release_notes.cjs
 * Synchronizes version.json, releases.json, docs/CHANGELOG.md,
 * android/app/build.gradle, and package.json.
 *
 * Usage:
 *   node scripts/release_notes.cjs --version 1.0.1 --code 2 --notes-en "Note 1|Note 2" --notes-kn "ಅಂಶ 1|ಅಂಶ 2"
 */

const fs = require('fs')
const path = require('path')

const rootDir = path.resolve(__dirname, '..')

function parseArgs() {
  const args = process.argv.slice(2)
  const parsed = {}
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg.startsWith('--')) {
      const key = arg.slice(2)
      if (key.includes('=')) {
        const [k, v] = key.split('=')
        parsed[k] = v
      } else if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
        parsed[key] = args[++i]
      } else {
        parsed[key] = true
      }
    }
  }
  return parsed
}

const args = parseArgs()

// 1. Read existing files
const pkgPath = path.join(rootDir, 'package.json')
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))

const versionJsonPath = path.join(rootDir, 'public', 'version.json')
let versionData = {}
if (fs.existsSync(versionJsonPath)) {
  versionData = JSON.parse(fs.readFileSync(versionJsonPath, 'utf8'))
}

const releasesJsonPath = path.join(rootDir, 'public', 'releases.json')
let releasesData = []
if (fs.existsSync(releasesJsonPath)) {
  releasesData = JSON.parse(fs.readFileSync(releasesJsonPath, 'utf8'))
}

// 2. Determine target version & code
const currentVersion = versionData.latest?.versionName || pkg.version || '1.0.0'
const currentCode = versionData.latest?.versionCode || 1

const targetVersion = args.version || currentVersion
const targetCode = args.code ? parseInt(args.code, 10) : (args.version && args.version !== currentVersion ? currentCode + 1 : currentCode)
const releasedAt = args.date || new Date().toISOString().split('T')[0]
const apkSize = args.size || versionData.latest?.apkSize || '15.1 MB'

const notesEn = args['notes-en']
  ? args['notes-en'].split('|').map((s) => s.trim())
  : (versionData.releaseNotes?.en || ['Release update with performance improvements and bug fixes.'])

const notesKn = args['notes-kn']
  ? args['notes-kn'].split('|').map((s) => s.trim())
  : (versionData.releaseNotes?.kn || ['ಕಾರ್ಯಕ್ಷಮತೆ ಸುಧಾರಣೆಗಳು ಮತ್ತು ದೋಷ ಪರಿಹಾರಗಳೊಂದಿಗೆ ಅಪ್‌ಡೇಟ್.'])

console.log(`Synchronizing release notes for v${targetVersion} (code ${targetCode})...`)

// 3. Update version.json
versionData.latest = {
  versionName: targetVersion,
  versionCode: targetCode,
  releasedAt,
  apkUrl: '/downloads/nammooru-bus.apk',
  apkSize,
  downloadPage: '/#app',
  whatsNewPage: '/whats-new',
}
versionData.minSupportedVersionCode = args.minCode ? parseInt(args.minCode, 10) : (versionData.minSupportedVersionCode || 1)
versionData.releaseNotes = {
  en: notesEn,
  kn: notesKn,
}
fs.writeFileSync(versionJsonPath, JSON.stringify(versionData, null, 2) + '\n', 'utf8')
console.log('✓ Updated public/version.json')

// 4. Update releases.json
const existingIdx = releasesData.findIndex((r) => r.versionName === targetVersion)
const releaseEntry = {
  versionName: targetVersion,
  versionCode: targetCode,
  releasedAt,
  apkUrl: '/downloads/nammooru-bus.apk',
  apkSize,
  downloadPage: '/#app',
  whatsNewPage: '/whats-new',
  title: {
    en: args['title-en'] || `Release v${targetVersion}`,
    kn: args['title-kn'] || `ಆವೃತ್ತಿ v${targetVersion}`,
  },
  notes: {
    en: notesEn,
    kn: notesKn,
  },
}

if (existingIdx !== -1) {
  releasesData[existingIdx] = releaseEntry
} else {
  releasesData.unshift(releaseEntry)
}
fs.writeFileSync(releasesJsonPath, JSON.stringify(releasesData, null, 2) + '\n', 'utf8')
console.log('✓ Updated public/releases.json')

// 5. Update package.json
pkg.version = targetVersion
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8')
console.log('✓ Updated package.json')

// 6. Update android/app/build.gradle
const gradlePath = path.join(rootDir, 'android', 'app', 'build.gradle')
if (fs.existsSync(gradlePath)) {
  let gradleContent = fs.readFileSync(gradlePath, 'utf8')
  gradleContent = gradleContent.replace(/versionCode\s+\d+/, `versionCode ${targetCode}`)
  gradleContent = gradleContent.replace(/versionName\s+"[^"]+"/, `versionName "${targetVersion}"`)
  fs.writeFileSync(gradlePath, gradleContent, 'utf8')
  console.log('✓ Updated android/app/build.gradle')
}

// 6b. Update src/config/links.js
const linksPath = path.join(rootDir, 'src', 'config', 'links.js')
if (fs.existsSync(linksPath)) {
  let linksContent = fs.readFileSync(linksPath, 'utf8')
  linksContent = linksContent.replace(/APK_VERSION\s*=\s*"[^"]+"/, `APK_VERSION = "${targetVersion}"`)
  if (args.size) {
    linksContent = linksContent.replace(/APK_SIZE\s*=\s*"[^"]+"/, `APK_SIZE = "${args.size}"`)
  }
  fs.writeFileSync(linksPath, linksContent, 'utf8')
  console.log('✓ Updated src/config/links.js')
}

// 7. Update docs/CHANGELOG.md if needed
const changelogPath = path.join(rootDir, 'docs', 'CHANGELOG.md')
if (fs.existsSync(changelogPath)) {
  let changelog = fs.readFileSync(changelogPath, 'utf8')
  if (!changelog.includes(`## [v${targetVersion}]`)) {
    const newSection = `## [v${targetVersion}] - ${releasedAt}\n\n### ${args['title-en'] || `Release v${targetVersion}`}\n\n` +
      notesEn.map((n) => `- ${n}`).join('\n') + '\n\n---\n\n'
    changelog = changelog.replace(/# Nammooru Bus — Changelog\n\nAll notable releases and updates to Nammooru Bus are documented in this file\.\n\n---\n\n/, (match) => {
      return match + newSection
    })
    fs.writeFileSync(changelogPath, changelog, 'utf8')
    console.log('✓ Updated docs/CHANGELOG.md')
  }
}

console.log('Release notes synchronization complete!')
