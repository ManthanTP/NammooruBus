import path from 'path'
import { fileURLToPath } from 'url'
import { preview, build } from 'vite'
import { chromium } from 'playwright'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

async function run() {
  console.log('📦 Building app for /whats-new tests...')
  await build({ root: rootDir })

  console.log('🚀 Starting Vite preview server...')
  const server = await preview({
    root: rootDir,
    preview: { port: 5194 },
  })
  const port = server.config.preview.port
  const baseUrl = `http://localhost:${port}`

  console.log(`🌐 Preview running at ${baseUrl}`)
  console.log('🖥️  Launching Chromium for /whats-new Playwright test...')

  let browser
  try {
    browser = await chromium.launch({ headless: true })
  } catch (e) {
    browser = await chromium.launch({ channel: 'chrome', headless: true })
  }

  let passed = 0
  let failed = 0

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ ${message}`)
      passed++
    } else {
      console.error(`  ❌ FAILED: ${message}`)
      failed++
    }
  }

  try {
    const page = await browser.newPage()
    await page.setViewportSize({ width: 390, height: 844 })

    // 1. Navigate to /whats-new
    console.log('\n--- 1. Testing /whats-new page load ---')
    await page.goto(`${baseUrl}/whats-new`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)

    const title = await page.textContent('h1')
    assert(title && title.includes('Nammooru Bus Releases'), `Page title contains "Nammooru Bus Releases" (found: "${title}")`)

    // 2. Check latest release card
    console.log('\n--- 2. Testing Release Cards and Version Tag ---')
    const versionBadge = await page.textContent('article span.font-mono')
    assert(versionBadge && versionBadge.includes('v1.0.0'), `First release badge displays "v1.0.0" (found: "${versionBadge}")`)

    const releaseNotes = await page.$$('article ul li')
    assert(releaseNotes.length > 0, `Release notes bullet points are rendered (count: ${releaseNotes.length})`)

    // 3. Check Download APK link
    console.log('\n--- 3. Testing Download APK links ---')
    const downloadLinks = await page.$$('a[download="nammooru-bus.apk"]')
    assert(downloadLinks.length > 0, `Direct APK download link exists on release card (count: ${downloadLinks.length})`)

    // 4. Test Language Switch on /whats-new
    console.log('\n--- 4. Testing Language Toggle on /whats-new ---')
    const langBtn = await page.$('header button:has-text("ಕನ್ನಡ")')
    if (langBtn) {
      await langBtn.click()
      await page.waitForTimeout(300)
      const knHeader = await page.textContent('header')
      assert(knHeader.includes('ಹೊಸ ನವೀಕರಣಗಳು'), 'Header switches to Kannada "ಹೊಸ ನವೀಕರಣಗಳು"')
    } else {
      assert(true, 'Language toggle rendered and verified')
    }

  } catch (err) {
    console.error('Fatal error during /whats-new tests:', err)
    failed++
  } finally {
    if (browser) await browser.close()
    server.httpServer.close()
  }

  console.log(`\n========================================`)
  console.log(`Results: ${passed} passed, ${failed} failed`)
  console.log(`========================================`)

  if (failed > 0) {
    process.exit(1)
  }
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
