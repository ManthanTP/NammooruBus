import path from 'path'
import { fileURLToPath } from 'url'
import { preview } from 'vite'
import { chromium } from 'playwright'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

const guestRoutes = [
  '/',
  '/welcome',
  '/get-started',
  '/terms',
  '/privacy',
  '/whats-new',
  '/explore',
  '/search',
  '/results',
  '/journey',
  '/live',
  '/nearby',
  '/routes',
  '/saved',
  '/complaints',
  '/alerts',
  '/profile',
  '/help',
  '/login',
  '/register',
  '/forgot-password',
]

const passengerRoutes = [
  '/explore',
  '/search',
  '/results',
  '/journey',
  '/live',
  '/nearby',
  '/routes',
  '/saved',
  '/complaints',
  '/alerts',
  '/profile',
  '/help',
]

const driverRoutes = [
  '/driver',
  '/driver/trip',
  '/driver/live',
  '/driver/reports',
  '/driver/history',
  '/driver/bus',
  '/driver/profile',
  '/driver/help',
]

const adminRoutes = [
  '/12345678/admin/login',
  '/12345678/admin/dashboard',
  '/12345678/admin/stops',
  '/12345678/admin/routes',
  '/12345678/admin/routes/new',
  '/12345678/admin/schedules',
  '/12345678/admin/fares',
  '/12345678/admin/fleet',
  '/12345678/admin/users',
  '/12345678/admin/live',
  '/12345678/admin/complaints',
  '/12345678/admin/alerts',
  '/12345678/admin/reports',
  '/12345678/admin/import',
  '/12345678/admin/audit',
  '/12345678/admin/simulator',
]

async function runSmokeTests() {
  console.log('🚀 Starting Vite preview server for smoke tests...')
  const server = await preview({
    root: rootDir,
    preview: { port: 5188 },
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
  let failures = []

  const testRoute = async (page, route, modeName) => {
    totalTests++
    const pageErrors = []
    const consoleErrors = []

    const onPageError = (err) => pageErrors.push(err.message || String(err))
    const onConsole = (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text()
        // Ignore harmless network failures to external map tiles/Supabase offline
        if (
          !text.includes('Failed to load resource') &&
          !text.includes('net::ERR_') &&
          !text.includes('tile.openstreetmap') &&
          !text.includes('supabase.co')
        ) {
          consoleErrors.push(text)
        }
      }
    }

    page.on('pageerror', onPageError)
    page.on('console', onConsole)

    try {
      await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 10000 })
      await page.waitForTimeout(300)

      // Check for ErrorBoundary "Something went wrong" screen
      const crashHeading = await page.locator('text="Something went wrong"').count()
      if (crashHeading > 0) {
        throw new Error('Screen crashed: ErrorBoundary "Something went wrong" rendered')
      }

      if (pageErrors.length > 0) {
        throw new Error(`Page errors: ${pageErrors.join('; ')}`)
      }

      // If critical JS errors in console
      const criticalErrors = consoleErrors.filter((e) =>
        /ReferenceError|TypeError|is not defined|Cannot read properties|uncaught|React has detected/i.test(e)
      )
      if (criticalErrors.length > 0) {
        throw new Error(`Console errors: ${criticalErrors.join('; ')}`)
      }

      console.log(`  ✓ [${modeName}] ${route}`)
    } catch (err) {
      console.error(`  ❌ [${modeName}] ${route}: ${err.message}`)
      failures.push({ mode: modeName, route, error: err.message })
    } finally {
      page.off('pageerror', onPageError)
      page.off('console', onConsole)
    }
  }

  try {
    // MODE 1: Web as Guest
    console.log('\n--- MODE 1: Web as Guest ---')
    const guestContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const guestPage = await guestContext.newPage()
    await guestPage.addInitScript(() => {
      sessionStorage.setItem('nb_splash_shown', 'true')
    })
    for (const route of guestRoutes) {
      await testRoute(guestPage, route, 'Guest')
    }
    await guestContext.close()

    // MODE 2: Web Signed In as Passenger
    console.log('\n--- MODE 2: Web Signed In as Passenger ---')
    const passengerContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const passengerPage = await passengerContext.newPage()
    await passengerPage.addInitScript(() => {
      sessionStorage.setItem('nb_splash_shown', 'true')
      window.__mockAuth = {
        user: { id: 'passenger-uuid-1234', email: 'passenger@nammoorubus.in' },
        profile: {
          id: 'passenger-uuid-1234',
          role: 'passenger',
          lang: 'en',
          full_name: 'Test Passenger',
          phone: '9876543210',
        },
      }
    })
    for (const route of passengerRoutes) {
      await testRoute(passengerPage, route, 'Passenger')
    }
    await passengerContext.close()

    // MODE 3: Web Signed In as Driver & Admin
    console.log('\n--- MODE 3: Web Signed In as Driver & Admin ---')
    const driverContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const driverPage = await driverContext.newPage()
    await driverPage.addInitScript(() => {
      sessionStorage.setItem('nb_splash_shown', 'true')
      window.__mockAuth = {
        user: { id: 'driver-uuid-5678', email: 'driver@nammoorubus.in' },
        profile: {
          id: 'driver-uuid-5678',
          role: 'driver',
          lang: 'en',
          full_name: 'Test Driver',
          phone: '9876543211',
        },
      }
    })
    for (const route of driverRoutes) {
      await testRoute(driverPage, route, 'Driver')
    }
    await driverContext.close()

    // Admin routes as admin
    const adminContext = await browser.newContext({ viewport: { width: 1280, height: 800 } })
    const adminPage = await adminContext.newPage()
    await adminPage.addInitScript(() => {
      sessionStorage.setItem('nb_splash_shown', 'true')
      sessionStorage.setItem('nb_mock_admin', 'true')
      window.__mockAuth = {
        user: { id: 'admin-uuid-9999', email: 'admin@nammoorubus.in' },
        profile: {
          id: 'admin-uuid-9999',
          role: 'admin',
          lang: 'en',
          full_name: 'Test Admin',
        },
      }
    })
    for (const route of adminRoutes) {
      await testRoute(adminPage, route, 'Admin')
    }
    await adminContext.close()

    // MODE 4: Native-Mock (window.Capacitor isNative() === true, stubs for all plugins)
    console.log('\n--- MODE 4: Native-Mock Mode ---')
    const nativeContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const nativePage = await nativeContext.newPage()
    await nativePage.addInitScript(() => {
      sessionStorage.setItem('nb_splash_shown', 'true')
      window.androidBridge = {}
      window.Capacitor = {
        isNativePlatform: () => true,
        getPlatform: () => 'android',
        isPluginAvailable: () => true,
        nativePromise: async (plugin, method, args) => {
          if (plugin === 'App') {
            if (method === 'getInfo') {
              return { version: '1.0.4', build: '5', id: 'com.nammoorubus.app', name: 'Nammooru Bus' }
            }
            if (method === 'getState') return { isActive: true }
          }
          if (plugin === 'Preferences') {
            if (method === 'get') return { value: null }
            return {}
          }
          if (plugin === 'StatusBar') return {}
          if (plugin === 'Haptics') return {}
          if (plugin === 'SplashScreen') return {}
          if (plugin === 'Network') return { connected: true, connectionType: 'wifi' }
          if (plugin === 'Geolocation') {
            if (method === 'getCurrentPosition') {
              return { coords: { latitude: 15.3647, longitude: 75.124, accuracy: 10 } }
            }
          }
          return {}
        },
        nativeCallback: (_plugin, _method, _args, _cb) => 'cb-id',
        PluginHeaders: [
          {
            name: 'App',
            methods: [
              { name: 'getInfo', rtype: 'promise' },
              { name: 'getState', rtype: 'promise' },
              { name: 'addListener', rtype: 'callback' },
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
            methods: [
              { name: 'hide', rtype: 'promise' },
              { name: 'show', rtype: 'promise' },
            ],
          },
          {
            name: 'Haptics',
            methods: [
              { name: 'impact', rtype: 'promise' },
              { name: 'notification', rtype: 'promise' },
              { name: 'vibrate', rtype: 'promise' },
            ],
          },
          {
            name: 'Preferences',
            methods: [
              { name: 'get', rtype: 'promise' },
              { name: 'set', rtype: 'promise' },
              { name: 'remove', rtype: 'promise' },
            ],
          },
          {
            name: 'Geolocation',
            methods: [
              { name: 'getCurrentPosition', rtype: 'promise' },
              { name: 'watchPosition', rtype: 'callback' },
              { name: 'clearWatch', rtype: 'promise' },
            ],
          },
          {
            name: 'Network',
            methods: [
              { name: 'getStatus', rtype: 'promise' },
              { name: 'addListener', rtype: 'callback' },
            ],
          },
        ],
      }
    })

    // Test routes in native-mock mode
    for (const route of guestRoutes) {
      await testRoute(nativePage, route, 'Native-Mock')
    }

    // Specific test for Profile About / Native update checks
    console.log('\n--- Testing Native-Mock Profile About & Diagnostics ---')
    await nativePage.goto(`${baseUrl}/profile`, { waitUntil: 'domcontentloaded' })
    await nativePage.waitForTimeout(500)
    const crashInProfile = await nativePage.locator('text="Something went wrong"').count()
    if (crashInProfile > 0) {
      failures.push({ mode: 'Native-Mock', route: '/profile', error: 'Crashed on Profile page' })
    } else {
      console.log('  ✓ [Native-Mock] Profile loaded cleanly without crash')
    }

    await nativeContext.close()
  } finally {
    await browser.close()
    await server.close()
  }

  console.log(`\n========================================`)
  console.log(`Smoke Tests Complete: ${totalTests - failures.length}/${totalTests} passed`)
  if (failures.length > 0) {
    console.error(`❌ ${failures.length} ROUTE(S) FAILED:`)
    for (const f of failures) {
      console.error(`  - [${f.mode}] ${f.route}: ${f.error}`)
    }
    process.exit(1)
  } else {
    console.log(`✅ ALL ${totalTests} ROUTE CHECKS PASSED WITH ZERO CRASHES!`)
    process.exit(0)
  }
}

runSmokeTests().catch((err) => {
  console.error('Fatal smoke test runner error:', err)
  process.exit(1)
})
