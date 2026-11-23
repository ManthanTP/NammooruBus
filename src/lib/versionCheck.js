import { App } from '@capacitor/app'
import { isNative } from './platform'
import { APK_VERSION } from '@/config/links'

// In-memory dismissal flag: kept only for the current app run (cold start resets this)
let dismissedThisRun = false

export function isDismissedThisRun() {
  return dismissedThisRun
}

export function dismissUpdateReminder() {
  dismissedThisRun = true
}

export function resetDismissedForTesting() {
  dismissedThisRun = false
}

/**
 * Fetch and compare installed app version with latest published version.
 * @param {Object} options
 * @param {boolean} options.force - If true, bypasses the in-memory dismissal check (e.g. from Profile "Check for updates")
 * @returns {Promise<{ hasUpdate: boolean, isRequired: boolean, latest: object|null, installed: object, releaseNotes: object|null, error: boolean }>}
 */
export async function checkAppUpdate({ force = false } = {}) {
  // If user tapped "Remind me later" during this session, do not prompt again unless explicitly forced
  if (dismissedThisRun && !force) {
    return { hasUpdate: false, isRequired: false, latest: null, installed: null, releaseNotes: null, error: false }
  }

  let installedVersionCode = 1
  let installedVersionName = APK_VERSION || '1.0.0'

  if (isNative()) {
    try {
      const info = await App.getInfo()
      if (info?.build) installedVersionCode = parseInt(info.build, 10) || 1
      if (info?.version) installedVersionName = info.version
    } catch (_) {
      // Keep defaults
    }
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    // Cache-busting query to always retrieve the latest version.json
    const url = `/version.json?t=${Date.now()}`
    const response = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    })
    clearTimeout(timeoutId)

    if (!response.ok) {
      return { hasUpdate: false, isRequired: false, latest: null, installed: { versionCode: installedVersionCode, versionName: installedVersionName }, releaseNotes: null, error: true }
    }

    const data = await response.json()
    if (!data?.latest?.versionCode) {
      return { hasUpdate: false, isRequired: false, latest: null, installed: { versionCode: installedVersionCode, versionName: installedVersionName }, releaseNotes: null, error: true }
    }

    const latestCode = Number(data.latest.versionCode)
    const minCode = Number(data.minSupportedVersionCode || 1)
    const hasUpdate = installedVersionCode < latestCode
    const isRequired = installedVersionCode < minCode

    return {
      hasUpdate,
      isRequired,
      latest: data.latest,
      installed: {
        versionCode: installedVersionCode,
        versionName: installedVersionName,
      },
      releaseNotes: data.releaseNotes || null,
      error: false,
    }
  } catch (err) {
    // Offline, network failure, or invalid JSON: fail silently
    return {
      hasUpdate: false,
      isRequired: false,
      latest: null,
      installed: {
        versionCode: installedVersionCode,
        versionName: installedVersionName,
      },
      releaseNotes: null,
      error: true,
    }
  }
}
