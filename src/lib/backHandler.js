import { App } from '@capacitor/app'
import { isNative } from './platform'
import { toast } from '@/components/ui/Toast'
import { appStorage } from './storage'

// Overlay layers stack (modals, dropdowns, full-screen map overlay, etc.)
const overlayLayers = []
let lastBackPressTime = 0

/**
 * Register an overlay layer that can be dismissed via the back button.
 * Returns an unregister cleanup function.
 */
export function registerOverlayLayer(dismissFn) {
  overlayLayers.push(dismissFn)
  return () => {
    const idx = overlayLayers.indexOf(dismissFn)
    if (idx !== -1) overlayLayers.splice(idx, 1)
  }
}

/**
 * Main Back Action Dispatcher — used by hardware back button and in-app back buttons.
 */
export function handleBackAction({ navigate, location, hasActiveTrip = false, isWelcome = false, welcomeSlide = 0, onWelcomePrevSlide }) {
  // 1. Close topmost layer (modal, drawer, full-screen map overlay, dropdown)
  if (overlayLayers.length > 0) {
    const topCloser = overlayLayers.pop()
    try {
      topCloser()
    } catch (e) {
      console.warn('Error closing overlay layer on back:', e)
    }
    return 'closed_overlay'
  }

  // 2. If keyboard is open / focused input
  if (typeof document !== 'undefined') {
    const activeEl = document.activeElement
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
      activeEl.blur()
      return 'closed_keyboard'
    }
  }

  const path = location?.pathname || window.location.pathname

  // 6. Driver active trip: Minimize app to background without killing trip
  if (path === '/driver/trip' && hasActiveTrip) {
    if (isNative()) {
      Promise.resolve(App.minimizeApp?.()).catch(() => { })
    }
    return 'minimized_driver_trip'
  }

  // 5. Welcome carousel & onboarding navigation
  if (path === '/welcome' || isWelcome) {
    if (typeof window !== 'undefined' && window.__nbOnboardingBack && window.__nbOnboardingBack()) {
      return 'welcome_custom_back'
    }
    if (welcomeSlide > 0 && onWelcomePrevSlide) {
      onWelcomePrevSlide()
      return 'welcome_prev_slide'
    }
    if (isNative()) {
      Promise.resolve(App.exitApp?.()).catch(() => { })
    }
    return 'exit_welcome'
  }

  // 5b. Get Started screen
  if (path === '/get-started') {
    if (typeof window !== 'undefined' && appStorage.getItem('nb-onboarded') !== 'true') {
      navigate('/welcome')
      return 'back_to_welcome'
    }
    if (isNative()) {
      Promise.resolve(App.exitApp?.()).catch(() => { })
    }
    return 'exit_get_started'
  }

  // 5c. Login & Register screens
  if (path === '/login' || path === '/register' || path === '/forgot-password') {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/get-started')
    }
    return 'back_to_get_started'
  }

  // Driver sub-pages (history, bus, profile) return to driver root
  if (path.startsWith('/driver/') && path !== '/driver') {
    navigate('/driver')
    return 'back_to_driver_root'
  }

  // Driver root double-tap exit
  if (path === '/driver') {
    const now = Date.now()
    if (now - lastBackPressTime < 2000) {
      if (isNative()) Promise.resolve(App.exitApp?.()).catch(() => { })
      return 'exit_app'
    }
    lastBackPressTime = now
    toast.info('Press back again to exit')
    return 'confirm_exit_shown'
  }

  // 4. Passenger Secondary main tabs return to Explore (/explore)
  if (['/live', '/nearby', '/routes', '/saved'].includes(path)) {
    navigate('/explore')
    return 'back_to_explore'
  }

  // 4b. Explore tab root double-tap exit
  if (path === '/explore' || path === '/') {
    const now = Date.now()
    if (now - lastBackPressTime < 2000) {
      if (isNative()) Promise.resolve(App.exitApp?.()).catch(() => { })
      return 'exit_app'
    }
    lastBackPressTime = now
    toast.info('Press back again to exit')
    return 'confirm_exit_shown'
  }

  // 3 & 8. Internal pages with history (Results, Journey, Stops, etc.)
  if (window.history.length > 1) {
    navigate(-1)
    return 'history_back'
  }

  navigate('/explore')
  return 'fallback_explore'
}

/**
 * Initializes the global hardware back button listener for Capacitor native app.
 */
export function initNativeBackButton(getRouterContext) {
  if (!isNative()) return () => { }

  const handle = App.addListener('backButton', () => {
    const context = getRouterContext ? getRouterContext() : {}
    handleBackAction(context)
  })

  return () => {
    handle.then((h) => h.remove()).catch(() => { })
  }
}
