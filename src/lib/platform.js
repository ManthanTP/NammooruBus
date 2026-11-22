import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import { Share } from '@capacitor/share'
import { Network } from '@capacitor/network'
import { KeepAwake } from '@capacitor-community/keep-awake'
import { appStorage } from './storage'

export const isNative = () => Capacitor.isNativePlatform()
export const getPlatform = () => Capacitor.getPlatform()

/**
 * Haptics with vibration toggle setting support
 */
export const hapticTick = async () => {
  if (!isNative()) return
  if (appStorage.getItem('nb-vibration') === 'false') return
  try {
    await Haptics.impact({ style: ImpactStyle.Light })
  } catch (_) {}
}

export const hapticMedium = async () => {
  if (!isNative()) return
  if (appStorage.getItem('nb-vibration') === 'false') return
  try {
    await Haptics.impact({ style: ImpactStyle.Medium })
  } catch (_) {}
}

export const hapticSuccess = async () => {
  if (!isNative()) return
  if (appStorage.getItem('nb-vibration') === 'false') return
  try {
    await Haptics.notification({ type: NotificationType.Success })
  } catch (_) {}
}

export const hapticError = async () => {
  if (!isNative()) return
  if (appStorage.getItem('nb-vibration') === 'false') return
  try {
    await Haptics.notification({ type: NotificationType.Error })
  } catch (_) {}
}

/**
 * Native Status Bar theme & style controller
 */
export const setStatusBarTheme = async (theme = 'light', isLightBackground = false) => {
  if (!isNative()) return
  try {
    let resolvedTheme = theme
    if (theme === 'system' && typeof window !== 'undefined' && window.matchMedia) {
      resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }

    if (isLightBackground || resolvedTheme === 'light') {
      // Light background: dark icons on light surface
      await StatusBar.setStyle({ style: Style.Light })
      await StatusBar.setBackgroundColor({ color: '#FFFFFF' })
    } else if (resolvedTheme === 'blue') {
      // Navy Blue theme: light icons on navy surface
      await StatusBar.setStyle({ style: Style.Dark })
      await StatusBar.setBackgroundColor({ color: '#050B2E' })
    } else {
      // Dark theme: light icons on pitch black
      await StatusBar.setStyle({ style: Style.Dark })
      await StatusBar.setBackgroundColor({ color: '#0A0B10' })
    }
  } catch (e) {
    console.warn('Could not update native status bar:', e)
  }
}

/**
 * Native Splash Screen dismissal
 */
export const hideNativeSplash = async () => {
  if (!isNative()) return
  try {
    await SplashScreen.hide()
  } catch (e) {
    console.warn('Could not hide native splash:', e)
  }
}

/**
 * Keep screen awake (e.g. for driver active tracking)
 */
export const keepAwake = async () => {
  if (!isNative()) return
  try {
    await KeepAwake.keepAwake()
  } catch (e) {
    console.warn('KeepAwake error:', e)
  }
}

export const allowSleep = async () => {
  if (!isNative()) return
  try {
    await KeepAwake.allowSleep()
  } catch (e) {
    console.warn('AllowSleep error:', e)
  }
}

/**
 * Share via native share sheet or web fallback
 */
export const nativeShare = async ({ title, text, url }) => {
  if (isNative()) {
    try {
      await Share.share({
        title,
        text,
        url,
        dialogTitle: title || 'Share with Nammooru Bus',
      })
      return true
    } catch (e) {
      // User cancelled or share dismissed
      return false
    }
  }

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title, text, url })
      return true
    } catch (_) {
      return false
    }
  }

  // Fallback to clipboard
  if (typeof navigator !== 'undefined' && navigator.clipboard && url) {
    await navigator.clipboard.writeText(url)
    return 'copied'
  }
  return false
}

/**
 * Open external URL in system browser
 */
export const openExternalUrl = (url) => {
  if (!url) return
  if (isNative()) {
    window.open(url, '_system')
  } else {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

/**
 * Listen for network connectivity changes
 */
export const onNetworkStatusChange = (callback) => {
  if (isNative()) {
    const handle = Network.addListener('networkStatusChange', (status) => {
      callback(status.connected)
    })
    return () => {
      handle.then((h) => h.remove()).catch(() => {})
    }
  }

  const onlineHandler = () => callback(true)
  const offlineHandler = () => callback(false)
  window.addEventListener('online', onlineHandler)
  window.addEventListener('offline', offlineHandler)

  return () => {
    window.removeEventListener('online', onlineHandler)
    window.removeEventListener('offline', offlineHandler)
  }
}
