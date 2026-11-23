import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { APK_URL } from '../src/config/links.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

if (APK_URL) {
  const relPath = APK_URL.replace(/^\//, '')
  const apkPath = path.join(rootDir, 'public', relPath)

  if (!fs.existsSync(apkPath)) {
    console.error(`❌ Build check failed: APK_URL is set to "${APK_URL}" but file does not exist at "${apkPath}".`)
    process.exit(1)
  }

  const stats = fs.statSync(apkPath)
  if (stats.size === 0) {
    console.error(`❌ Build check failed: APK file at "${apkPath}" is empty (0 bytes).`)
    process.exit(1)
  }

  const mb = (stats.size / (1024 * 1024)).toFixed(1)
  console.log(`✅ APK verification passed: "${APK_URL}" exists (${mb} MB).`)
} else {
  console.log('ℹ️ APK_URL is empty; skipping APK file verification.')
}
