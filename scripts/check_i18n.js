import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const srcDir = path.join(rootDir, 'src')
const localesDir = path.join(srcDir, 'i18n', 'locales')

const enPath = path.join(localesDir, 'en.json')
const knPath = path.join(localesDir, 'kn.json')

const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'))
const knData = JSON.parse(fs.readFileSync(knPath, 'utf8'))

// Flatten nested objects into dot-separated paths
function flattenKeys(obj, prefix = '') {
  let keys = {}
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(keys, flattenKeys(v, fullKey))
    } else {
      keys[fullKey] = v
    }
  }
  return keys
}

const enFlat = flattenKeys(enData)
const knFlat = flattenKeys(knData)

// Recursively find all js/jsx files in src
function getFiles(dir) {
  let results = []
  const list = fs.readdirSync(dir)
  for (const file of list) {
    const fullPath = path.join(dir, file)
    const stat = fs.statSync(fullPath)
    if (stat && stat.isDirectory()) {
      if (file !== '__tests__' && file !== 'node_modules') {
        results = results.concat(getFiles(fullPath))
      }
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      results.push(fullPath)
    }
  }
  return results
}

const files = getFiles(srcDir)

// Regex patterns to capture translation keys
// t('key') or t("key") or i18n.t('key') or i18n.t("key")
// Also handles options e.g. t('key', { ... }) or t('key', 'default')
const keyRegex = /\b(?:t|i18n\.t)\s*\(\s*['"]([a-zA-Z0-9_.-]+)['"]/g

const usedKeys = new Set()
const keyLocations = {}

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8')
  let match
  while ((match = keyRegex.exec(content)) !== null) {
    const key = match[1]
    // Filter out common false positives if any (e.g. single character or standard keywords)
    if (key.includes('.')) {
      usedKeys.add(key)
      if (!keyLocations[key]) keyLocations[key] = []
      keyLocations[key].push(path.relative(rootDir, file))
    }
  }
}

console.log(`Found ${usedKeys.size} distinct i18n keys used in code.`)

let errors = 0

// 1. Check keys used in code but missing in en.json
const missingInEn = []
for (const key of usedKeys) {
  if (!(key in enFlat)) {
    missingInEn.push(key)
    errors++
  }
}

// 2. Check keys used in code but missing in kn.json
const missingInKn = []
for (const key of usedKeys) {
  if (!(key in knFlat)) {
    missingInKn.push(key)
    errors++
  }
}

// 3. Check keys present in en but missing in kn
const enNotKn = []
for (const key of Object.keys(enFlat)) {
  if (!(key in knFlat)) {
    enNotKn.push(key)
    errors++
  }
}

// 4. Check keys present in kn but missing in en
const knNotEn = []
for (const key of Object.keys(knFlat)) {
  if (!(key in enFlat)) {
    knNotEn.push(key)
    errors++
  }
}

if (missingInEn.length > 0) {
  console.error('\n❌ Keys used in code but MISSING in en.json:')
  missingInEn.forEach((k) => console.error(`  - "${k}" (used in: ${keyLocations[k]?.join(', ')})`))
}

if (missingInKn.length > 0) {
  console.error('\n❌ Keys used in code but MISSING in kn.json:')
  missingInKn.forEach((k) => console.error(`  - "${k}" (used in: ${keyLocations[k]?.join(', ')})`))
}

if (enNotKn.length > 0) {
  console.error('\n❌ Keys in en.json but MISSING in kn.json:')
  enNotKn.forEach((k) => console.error(`  - "${k}"`))
}

if (knNotEn.length > 0) {
  console.error('\n❌ Keys in kn.json but MISSING in en.json:')
  knNotEn.forEach((k) => console.error(`  - "${k}"`))
}

if (errors === 0) {
  console.log('\n✅ All translation keys are valid and aligned between en.json, kn.json, and code!')
  process.exit(0)
} else {
  console.error(`\n❌ Found ${errors} i18n issue(s).`)
  process.exit(1)
}
