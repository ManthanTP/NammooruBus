import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  checkAppUpdate,
  dismissUpdateReminder,
  isDismissedThisRun,
  resetDismissedForTesting,
  compareVersions,
  getUpdateDiagnostics,
  resetDiagnosticsForTesting,
} from '../versionCheck'
import { App } from '@capacitor/app'

vi.mock('@capacitor/app', () => ({
  App: {
    getInfo: vi.fn(),
  },
}))

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => true,
    getPlatform: () => 'android',
  },
}))

describe('App Versioning & In-App Update Checker', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.clearAllMocks()
    resetDismissedForTesting()
    resetDiagnosticsForTesting()
    App.getInfo.mockResolvedValue({
      version: '1.0.0',
      build: '1',
    })
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('1. Detects an available update when installedVersionCode < latest.versionCode', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        latest: {
          versionName: '1.1.0',
          versionCode: 2,
          releasedAt: '2026-11-25',
          apkUrl: '/downloads/nammooru-bus.apk',
          apkSize: '15.1 MB',
          downloadPage: '/#app',
        },
        minSupportedVersionCode: 1,
        releaseNotes: {
          en: ['New live bus route map'],
          kn: ['ಹೊಸ ನೇರ ಬಸ್ ಮಾರ್ಗ ನಕ್ಷೆ'],
        },
      }),
    })

    const result = await checkAppUpdate()

    expect(result.hasUpdate).toBe(true)
    expect(result.isRequired).toBe(false)
    expect(result.latest.versionName).toBe('1.1.0')
    expect(result.latest.versionCode).toBe(2)
    expect(result.installed.versionCode).toBe(1)
  })

  it('2. Marks update as REQUIRED when installedVersionCode < minSupportedVersionCode', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        latest: {
          versionName: '2.0.0',
          versionCode: 5,
        },
        minSupportedVersionCode: 2,
      }),
    })

    const result = await checkAppUpdate()

    expect(result.hasUpdate).toBe(true)
    expect(result.isRequired).toBe(true)
  })

  it('3. Does NOT flag an update when app is on latest or newer version', async () => {
    App.getInfo.mockResolvedValue({
      version: '1.1.0',
      build: '2',
    })

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        latest: {
          versionName: '1.1.0',
          versionCode: 2,
        },
        minSupportedVersionCode: 1,
      }),
    })

    const result = await checkAppUpdate()

    expect(result.hasUpdate).toBe(false)
  })

  it('4. Remind me later dismisses only in-memory for the current run', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        latest: {
          versionName: '1.1.0',
          versionCode: 2,
        },
        minSupportedVersionCode: 1,
      }),
    })

    expect(isDismissedThisRun()).toBe(false)

    // User chooses "Remind me later"
    dismissUpdateReminder()
    expect(isDismissedThisRun()).toBe(true)

    // Subsequent automatic checks in the same app run return hasUpdate: false
    const suppressed = await checkAppUpdate()
    expect(suppressed.hasUpdate).toBe(false)

    // Explicit manual check from Profile "Check for updates" bypasses dismissal
    const forced = await checkAppUpdate({ force: true })
    expect(forced.hasUpdate).toBe(true)

    // On cold start / reset, dismissedThisRun resets to false
    resetDismissedForTesting()
    expect(isDismissedThisRun()).toBe(false)
    const fresh = await checkAppUpdate()
    expect(fresh.hasUpdate).toBe(true)
  })

  it('5. Handles offline, network errors, or invalid JSON gracefully without throwing', async () => {
    // Network failure
    global.fetch = vi.fn().mockRejectedValue(new Error('Network offline'))
    const offlineResult = await checkAppUpdate()
    expect(offlineResult.hasUpdate).toBe(false)
    expect(offlineResult.error).toBe(true)

    // HTTP 500 error
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 })
    const httpErrorResult = await checkAppUpdate()
    expect(httpErrorResult.hasUpdate).toBe(false)
    expect(httpErrorResult.error).toBe(true)

    // Invalid JSON body
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => {
        throw new Error('Invalid JSON syntax')
      },
    })
    const invalidJsonResult = await checkAppUpdate()
    expect(invalidJsonResult.hasUpdate).toBe(false)
    expect(invalidJsonResult.error).toBe(true)
  })

  describe('Pure Integer Version Comparison (compareVersions)', () => {
    it('returns hasUpdate: true when installedCode < latestCode', () => {
      const result = compareVersions(5, 6, 1)
      expect(result.hasUpdate).toBe(true)
      expect(result.isRequired).toBe(false)
      expect(result.isUpToDate).toBe(false)
    })

    it('returns isUpToDate: true when installedCode === latestCode', () => {
      const result = compareVersions(5, 5, 1)
      expect(result.hasUpdate).toBe(false)
      expect(result.isRequired).toBe(false)
      expect(result.isUpToDate).toBe(true)
    })

    it('returns isUpToDate: true when installedCode > latestCode (developer/testing build)', () => {
      const result = compareVersions(10, 5, 1)
      expect(result.hasUpdate).toBe(false)
      expect(result.isRequired).toBe(false)
      expect(result.isUpToDate).toBe(true)
    })

    it('returns isRequired: true when installedCode < minSupportedCode', () => {
      const result = compareVersions(3, 10, 5)
      expect(result.hasUpdate).toBe(true)
      expect(result.isRequired).toBe(true)
      expect(result.isUpToDate).toBe(false)
    })

    it('handles numeric strings properly', () => {
      const result = compareVersions('5', '6', '1')
      expect(result.hasUpdate).toBe(true)
      expect(result.isRequired).toBe(false)
    })

    it('handles invalid or non-numeric arguments gracefully', () => {
      const result = compareVersions('abc', 5, 1)
      expect(result.hasUpdate).toBe(false)
      expect(result.isUpToDate).toBe(true)
      expect(result.isRequired).toBe(false)
    })
  })

  describe('Update Diagnostics Tracking', () => {
    it('records diagnostics upon checking', async () => {
      App.getInfo.mockResolvedValue({
        version: '1.0.4',
        build: '5',
      })
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          latest: {
            versionName: '1.0.5',
            versionCode: 6,
          },
          minSupportedVersionCode: 4,
        }),
      })

      await checkAppUpdate({ force: true })
      const diag = getUpdateDiagnostics()

      expect(diag.installedCode).toBe(5)
      expect(diag.installedName).toBe('1.0.4')
      expect(diag.remoteCode).toBe(6)
      expect(diag.remoteMinCode).toBe(4)
      expect(diag.status).toBe('ok')
      expect(diag.decision).toBe('optional update')
      expect(diag.lastCheckedAt).toBeTruthy()
    })
  })
})
