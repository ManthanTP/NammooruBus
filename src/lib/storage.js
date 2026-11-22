import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

const isNative = Capacitor.isNativePlatform()

/**
 * In-memory cache for ultra-fast synchronous reads.
 * Synchronizes with Preferences on native and localStorage on web.
 */
const memoryCache = new Map()

// Pre-fill memory cache from localStorage if available
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k) memoryCache.set(k, localStorage.getItem(k))
    }
  } catch (e) {
    console.warn('Could not read localStorage into memory cache', e)
  }
}

export const appStorage = {
  /**
   * Initializes storage on native platforms by syncing Preferences into memory and localStorage.
   */
  async initStorage() {
    if (!isNative) return
    try {
      const { keys } = await Preferences.keys()
      for (const key of keys) {
        const { value } = await Preferences.get({ key })
        if (value !== null) {
          memoryCache.set(key, value)
          try {
            localStorage.setItem(key, value)
          } catch (_) {}
        }
      }
    } catch (e) {
      console.warn('Failed to sync Preferences on native startup:', e)
    }
  },

  /**
   * Synchronous getItem — reads from memory cache / localStorage.
   */
  getItem(key) {
    if (memoryCache.has(key)) {
      return memoryCache.get(key)
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const val = localStorage.getItem(key)
        if (val !== null) {
          memoryCache.set(key, val)
          return val
        }
      } catch (_) {}
    }
    return null
  },

  /**
   * Async getItem directly from native Preferences (or memory).
   */
  async getItemAsync(key) {
    if (isNative) {
      try {
        const { value } = await Preferences.get({ key })
        if (value !== null) {
          memoryCache.set(key, value)
          try { localStorage.setItem(key, value) } catch (_) {}
          return value
        }
      } catch (e) {
        console.warn(`Error getting ${key} from Preferences:`, e)
      }
    }
    return this.getItem(key)
  },

  /**
   * Set item in memory, localStorage, and async Preferences.
   */
  setItem(key, value) {
    const strVal = String(value)
    memoryCache.set(key, strVal)

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(key, strVal)
      } catch (_) {}
    }

    if (isNative) {
      Preferences.set({ key, value: strVal }).catch((err) => {
        console.warn(`Error writing ${key} to Preferences:`, err)
      })
    }
  },

  /**
   * Remove item from all storage tiers.
   */
  removeItem(key) {
    memoryCache.delete(key)

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.removeItem(key)
      } catch (_) {}
    }

    if (isNative) {
      Preferences.remove({ key }).catch((err) => {
        console.warn(`Error removing ${key} from Preferences:`, err)
      })
    }
  },

  /**
   * Clear all app preferences.
   */
  async clear() {
    memoryCache.clear()
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.clear()
      } catch (_) {}
    }
    if (isNative) {
      try {
        await Preferences.clear()
      } catch (e) {
        console.warn('Error clearing Preferences:', e)
      }
    }
  },
}

export default appStorage
