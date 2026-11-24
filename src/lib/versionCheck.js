import { App } from '@capacitor/app'
import { CapacitorHttp } from '@capacitor/core'
import { isNative } from './platform'
import { PRODUCTION_URL, APK_VERSION, APK_BUILD } from '@/config/links'

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
 * Pure integer-only comparison function.
 * versionName is display only and NEVER used to decide.
 * @param {number|string} installedCode
 * @param {number|string} latestCode
 * @param {number|string} minSupportedCode
 * @returns {{ hasUpdate: boolean, isRequired: boolean, isUpToDate: boolean }}
 */
export function compareVersions(installedCode, latestCode, minSupportedCode = 1) {
  const inst = parseInt(installedCode, 10)
  const lat = parseInt(latestCode, 10)
  const min = parseInt(minSupportedCode, 10)

  if (Number.isNaN(inst) || Number.isNaN(lat)) {
    return { hasUpdate: false, isRequired: false, isUpToDate: true }
  }

  const hasUpdate = inst < lat
  const isRequired = inst < min
  const isUpToDate = inst >= lat

  return { hasUpdate, isRequired, isUpToDate }
}

// In-memory diagnostics store (live inspection in Profile > About > Update diagnostics)
let updateDiagnostics = {
  installedCode: parseInt(APK_BUILD || '5', 10),
  installedName: APK_VERSION || '1.0.4',
  remoteCode: null,
  remoteMinCode: null,
  lastCheckedAt: null,
  status: 'never', // 'never' | 'ok' | 'failed' | 'timeout' | 'offline'
  decision: 'never checked', // 'up to date' | 'optional update' | 'required update' | 'check failed'
}

export function getUpdateDiagnostics() {
  return { ...updateDiagnostics }
}

export function resetDiagnosticsForTesting() {
  updateDiagnostics = {
    installedCode: parseInt(APK_BUILD || '5', 10),
    installedName: APK_VERSION || '1.0.4',
    remoteCode: null,
    remoteMinCode: null,
    lastCheckedAt: null,
    status: 'never',
    decision: 'never checked',
  }
}

/**
 * Fetch and compare installed app version with latest published version.
 * Native-only: On web, does nothing and returns hasUpdate: false.
 * @param {Object} options
 * @param {boolean} options.force - If true, bypasses the in-memory dismissal check
 * @returns {Promise<{ hasUpdate: boolean, isRequired: boolean, latest: object|null, installed: object, releaseNotes: object|null, error: boolean, isWeb?: boolean }>}
 */
export async function checkAppUpdate({ force = false } = {}) {
  // On the WEB (not native), there is no update check, no popup, and no check button
  if (!isNative()) {
    return {
      hasUpdate: false,
      isRequired: false,
      latest: null,
      installed: { versionCode: parseInt(APK_BUILD || '5', 10), versionName: APK_VERSION || '1.0.4' },
      releaseNotes: null,
      error: false,
      isWeb: true,
    }
  }

  // If user tapped "Remind me later" during this session, do not prompt again unless explicitly forced
  if (dismissedThisRun && !force) {
    return { hasUpdate: false, isRequired: false, latest: null, installed: null, releaseNotes: null, error: false }
  }

  let installedVersionCode = parseInt(APK_BUILD || '5', 10)
  let installedVersionName = APK_VERSION || '1.0.4'

  try {
    const info = await App.getInfo()
    if (info?.build) {
      const parsedBuild = parseInt(info.build, 10)
      if (!Number.isNaN(parsedBuild)) installedVersionCode = parsedBuild
    }
    if (info?.version) installedVersionName = info.version
  } catch (_) {
    // Keep build defaults
  }

  updateDiagnostics.installedCode = installedVersionCode
  updateDiagnostics.installedName = installedVersionName

  const baseUrl = (PRODUCTION_URL || 'https://nammoorubus.vercel.app').replace(/\/+$/, '')
  const url = `${baseUrl}/version.json?t=${Date.now()}`

  let rawData = null
  let status = 'failed'

  // Attempt 1: Native HTTP via CapacitorHttp (bypasses CORS & WebView cache)
  try {
    const res = await CapacitorHttp.get({
      url,
      headers: { 'Cache-Control': 'no-cache' },
      connectTimeout: 8000,
      readTimeout: 8000,
    })
    if (res && (res.status === 200 || res.status === 304) && res.data) {
      rawData = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
      status = 'ok'
    } else {
      status = 'failed'
    }
  } catch (_) {
    // Attempt 2: Fallback to standard fetch with 8-second abort controller
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000)
      const res = await fetch(url, {
        signal: controller.signal,
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      })
      clearTimeout(timeoutId)
      if (res.ok) {
        rawData = await res.json()
        status = 'ok'
      } else {
        status = 'failed'
      }
    } catch (fetchErr) {
      if (fetchErr.name === 'AbortError') {
        status = 'timeout'
      } else {
        status = 'offline'
      }
    }
  }

  updateDiagnostics.lastCheckedAt = new Date().toLocaleTimeString()
  updateDiagnostics.status = status

  if (status !== 'ok' || !rawData?.latest?.versionCode) {
    updateDiagnostics.decision = 'check failed'
    return {
      hasUpdate: false,
      isRequired: false,
      latest: null,
      installed: { versionCode: installedVersionCode, versionName: installedVersionName },
      releaseNotes: null,
      error: true,
    }
  }

  const latestCode = parseInt(rawData.latest.versionCode, 10)
  const minCode = parseInt(rawData.minSupportedVersionCode || '1', 10)

  updateDiagnostics.remoteCode = latestCode
  updateDiagnostics.remoteMinCode = minCode

  // Integer-only comparison
  const comparison = compareVersions(installedVersionCode, latestCode, minCode)

  if (comparison.isRequired) {
    updateDiagnostics.decision = 'required update'
  } else if (comparison.hasUpdate) {
    updateDiagnostics.decision = 'optional update'
  } else {
    updateDiagnostics.decision = 'up to date'
  }

  return {
    hasUpdate: comparison.hasUpdate,
    isRequired: comparison.isRequired,
    latest: rawData.latest,
    installed: {
      versionCode: installedVersionCode,
      versionName: installedVersionName,
    },
    releaseNotes: rawData.releaseNotes || null,
    error: false,
  }
}
