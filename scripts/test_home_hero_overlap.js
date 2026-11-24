import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import { preview, build } from 'vite'
import { chromium } from 'playwright'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const outDir = path.resolve(rootDir, 'docs', 'screenshots', 'home')

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true })
}

async function run() {
  console.log('📦 Building app...')
  await build({ root: rootDir })

  console.log('🚀 Starting Vite preview server...')
  const server = await preview({
    root: rootDir,
    preview: { port: 5196 },
  })
  const port = server.config.preview.port
  const baseUrl = `http://localhost:${port}`

  let browser
  try {
    browser = await chromium.launch({ headless: true })
  } catch (_) {
    browser = await chromium.launch({ channel: 'chrome', headless: true })
  }

  let totalTests = 0
  let failed = 0

  function assert(condition, message) {
    totalTests++
    if (condition) {
      console.log(`  ✓ ${message}`)
    } else {
      console.error(`  ❌ FAILED: ${message}`)
      failed++
    }
  }

  try {
    // 1. Strict overlap & visibility test at 360x780 (English & Kannada)
    for (const lang of ['en', 'kn']) {
      console.log(`\n--- Testing 360x780 Hero & Card Stacking (${lang.toUpperCase()}) ---`)
      const context = await browser.newContext({ viewport: { width: 360, height: 780 } })
      const page = await context.newPage()
      await page.addInitScript((l) => {
        sessionStorage.setItem('nb_splash_shown', 'true')
        localStorage.setItem('nb_lang', l)
        localStorage.setItem('i18nextLng', l)
      }, lang)

      await page.goto(`${baseUrl}/explore`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(400)

      // Locate key elements via data-testid and semantic tags
      const heroTitle = page.locator('h1').filter({ hasText: /Nammooru Bus|ನಮ್ಮೂರು ಬಸ್/ }).first()
      const whereToHeading = page.locator('[data-testid="where-to-heading"]')
      const fromCard = page.locator('[data-testid="from-stop-card"]')
      const findBusesBtn = page.locator('[data-testid="find-buses-btn"]')

      assert(await heroTitle.isVisible(), `[${lang}] Hero title is visible`)
      assert(await whereToHeading.isVisible(), `[${lang}] "Where to?" heading is visible`)
      assert(await fromCard.isVisible(), `[${lang}] FROM card is visible`)
      assert(await findBusesBtn.isVisible(), `[${lang}] "Find buses" button is visible`)

      // Bounding box checks
      const heroBox = await heroTitle.boundingBox()
      const whereToBox = await whereToHeading.boundingBox()
      const fromBox = await fromCard.boundingBox()
      const findBusesBox = await findBusesBtn.boundingBox()

      assert(heroBox !== null, `[${lang}] Hero title bounding box exists`)
      assert(whereToBox !== null, `[${lang}] Where to heading bounding box exists`)
      assert(fromBox !== null, `[${lang}] FROM card bounding box exists`)
      assert(findBusesBox !== null, `[${lang}] Find buses button bounding box exists`)

      if (heroBox && whereToBox && fromBox && findBusesBox) {
        // 1. All elements must fit within the initial 780px viewport without scrolling
        assert(
          findBusesBox.y + findBusesBox.height <= 780,
          `[${lang}] Find buses button bottom (${Math.round(findBusesBox.y + findBusesBox.height)}px) fits in 780px viewport without scrolling`
        )

        // 2. Strict non-overlapping vertical order
        assert(
          heroBox.y + heroBox.height <= whereToBox.y,
          `[${lang}] Hero title does not overlap "Where to?" heading (hero bottom: ${Math.round(heroBox.y + heroBox.height)}px <= heading top: ${Math.round(whereToBox.y)}px)`
        )

        assert(
          whereToBox.y + whereToBox.height <= fromBox.y,
          `[${lang}] "Where to?" heading does not overlap FROM card (heading bottom: ${Math.round(whereToBox.y + whereToBox.height)}px <= from top: ${Math.round(fromBox.y)}px)`
        )

        assert(
          fromBox.y + fromBox.height <= findBusesBox.y,
          `[${lang}] FROM card does not overlap Find buses button (from bottom: ${Math.round(fromBox.y + fromBox.height)}px <= button top: ${Math.round(findBusesBox.y)}px)`
        )
      }

      await context.close()
    }

    // 2. Test widths: 320, 360, 430 in web and native-mock
    const testWidths = [320, 360, 430]
    for (const w of testWidths) {
      console.log(`\n--- Testing Width ${w}px (Web & Native-Mock) ---`)
      const ctx = await browser.newContext({ viewport: { width: w, height: 780 } })
      const p = await ctx.newPage()
      await p.addInitScript(() => {
        sessionStorage.setItem('nb_splash_shown', 'true')
        window.androidBridge = {}
        window.Capacitor = {
          isNativePlatform: () => true,
          getPlatform: () => 'android',
          isPluginAvailable: () => true,
          nativePromise: async () => ({}),
          nativeCallback: () => 'cb',
          PluginHeaders: [{ name: 'StatusBar', methods: [{ name: 'setStyle', rtype: 'promise' }] }],
        }
        document.documentElement.style.setProperty('--safe-top', '36px')
      })
      await p.goto(`${baseUrl}/explore`, { waitUntil: 'networkidle' })
      const heroTitle = p.locator('h1:has-text("Nammooru Bus"), h1:has-text("ನಮ್ಮೂರು ಬಸ್")').first()
      assert(await heroTitle.isVisible(), `Width ${w}px hero title is visible`)
      await ctx.close()
    }

    // 3. Capture screenshots for Light, Dark, Blue themes at 360x780
    console.log('\n--- Capturing Screenshots for 3 Themes (360x780) ---')
    const screenshotThemes = [
      { theme: 'light', lang: 'en', filename: 'home_light_en.png' },
      { theme: 'dark', lang: 'en', filename: 'home_dark_en.png' },
      { theme: 'blue', lang: 'en', filename: 'home_blue_en.png' },
      { theme: 'dark', lang: 'kn', filename: 'home_dark_kn.png' },
    ]

    for (const item of screenshotThemes) {
      const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, deviceScaleFactor: 2 })
      const p = await ctx.newPage()
      await p.addInitScript(({ theme, lang }) => {
        sessionStorage.setItem('nb_splash_shown', 'true')
        localStorage.setItem('nb-theme', theme)
        localStorage.setItem('nb_lang', lang)
        localStorage.setItem('i18nextLng', lang)
      }, item)

      await p.goto(`${baseUrl}/explore`, { waitUntil: 'networkidle' })
      await p.waitForTimeout(300)
      const filePath = path.join(outDir, item.filename)
      await p.screenshot({ path: filePath })
      console.log(`  ✓ Saved screenshot: ${item.filename} (${filePath})`)
      await ctx.close()
    }
  } finally {
    await browser.close()
    await server.close()
  }

  console.log(`\n========================================`)
  console.log(`Home Hero Stacking Verification: ${totalTests - failed}/${totalTests} passed`)
  if (failed > 0) {
    console.error(`❌ ${failed} check(s) failed!`)
    process.exit(1)
  } else {
    console.log(`✅ All Home hero stacking and non-overlap tests passed!`)
    process.exit(0)
  }
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
