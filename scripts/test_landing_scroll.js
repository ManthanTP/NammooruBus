import path from 'path'
import { fileURLToPath } from 'url'
import { preview, build } from 'vite'
import { chromium } from 'playwright'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

async function run() {
  console.log('📦 Building app for landing scroll tests...')
  await build({ root: rootDir })

  console.log('🚀 Starting Vite preview server...')
  const server = await preview({
    root: rootDir,
    preview: { port: 5193 },
  })
  const port = server.config.preview.port
  const baseUrl = `http://localhost:${port}`

  console.log(`🌐 Preview running at ${baseUrl}`)
  console.log('🖥️  Launching Chromium for Landing Scroll & Scroll-Spy Tests...')

  let browser
  try {
    browser = await chromium.launch({ headless: true })
  } catch (e) {
    browser = await chromium.launch({ channel: 'chrome', headless: true })
  }

  let failures = 0

  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    })
    await context.addInitScript(() => {
      sessionStorage.setItem('nb_splash_shown', 'true')
      localStorage.setItem('nb_lang', 'en')
    })
    const page = await context.newPage()

    console.log('\n🧪 TEST 1: Initial Page Load & Top State')
    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)

    // Check that at the very top (hero), no nav item is active
    const activeAtTop = await page.$$eval(
      'nav[aria-label="Landing Page Navigation"] button[aria-current="true"]',
      (els) => els.length
    )
    if (activeAtTop === 0) {
      console.log('  ✅ At page top, no nav link is active')
    } else {
      console.error(`  ❌ Expected 0 active nav links at top, found ${activeAtTop}`)
      failures++
    }

    console.log('\n🧪 TEST 2: Nav Link Clicks & URL Hash & Active Pill')
    const sections = ['features', 'how-it-works', 'roles', 'app', 'faq']

    for (let idx = 0; idx < sections.length; idx++) {
      const sec = sections[idx]
      // Find button corresponding to section by position in navigation
      const button = page.locator(
        `nav[aria-label="Landing Page Navigation"] button:nth-child(${idx + 1})`
      )
      await button.click()
      await page.waitForTimeout(300)

      // Verify hash updated
      const currentUrl = page.url()
      if (currentUrl.includes(`#${sec}`)) {
        console.log(`  ✅ Clicking ${sec} updated URL hash to #${sec}`)
      } else {
        console.error(`  ❌ Expected URL hash #${sec}, got: ${currentUrl}`)
        failures++
      }

      // Verify button has aria-current="true"
      const isCurrent = await button.getAttribute('aria-current')
      if (isCurrent === 'true') {
        console.log(`  ✅ Nav button for ${sec} has aria-current="true"`)
      } else {
        console.error(`  ❌ Expected aria-current="true" on ${sec} button, got ${isCurrent}`)
        failures++
      }
    }

    console.log('\n🧪 TEST 3: Scroll to Bottom (FAQ Active)')
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(400)

    const faqButton = page.locator(
      'nav[aria-label="Landing Page Navigation"] button:last-child'
    )
    const faqIsCurrent = await faqButton.getAttribute('aria-current')
    if (faqIsCurrent === 'true') {
      console.log('  ✅ At page bottom, FAQ nav button is active')
    } else {
      console.error(`  ❌ Expected FAQ active at bottom, got ${faqIsCurrent}`)
      failures++
    }

    console.log('\n🧪 TEST 4: "Back to Top" Floating Button')
    const backToTopVisible = await page.locator('button[aria-label="Back to top"]').isVisible()
    if (backToTopVisible) {
      console.log('  ✅ "Back to top" button is visible when scrolled past 600px')
      await page.locator('button[aria-label="Back to top"]').click()
      await page.waitForFunction(() => window.scrollY <= 50, { timeout: 3000 })

      const scrollY = await page.evaluate(() => window.scrollY)
      if (scrollY <= 50) {
        console.log(`  ✅ Clicking "Back to top" scrolled smoothly to top (scrollY: ${scrollY})`)
      } else {
        console.error(`  ❌ Expected scrollY <= 50 after Back to Top, got ${scrollY}`)
        failures++
      }
    } else {
      console.error('  ❌ "Back to top" button was not visible at bottom of page')
      failures++
    }

    console.log('\n🧪 TEST 5: Emulated Prefers-Reduced-Motion')
    const reducedContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      reducedMotion: 'reduce',
    })
    await reducedContext.addInitScript(() => {
      sessionStorage.setItem('nb_splash_shown', 'true')
      localStorage.setItem('nb_lang', 'en')
    })
    const reducedPage = await reducedContext.newPage()
    await reducedPage.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' })
    await reducedPage.waitForTimeout(600)

    // Check that stats show real final numbers
    const statsText = await reducedPage.innerText('main')
    if (statsText.includes('18') && statsText.includes('72')) {
      console.log('  ✅ Under reduced motion, stat numbers show final values immediately')
    } else {
      console.error('  ❌ Stat numbers did not show final values under reduced motion')
      failures++
    }

    // Check that smooth scroll is disabled (computed scroll-behavior is auto)
    const scrollBehavior = await reducedPage.evaluate(() => {
      return window.getComputedStyle(document.documentElement).scrollBehavior
    })
    if (scrollBehavior === 'auto') {
      console.log('  ✅ Under reduced motion, scroll-behavior computes to "auto"')
    } else {
      console.error(`  ❌ Expected scroll-behavior "auto", got: "${scrollBehavior}"`)
      failures++
    }

    await context.close()
    await reducedContext.close()
  } finally {
    await browser.close()
    await server.close()
  }

  if (failures > 0) {
    console.error(`\n❌ LANDING SCROLL TESTS FAILED WITH ${failures} FAILURE(S)!`)
    process.exit(1)
  } else {
    console.log('\n🎉 ALL LANDING SCROLL & ACTIVE NAV TESTS PASSED!')
  }
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
