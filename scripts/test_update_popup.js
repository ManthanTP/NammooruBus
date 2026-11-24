import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import { preview, build } from 'vite'
import { chromium } from 'playwright'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const outDir = path.resolve(rootDir, 'docs', 'screenshots', 'update')

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true })
}

async function run() {
  console.log('📦 Building app for update popup test...')
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
    function nativeMockInit(config) {
      const versionCode = config?.versionCode || 6
      const installedBuild = config?.installedBuild || '5'
      sessionStorage.setItem('nb_splash_shown', 'true')
      localStorage.setItem('nb-onboarded', 'true')
      localStorage.setItem('nb-guest', 'true')
      window.androidBridge = {}
      window.Capacitor = {
        isNativePlatform: () => true,
        getPlatform: () => 'android',
        isPluginAvailable: () => true,
        nativePromise: async (plugin, method, args) => {
          if (plugin === 'App') {
            if (method === 'getInfo') {
              return { version: '1.0.4', build: String(installedBuild), id: 'com.nammoorubus.app', name: 'Nammooru Bus' }
            }
            if (method === 'getState') return { isActive: true }
          }
          if (plugin === 'CapacitorHttp') {
            if (method === 'get') {
              return {
                status: 200,
                data: {
                  latest: {
                    versionName: '1.0.5',
                    versionCode: Number(versionCode),
                    apkUrl: '/downloads/nammooru-bus.apk',
                    apkSize: '7.8 MB',
                  },
                  minSupportedVersionCode: 1,
                  releaseNotes: {
                    en: ['Phase 8: One clean, stable release', 'Instant OSM standard map tiles'],
                    kn: ['ಹಂತ 8: ಸ್ಥಿರ ಆವೃತ್ತಿ', 'ವೇಗದ ನಕ್ಷೆ'],
                  },
                },
              }
            }
          }
          if (plugin === 'Preferences') {
            if (method === 'get') return { value: null }
            return {}
          }
          if (plugin === 'StatusBar') return {}
          if (plugin === 'Haptics') return {}
          if (plugin === 'SplashScreen') return {}
          if (plugin === 'Network') return { connected: true, connectionType: 'wifi' }
          return {}
        },
        nativeCallback: (_plugin, _method, _args, _cb) => 'cb-id',
        PluginHeaders: [
          {
            name: 'App',
            methods: [
              { name: 'getInfo', rtype: 'promise' },
              { name: 'getState', rtype: 'promise' },
            ],
          },
          {
            name: 'CapacitorHttp',
            methods: [
              { name: 'get', rtype: 'promise' },
              { name: 'post', rtype: 'promise' },
            ],
          },
          {
            name: 'StatusBar',
            methods: [
              { name: 'setStyle', rtype: 'promise' },
              { name: 'setOverlaysWebView', rtype: 'promise' },
              { name: 'setBackgroundColor', rtype: 'promise' },
            ],
          },
          {
            name: 'SplashScreen',
            methods: [{ name: 'hide', rtype: 'promise' }],
          },
          {
            name: 'Haptics',
            methods: [{ name: 'impact', rtype: 'promise' }],
          },
          {
            name: 'Preferences',
            methods: [{ name: 'get', rtype: 'promise' }],
          },
        ],
      }
    }
    console.log('\n--- Scenario 1: Native Mock - Higher Remote versionCode (Popup fires) ---')
    {
      const context = await browser.newContext({
        viewport: { width: 360, height: 780 },
      })

      // Intercept /version.json to return version code 6
      await context.route('**/version.json*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            latest: {
              versionName: '1.0.5',
              versionCode: 6,
              apkUrl: '/downloads/nammooru-bus.apk',
              apkSize: '7.8 MB',
            },
            minSupportedVersionCode: 1,
            releaseNotes: {
              en: ['Phase 8: One clean, stable release', 'Instant OSM standard map tiles'],
              kn: ['ಹಂತ 8: ಸ್ಥಿರ ಆವೃತ್ತಿ', 'ವೇಗದ ನಕ್ಷೆ'],
            },
          }),
        })
      })

      await context.addInitScript(nativeMockInit, { versionCode: 6, installedBuild: '5' })

      const page = await context.newPage()
      await page.goto(`${baseUrl}/home`, { waitUntil: 'networkidle' })

      // Wait 2.5s for 1.5s post-render update checker
      await page.waitForTimeout(2500)

      const updateModal = await page.$('text=Update available')
      assert(!!updateModal, 'Update modal appeared for higher versionCode on native-mock')

      const updateNowBtn = await page.$('button:has-text("Update now"), a:has-text("Update now")')
      assert(!!updateNowBtn, '"Update now" button is visible in modal')

      const changelogItem = await page.$('text=Phase 8: One clean, stable release')
      assert(!!changelogItem, 'Release notes are displayed in modal')

      const screenshotPath = path.resolve(outDir, 'native_update_popup_fired.png')
      await page.screenshot({ path: screenshotPath })
      console.log(`  📸 Screenshot saved: ${screenshotPath}`)

      await context.close()
    }

    // -------------------------------------------------------------
    // Scenario 2: Native Mock when already UP TO DATE (build 5 == build 5)
    // -------------------------------------------------------------
    console.log('\n--- Scenario 2: Native Mock - Same versionCode (No popup) ---')
    {
      const context = await browser.newContext({
        viewport: { width: 360, height: 780 },
      })

      await context.route('**/version.json*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            latest: {
              versionName: '1.0.4',
              versionCode: 5,
              apkUrl: '/downloads/nammooru-bus.apk',
            },
            minSupportedVersionCode: 1,
          }),
        })
      })

      await context.addInitScript(nativeMockInit, { versionCode: 5, installedBuild: '5' })

      const page = await context.newPage()
      await page.goto(`${baseUrl}/home`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(2500)

      const updateModal = await page.$('text=Update available')
      assert(!updateModal, 'Update modal correctly DOES NOT appear when already up-to-date')

      await context.close()
    }

    // -------------------------------------------------------------
    // Scenario 3: Web Mode (NEVER checks or shows update modal)
    // -------------------------------------------------------------
    console.log('\n--- Scenario 3: Web Mode - Isolated from updates ---')
    {
      const context = await browser.newContext({
        viewport: { width: 360, height: 780 },
      })

      await context.addInitScript(() => {
        localStorage.setItem('nb-onboarded', 'true')
        localStorage.setItem('nb-guest', 'true')
      })

      const page = await context.newPage()
      await page.goto(`${baseUrl}/home`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(2500)

      const updateModal = await page.$('text=Update available')
      assert(!updateModal, 'Update modal never appears on web')

      // Visit profile
      await page.goto(`${baseUrl}/profile`, { waitUntil: 'networkidle' })

      const webBadge = await page.$('text=Website, always up to date')
      assert(!!webBadge, 'Profile shows "Website, always up to date" badge on web')

      const checkUpdateBtn = await page.$('button:has-text("Check for updates")')
      assert(!checkUpdateBtn, '"Check for updates" button is hidden on web')

      const screenshotWeb = path.resolve(outDir, 'web_profile_no_update_btn.png')
      await page.screenshot({ path: screenshotWeb })
      console.log(`  📸 Screenshot saved: ${screenshotWeb}`)

      await context.close()
    }

    // -------------------------------------------------------------
    // Scenario 4: Native Diagnostics Panel on Profile Page
    // -------------------------------------------------------------
    console.log('\n--- Scenario 4: Native Mock - Profile Diagnostics Panel ---')
    {
      const context = await browser.newContext({
        viewport: { width: 360, height: 780 },
      })

      await context.addInitScript(nativeMockInit, { versionCode: 6, installedBuild: '5' })

      const page = await context.newPage()
      await page.goto(`${baseUrl}/profile`, { waitUntil: 'networkidle' })

      const checkBtn = await page.$('button:has-text("Check for updates")')
      assert(!!checkBtn, '"Check for updates" button is visible on native')

      // Open diagnostics toggle
      const diagToggle = await page.$('text=Update diagnostics')
      assert(!!diagToggle, '"Update diagnostics" toggle is present')
      if (diagToggle) {
        await diagToggle.click()
        await page.waitForTimeout(300)

        const installedRow = await page.$('text=Installed:')
        assert(!!installedRow, 'Diagnostics shows Installed row')

        const decisionRow = await page.$('text=Decision:')
        assert(!!decisionRow, 'Diagnostics shows Decision row')

        const forceBtn = await page.$('button:has-text("Force re-check")')
        assert(!!forceBtn, '"Force re-check" button is present in diagnostics')
      }

      const screenshotDiag = path.resolve(outDir, 'native_profile_diagnostics.png')
      await page.screenshot({ path: screenshotDiag })
      console.log(`  📸 Screenshot saved: ${screenshotDiag}`)

      await context.close()
    }

  } finally {
    if (browser) await browser.close()
    await server.close()
  }

  console.log(`\n======================================================`)
  console.log(`🏁 Update Popup Tests Completed: ${totalTests - failed}/${totalTests} Passed`)
  if (failed > 0) {
    console.error(`💥 ${failed} tests failed!`)
    process.exit(1)
  } else {
    console.log(`✨ All update check and diagnostic tests passed perfectly!`)
  }
}

run().catch((err) => {
  console.error('Fatal test error:', err)
  process.exit(1)
})
