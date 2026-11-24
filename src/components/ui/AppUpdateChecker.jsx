import { useState, useEffect } from 'react'
import { isNative } from '@/lib/platform'
import { checkAppUpdate, isDismissedThisRun } from '@/lib/versionCheck'
import UpdateModal from './UpdateModal'

const EXCLUDED_PATHS = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/driver/trip',
]

let hasCheckedAutomaticallyThisLaunch = false

export function resetAppUpdateCheckerForTesting() {
  hasCheckedAutomaticallyThisLaunch = false
}

export default function AppUpdateChecker({ currentPath = '', showSplash = false }) {
  const [updateInfo, setUpdateInfo] = useState(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    // Native app only, never run on web
    if (!isNative()) return

    // Do not check or show during splash
    if (showSplash) return

    // Never on login/register/forgot or active driver trip
    if (EXCLUDED_PATHS.some((p) => currentPath.startsWith(p))) return

    // At most ONCE per app launch (in-memory flag)
    if (hasCheckedAutomaticallyThisLaunch) return

    // If dismissed with "Remind me later" do not show again until cold restart
    if (isDismissedThisRun()) return

    hasCheckedAutomaticallyThisLaunch = true
    let isMounted = true

    // Check for updates 1.5s after reaching user-interactive screen
    const timer = setTimeout(async () => {
      try {
        const result = await checkAppUpdate()
        if (isMounted && result.hasUpdate && result.latest) {
          setUpdateInfo(result)
          setShowModal(true)
        }
      } catch (_) {
        // Skip silently on error / offline
      }
    }, 1500)

    return () => {
      isMounted = false
      clearTimeout(timer)
    }
  }, [currentPath, showSplash])

  if (!isNative() || !showModal || !updateInfo) {
    return null
  }

  return (
    <UpdateModal
      isOpen={showModal}
      updateInfo={updateInfo}
      onClose={() => setShowModal(false)}
    />
  )
}
