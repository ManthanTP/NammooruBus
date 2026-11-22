import { chromium } from 'playwright'
import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'

const SCREEN_DIR = path.resolve(process.cwd(), 'docs/screens')
if (!fs.existsSync(SCREEN_DIR)) {
  fs.mkdirSync(SCREEN_DIR, { recursive: true })
}

const PAGES = [
  { name: '01-home', path: '/' },
  { name: '02-results', path: '/results?from=stop_cbt_1&to=stop_cbt_3' },
  { name: '03-journey', path: '/journey?from=stop_cbt_1&to=stop_cbt_3' },
  { name: '04-live', path: '/live' },
  { name: '05-routes', path: '/routes' },
  { name: '06-saved', path: '/saved' },
  { name: '07-login', path: '/login' },
  { name: '08-driver', path: '/driver' },
]

async function waitServerReady(url, timeoutMs = 30000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok) return true
    } catch (e) {
      // wait
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`Server at ${url} did not become ready within ${timeoutMs}ms`)
}

async function main() {
  console.log('Building app first...')
  // Server will be launched with preview
  const preview = spawn('npx', ['vite', 'preview', '--port', '4173'], {
    shell: true,
    stdio: 'inherit',
  })

  try {
    await waitServerReady('http://localhost:4173')
    console.log('Preview server ready. Launching browser...')

    const browser = await chromium.launch({
      channel: 'msedge',
      headless: true,
    })

    // 1. Mobile screenshots (390 x 844)
    console.log('\n--- Capturing Mobile Screenshots (390px) ---')
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
    })
    await mobileContext.addInitScript(() => {
      sessionStorage.setItem('nb_splash_shown', 'true')
      sessionStorage.setItem('nb_mock_driver', 'true')
      window.__mockAuth = {
        user: { id: 'test-driver-id', email: 'driver@nammooru.in' },
        profile: { id: 'test-driver-id', role: 'driver', full_name: 'Basavaraj Patil' },
      }
    })
    const mobilePage = await mobileContext.newPage()

    for (const item of PAGES) {
      const targetUrl = `http://localhost:4173${item.path}`
      console.log(`Mobile: ${item.name} -> ${targetUrl}`)
      await mobilePage.goto(targetUrl, { waitUntil: 'domcontentloaded' })
      await mobilePage.waitForTimeout(1500)
      const outPath = path.join(SCREEN_DIR, `${item.name}-mobile.png`)
      await mobilePage.screenshot({ path: outPath, fullPage: true })
      console.log(`Saved ${outPath}`)
    }
    await mobileContext.close()

    // 2. Desktop screenshots (1280 x 800)
    console.log('\n--- Capturing Desktop Screenshots (1280px) ---')
    const desktopContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 2,
    })
    await desktopContext.addInitScript(() => {
      sessionStorage.setItem('nb_splash_shown', 'true')
      sessionStorage.setItem('nb_mock_driver', 'true')
      window.__mockAuth = {
        user: { id: 'test-driver-id', email: 'driver@nammooru.in' },
        profile: { id: 'test-driver-id', role: 'driver', full_name: 'Basavaraj Patil' },
      }
    })
    const desktopPage = await desktopContext.newPage()

    for (const item of PAGES) {
      const targetUrl = `http://localhost:4173${item.path}`
      console.log(`Desktop: ${item.name} -> ${targetUrl}`)
      await desktopPage.goto(targetUrl, { waitUntil: 'domcontentloaded' })
      await desktopPage.waitForTimeout(1500)
      const outPath = path.join(SCREEN_DIR, `${item.name}-desktop.png`)
      await desktopPage.screenshot({ path: outPath, fullPage: true })
      console.log(`Saved ${outPath}`)
    }
    await desktopContext.close()

    await browser.close()
    console.log('\nAll screenshots captured successfully!')
  } finally {
    if (preview.pid) {
      try {
        process.kill(preview.pid)
      } catch (e) {
        // ignore
      }
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
