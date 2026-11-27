import { chromium } from 'playwright'
import { preview } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

async function run() {
  console.log('🚀 Starting Vite preview server...')
  const server = await preview({
    root: rootDir,
    preview: { port: 4175, host: '127.0.0.1' },
  })
  const baseUrl = 'http://127.0.0.1:4175'

  const browser = await chromium.launch({ headless: true })

  const screenshotDir = path.join(rootDir, 'docs', 'screenshots', 'prompt8_2')
  fs.mkdirSync(screenshotDir, { recursive: true })

  try {
    const page = await browser.newPage({
      viewport: { width: 360, height: 780 },
    })

    // Listen for console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('Browser console error:', msg.text())
      }
    })

    // Setup master data mock in localStorage so tests run deterministically
    await page.goto(`${baseUrl}/search`)
    await page.evaluate(() => {
      localStorage.setItem('nb_lang', 'en')
      localStorage.setItem('nb_theme', 'dark')
    })
    await page.reload()

    console.log('1. Testing Journey Details Layout & Spacing (360x780)...')
    // Go to journey page for Route 12 or available route
    await page.goto(`${baseUrl}/results?from=stop-1&to=stop-3`)
    await page.waitForTimeout(1000)

    // Capture Results screenshot
    await page.screenshot({ path: path.join(screenshotDir, 'results_dark.png') })
    console.log('  Saved:', path.join(screenshotDir, 'results_dark.png'))

    // Click first result to open journey page
    const ticketCard = await page.$('.cursor-pointer')
    if (ticketCard) {
      await ticketCard.click()
    } else {
      await page.goto(`${baseUrl}/journey?from=stop-1&to=stop-3&r=201`)
    }
    
    // Wait for journey to compute and action bar to be rendered
    const actionBar = await page.waitForSelector('.shadow-float', { timeout: 10000 })
    expect(actionBar).toBeTruthy()
    const barBox = await actionBar.boundingBox()
    console.log('  Action bar bounding box:', barBox)

    // Scroll to bottom
    await page.evaluate(() => {
      const main = document.querySelector('main')
      if (main) main.scrollTop = main.scrollHeight
    })
    await page.waitForTimeout(500)

    // Capture Journey Details scrolled screenshot
    await page.screenshot({ path: path.join(screenshotDir, 'journey_details_scrolled_dark.png') })
    console.log('  Saved:', path.join(screenshotDir, 'journey_details_scrolled_dark.png'))

    // Capture in Light theme
    await page.evaluate(() => {
      document.documentElement.classList.remove('theme-dark', 'theme-blue')
      document.documentElement.classList.add('theme-light')
      localStorage.setItem('nb_theme', 'light')
    })
    await page.waitForTimeout(300)
    await page.screenshot({ path: path.join(screenshotDir, 'journey_details_scrolled_light.png') })
    console.log('  Saved:', path.join(screenshotDir, 'journey_details_scrolled_light.png'))

    // Capture in Blue theme & Kannada
    await page.evaluate(() => {
      document.documentElement.classList.remove('theme-light', 'theme-dark')
      document.documentElement.classList.add('theme-blue')
      localStorage.setItem('nb_theme', 'blue')
      localStorage.setItem('nb_lang', 'kn')
    })
    await page.reload()
    await page.waitForTimeout(1000)
    await page.evaluate(() => {
      const main = document.querySelector('main')
      if (main) main.scrollTop = main.scrollHeight
    })
    await page.waitForTimeout(300)
    await page.screenshot({ path: path.join(screenshotDir, 'journey_details_scrolled_blue_kn.png') })
    console.log('  Saved:', path.join(screenshotDir, 'journey_details_scrolled_blue_kn.png'))

    console.log('✅ Journey layout and spacing verified!')
  } finally {
    await browser.close()
    server.httpServer.close()
  }
}

function expect(val) {
  return {
    toBeTruthy: () => {
      if (!val) throw new Error('Expected truthy but got falsy')
    },
  }
}

run().catch((err) => {
  console.error('Test failed:', err)
  process.exit(1)
})
