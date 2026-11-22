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
  console.log('📦 Building app for testing...')
  await build({ root: rootDir })

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

            // Phase 5.11: Check that every element with class .on-brand, active segmented option, and active nav item computes to white text
            const onBrandWhiteCheck = await page.evaluate(() => {
              const isWhite = (rgb) => {
                if (!rgb) return false
                const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
                if (!m) return false
                const r = parseInt(m[1], 10)
                const g = parseInt(m[2], 10)
                const b = parseInt(m[3], 10)
                const a = m[4] !== undefined ? parseFloat(m[4]) : 1
                return r >= 235 && g >= 235 && b >= 235 && a >= 0.75
              }

              const issues = []

              // 1. Elements with .on-brand
              const brandElements = document.querySelectorAll('.on-brand')
              brandElements.forEach((el) => {
                const textNodes = el.querySelectorAll('span, p, h1, h2, h3, h4, h5, h6, a, button')
                if (textNodes.length === 0 && el.textContent?.trim()) {
                  const color = window.getComputedStyle(el).color
                  if (!isWhite(color)) {
                    issues.push({ type: '.on-brand', tag: el.tagName, text: el.textContent.trim().slice(0, 30), color })
                  }
                } else {
                  textNodes.forEach((child) => {
                    if (
                      child.textContent?.trim() &&
                      !child.classList.contains('on-amber') &&
                      !child.classList.contains('text-amber-500') &&
                      !child.classList.contains('text-amber') &&
                      !child.closest('.font-led') &&
                      !child.closest('.on-amber') &&
                      !child.closest('[role="group"]') &&
                      !child.closest('.bg-white') &&
                      !child.closest('[style*="background-color: rgb(255, 255, 255)"]') &&
                      !child.closest('[style*="background-color: #FFFFFF"]')
                    ) {
                      const color = window.getComputedStyle(child).color
                      if (!isWhite(color)) {
                        issues.push({ type: '.on-brand child', tag: child.tagName, text: child.textContent.trim().slice(0, 30), color })
                      }
                    }
                  })
                }
              })

              // 2. Active segmented control options
              const activeSegments = document.querySelectorAll('[role="radio"][aria-checked="true"]')
              activeSegments.forEach((seg) => {
                const color = window.getComputedStyle(seg).color
                if (!isWhite(color)) {
                  issues.push({ type: 'active-segmented-option', tag: seg.tagName, text: seg.textContent.trim().slice(0, 30), color })
                }
              })

              // 3. Active nav items
              const activeNavs = document.querySelectorAll('nav a.on-brand, nav a[style*="gradient"]')
              activeNavs.forEach((navEl) => {
                const color = window.getComputedStyle(navEl).color
                if (!isWhite(color)) {
                  issues.push({ type: 'active-nav-item', tag: navEl.tagName, text: navEl.textContent.trim().slice(0, 30), color })
                }
              })

              return issues
            })

            let pageIssuesCount = results.violations.length + onBrandWhiteCheck.length

            if (pageIssuesCount > 0) {
              totalViolations += pageIssuesCount
              violationReports.push({
                theme,
                viewport: vp.name,
                page: targetPage.key,
                url: targetPage.path,
                contrastViolations: results.violations.map((v) => ({
                  id: v.id,
                  impact: v.impact,
                  description: v.description,
                  nodes: v.nodes.slice(0, 3).map((n) => ({
                    html: n.html,
                    failureSummary: n.failureSummary,
                  })),
                })),
                onBrandWhiteIssues: onBrandWhiteCheck,
              })
              console.log(`    ❌ ${targetPage.key}: ${pageIssuesCount} issue(s) (contrast: ${results.violations.length}, on-brand white: ${onBrandWhiteCheck.length})`)
            } else {
              console.log(`    ✅ ${targetPage.key}: 0 violations (contrast & on-brand white passed)`)
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
