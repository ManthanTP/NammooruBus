import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { preview, build } from 'vite'
import { chromium } from 'playwright'
import AxeBuilder from '@axe-core/playwright'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const screenshotDir = path.join(rootDir, 'docs', 'themes')

if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true })
}

const THEMES = ['light', 'dark', 'blue']
const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1280, height: 800 },
]

const PAGES = [
  { key: 'home', path: '/explore' },
  { key: 'results', path: '/results?from=stop_cbt&to=stop_dharwad_old' },
  { key: 'journey', path: '/journey' },
  { key: 'live', path: '/live' },
  { key: 'nearby', path: '/nearby' },
  { key: 'routes', path: '/routes' },
  { key: 'saved', path: '/saved' },
  { key: 'login', path: '/login' },
  { key: 'register', path: '/register' },
  { key: 'profile', path: '/profile' },
  { key: 'driver', path: '/driver' },
  { key: 'admin', path: '/admin/login' },
]

async function run() {
  const distDir = path.join(rootDir, 'dist')
  if (!fs.existsSync(distDir) || !fs.existsSync(path.join(distDir, 'index.html'))) {
    console.log('📦 Building app for testing...')
    await build({ root: rootDir })
  }

  console.log('🚀 Starting Vite preview server on port 5192...')
  const server = await preview({
    root: rootDir,
    preview: { port: 5192 },
  })
  const port = server.config.preview.port
  const baseUrl = `http://localhost:${port}`

  console.log(`🌐 Preview running at ${baseUrl}`)
  console.log('🖥️  Launching Chromium...')

  let browser
  try {
    browser = await chromium.launch({ headless: true })
  } catch (e1) {
    try {
      browser = await chromium.launch({ channel: 'msedge', headless: true })
    } catch (e2) {
      browser = await chromium.launch({ channel: 'chrome', headless: true })
    }
  }

  let totalViolations = 0
  const violationReports = []

  try {
    for (const theme of THEMES) {
      console.log(`\n🎨 Testing Theme: [${theme.toUpperCase()}]`)

      for (const vp of VIEWPORTS) {
        console.log(`  📱 Viewport: ${vp.name} (${vp.width}x${vp.height})`)

        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          deviceScaleFactor: 2,
        })

        const page = await context.newPage()

        for (const targetPage of PAGES) {
          const targetUrl = `${baseUrl}${targetPage.path}`

          try {
            await page.addInitScript((th) => {
              window.localStorage.setItem('nb-theme', th)
              window.sessionStorage.setItem('nb_mock_driver', 'true')
              window.sessionStorage.setItem('nb_mock_admin', 'true')
              document.documentElement.setAttribute('data-theme', th)
            }, theme)

            await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 15000 })
            await page.evaluate((th) => {
              document.documentElement.setAttribute('data-theme', th)
            }, theme)

            // Allow animations and render to settle
            await page.waitForTimeout(300)

            // Save screenshot
            const shotPath = path.join(
              screenshotDir,
              `${theme}_${targetPage.key}_${vp.width}.png`
            )
            await page.screenshot({ path: shotPath, fullPage: false })

            // Axe color-contrast check
            const results = await new AxeBuilder({ page })
              .withRules(['color-contrast'])
              .exclude('.leaflet-tile-pane') // Exclude map bitmap image tiles
              .analyze()

            if (results.violations.length > 0) {
              totalViolations += results.violations.length
              violationReports.push({
                theme,
                viewport: vp.name,
                page: targetPage.key,
                url: targetPage.path,
                violations: results.violations.map((v) => ({
                  id: v.id,
                  impact: v.impact,
                  description: v.description,
                  nodes: v.nodes.slice(0, 3).map((n) => ({
                    html: n.html,
                    failureSummary: n.failureSummary,
                  })),
                })),
              })
              console.log(`    ❌ ${targetPage.key}: ${results.violations.length} contrast violation(s)`)
            } else {
              console.log(`    ✅ ${targetPage.key}: 0 contrast violations`)
            }
          } catch (err) {
            console.error(`    ⚠️ Error loading ${targetPage.key}:`, err.message)
          }
        }

        await context.close()
      }
    }
  } finally {
    await browser.close()
    await server.close()
  }

  console.log('\n======================================================')
  if (totalViolations === 0) {
    console.log('🎉 ALL THEME CONTRAST CHECKS PASSED WITH 0 VIOLATIONS!')
    console.log(`📸 Screenshots saved to: ${path.relative(rootDir, screenshotDir)}`)
    console.log('======================================================\n')
    process.exit(0)
  } else {
    console.error(`❌ FOUND ${totalViolations} COLOR CONTRAST VIOLATION(S)!`)
    console.error(JSON.stringify(violationReports, null, 2))
    console.log('======================================================\n')
    process.exit(1)
  }
}

run().catch((err) => {
  console.error('Fatal error in test_themes:', err)
  process.exit(1)
})
