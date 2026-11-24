import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import { preview } from 'vite'
import { chromium } from 'playwright'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const outDir = path.resolve(rootDir, 'docs', 'screenshots', 'status_bar')

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true })
}

async function capture() {
  console.log('🚀 Starting Vite preview server...')
  const server = await preview({
    root: rootDir,
    preview: { port: 5195 },
  })
  const port = server.config.preview.port
  const baseUrl = `http://localhost:${port}`

  let browser
  try {
    browser = await chromium.launch({ headless: true })
  } catch (_) {
    browser = await chromium.launch({ channel: 'chrome', headless: true })
  }

  const configs = [
    { name: 'android15_cutout', width: 390, height: 844, safeTop: 48, safeBottom: 24 },
    { name: 'no_cutout', width: 360, height: 640, safeTop: 24, safeBottom: 16 },
  ]

  for (const cfg of configs) {
    console.log(`\n📸 Capturing screenshots for ${cfg.name}...`)
    const context = await browser.newContext({
      viewport: { width: cfg.width, height: cfg.height },
      deviceScaleFactor: 2,
    })
    const page = await context.newPage()
    await page.addInitScript(({ safeTop, safeBottom }) => {
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
      document.documentElement.style.setProperty('--safe-top', `${safeTop}px`)
      document.documentElement.style.setProperty('--safe-bottom', `${safeBottom}px`)
    }, { safeTop: cfg.safeTop, safeBottom: cfg.safeBottom })

    // 1. Login Screen
    await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' })
    await page.screenshot({ path: path.join(outDir, `${cfg.name}_login.png`) })
    console.log(`  ✓ Saved: ${cfg.name}_login.png`)

    // 2. Home - Light Theme
    await page.goto(`${baseUrl}/explore`, { waitUntil: 'networkidle' })
    await page.evaluate(() => {
      localStorage.setItem('nb-theme', 'light')
      document.documentElement.classList.remove('dark', 'blue')
    })
    await page.reload({ waitUntil: 'networkidle' })
    await page.screenshot({ path: path.join(outDir, `${cfg.name}_home_light.png`) })
    console.log(`  ✓ Saved: ${cfg.name}_home_light.png`)

    // 3. Home - Dark Theme
    await page.evaluate(() => {
      localStorage.setItem('nb-theme', 'dark')
      document.documentElement.classList.remove('blue')
      document.documentElement.classList.add('dark')
    })
    await page.reload({ waitUntil: 'networkidle' })
    await page.screenshot({ path: path.join(outDir, `${cfg.name}_home_dark.png`) })
    console.log(`  ✓ Saved: ${cfg.name}_home_dark.png`)

    // 4. Home - Blue Theme
    await page.evaluate(() => {
      localStorage.setItem('nb-theme', 'blue')
      document.documentElement.classList.remove('dark')
      document.documentElement.classList.add('blue')
    })
    await page.reload({ waitUntil: 'networkidle' })
    await page.screenshot({ path: path.join(outDir, `${cfg.name}_home_blue.png`) })
    console.log(`  ✓ Saved: ${cfg.name}_home_blue.png`)

    // 5. Expanded Map
    // Click the map expand button if present
    const expandBtn = page.locator('button[aria-label="Expand map"]').first()
    if (await expandBtn.count() > 0) {
      await expandBtn.click()
      await page.waitForTimeout(400)
    }
    await page.screenshot({ path: path.join(outDir, `${cfg.name}_expanded_map.png`) })
    console.log(`  ✓ Saved: ${cfg.name}_expanded_map.png`)

    await context.close()
  }

  await browser.close()
  await server.close()
  console.log('\n✅ All screenshots captured in docs/screenshots/status_bar/')
}

capture().catch((e) => {
  console.error(e)
  process.exit(1)
})
