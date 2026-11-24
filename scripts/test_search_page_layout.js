import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import { preview, build } from 'vite'
import { chromium } from 'playwright'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const outDir = path.resolve(rootDir, 'docs', 'screenshots', 'search')

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true })
}

async function run() {
  console.log('📦 Building app for Search layout verification...')
  await build({ root: rootDir })

  console.log('🚀 Starting Vite preview server...')
  const server = await preview({
    root: rootDir,
    preview: { port: 5197 },
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
    const viewports = [
      { width: 320, height: 568, name: '320x568' },
      { width: 360, height: 640, name: '360x640' },
      { width: 360, height: 780, name: '360x780' },
      { width: 390, height: 844, name: '390x844' },
    ]

    for (const vp of viewports) {
      console.log(`\n--- Testing Search Page at ${vp.name} ---`)
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } })
      const page = await context.newPage()
      await page.addInitScript(() => {
        sessionStorage.setItem('nb_splash_shown', 'true')
      })

      await page.goto(`${baseUrl}/search`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(300)

      const searchHeader = page.locator('[data-testid="search-header"]')
      const whereToTitle = page.locator('[data-testid="where-to-title"]')
      const findBusesBtn = page.locator('[data-testid="search-find-buses-btn"]')
      const searchInput = page.locator('input[placeholder*="starting"], input[placeholder*="ಪ್ರಾರಂಭದ"]')

      assert(await searchHeader.isVisible(), `[${vp.name}] Search header is visible`)
      assert(await whereToTitle.isVisible(), `[${vp.name}] "Where to?" heading is visible`)
      assert(await searchInput.isVisible(), `[${vp.name}] Search input is visible`)
      assert(await findBusesBtn.isVisible(), `[${vp.name}] Find buses button is visible`)

      // Verify Find Buses button is disabled initially
      assert(await findBusesBtn.isDisabled(), `[${vp.name}] Find buses button is disabled until both stops are chosen`)

      // Check bounding boxes fit viewport
      const headerBox = await searchHeader.boundingBox()
      const buttonBox = await findBusesBtn.boundingBox()

      if (headerBox && buttonBox) {
        assert(headerBox.y >= 50, `[${vp.name}] Header sits below app top bar (header top: ${headerBox.y}px >= 50px)`)
        assert(buttonBox.y + buttonBox.height <= vp.height, `[${vp.name}] Find buses button fits in viewport (bottom: ${Math.round(buttonBox.y + buttonBox.height)}px <= ${vp.height}px)`)
      }

      await context.close()
    }

    // Interactive Tap to Fill FROM then TO automatically
    console.log('\n--- Testing Auto-Fill FROM then TO on Stop Tap ---')
    const tapContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const tapPage = await tapContext.newPage()
    await tapPage.addInitScript(() => {
      sessionStorage.setItem('nb_splash_shown', 'true')
    })
    await tapPage.goto(`${baseUrl}/search`, { waitUntil: 'networkidle' })
    await tapPage.waitForTimeout(400)

    // Tap first stop item in the list
    const stopItems = tapPage.locator('[role="button"]:has-text("Unkal"), [role="button"]:has-text("Airport"), [role="button"]:has-text("CBT")')
    const firstStop = stopItems.first()
    await firstStop.click()
    await tapPage.waitForTimeout(200)

    // Now active field should be 'to'
    const searchInputAfterFirst = tapPage.locator('input[placeholder*="destination"], input[placeholder*="ಗಮ್ಯಸ್ಥಾನ"]')
    assert(await searchInputAfterFirst.count() > 0, 'After first stop tap, automatically switched to destination stop selection')

    // Tap second stop item
    const secondStop = stopItems.nth(1)
    await secondStop.click()
    await tapPage.waitForTimeout(200)

    // Now Find buses button should be ENABLED
    const enabledBtn = tapPage.locator('[data-testid="search-find-buses-btn"]')
    assert(!(await enabledBtn.isDisabled()), 'After both stops chosen, Find buses button is enabled')

    await tapPage.screenshot({ path: path.join(outDir, 'search_filled_both_stops.png') })
    console.log(`  ✓ Saved screenshot: search_filled_both_stops.png`)
    await tapContext.close()

    // Keyboard Open Simulation (reduced viewport height, e.g. 844 - 280 = 564)
    console.log('\n--- Testing Keyboard Open Simulation ---')
    const kbContext = await browser.newContext({ viewport: { width: 390, height: 500 } })
    const kbPage = await kbContext.newPage()
    await kbPage.addInitScript(() => {
      sessionStorage.setItem('nb_splash_shown', 'true')
    })
    await kbPage.goto(`${baseUrl}/search`, { waitUntil: 'networkidle' })
    await kbPage.waitForTimeout(300)

    const kbHeader = kbPage.locator('[data-testid="where-to-title"]')
    const kbInput = kbPage.locator('input').first()
    const kbBtn = kbPage.locator('[data-testid="search-find-buses-btn"]')

    assert(await kbHeader.isVisible(), 'With keyboard open, "Where to?" heading remains visible')
    assert(await kbInput.isVisible(), 'With keyboard open, search input remains visible')
    assert(await kbBtn.isVisible(), 'With keyboard open, "Find buses" button remains visible above keyboard')

    await kbPage.screenshot({ path: path.join(outDir, 'search_keyboard_open_360x780.png') })
    console.log(`  ✓ Saved screenshot: search_keyboard_open_360x780.png`)
    await kbContext.close()

    // Capture screenshots for themes and languages
    console.log('\n--- Capturing Search Screenshots (3 Themes & Kannada) ---')
    const screenshotConfigs = [
      { theme: 'dark', lang: 'en', width: 320, height: 568, filename: 'search_320x568_dark_en.png' },
      { theme: 'light', lang: 'en', width: 360, height: 640, filename: 'search_360x640_light_en.png' },
      { theme: 'blue', lang: 'en', width: 360, height: 780, filename: 'search_360x780_blue_en.png' },
      { theme: 'dark', lang: 'kn', width: 390, height: 844, filename: 'search_390x844_dark_kn.png' },
    ]

    for (const sc of screenshotConfigs) {
      const ctx = await browser.newContext({
        viewport: { width: sc.width, height: sc.height },
        deviceScaleFactor: 2,
      })
      const p = await ctx.newPage()
      await p.addInitScript(({ theme, lang }) => {
        sessionStorage.setItem('nb_splash_shown', 'true')
        localStorage.setItem('nb-theme', theme)
        localStorage.setItem('nb_lang', lang)
        localStorage.setItem('i18nextLng', lang)
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
        document.documentElement.style.setProperty('--safe-bottom', '16px')
      }, sc)

      await p.goto(`${baseUrl}/search`, { waitUntil: 'networkidle' })
      await p.waitForTimeout(300)
      const filePath = path.join(outDir, sc.filename)
      await p.screenshot({ path: filePath })
      console.log(`  ✓ Saved: ${sc.filename} (${filePath})`)
      await ctx.close()
    }
  } finally {
    await browser.close()
    await server.close()
  }

  console.log(`\n========================================`)
  console.log(`Search Page Layout Verification: ${totalTests - failed}/${totalTests} passed`)
  if (failed > 0) {
    console.error(`❌ ${failed} check(s) failed!`)
    process.exit(1)
  } else {
    console.log(`✅ All Search Page layout tests passed!`)
    process.exit(0)
  }
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
