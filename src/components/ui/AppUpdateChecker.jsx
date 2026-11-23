import { useState, useEffect } from 'react'
import { isNative } from '@/lib/platform'
import { checkAppUpdate, isDismissedThisRun } from '@/lib/versionCheck'
import UpdateModal from './UpdateModal'

const EXCLUDED_PATHS = [
  '/',
  '/welcome',
  '/get-started',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/driver/trip',
]

export default function AppUpdateChecker({ currentPath = '', showSplash = false }) {
  const [updateInfo, setUpdateInfo] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    // Native app only, never run automatically on web
    if (!isNative()) return

    // Do not check or show during splash
    if (showSplash) return

    // Do not check or show on excluded screens
    if (EXCLUDED_PATHS.includes(currentPath)) return

    // Do not check again if already checked this run or dismissed in-memory
    if (checked || isDismissedThisRun()) return

    let isMounted = true

    // Check for updates with a short delay after landing on a real screen
    const timer = setTimeout(async () => {
      try {
        const result = await checkAppUpdate()
        if (isMounted && result.hasUpdate && result.latest) {
          setUpdateInfo(result)
          setShowModal(true)
        }
        setChecked(true)
      } catch (_) {
        // Skip silently on error / offline
      }
    }, 1200)

    return () => {
      isMounted = false
      clearTimeout(timer)
    }
  }, [currentPath, showSplash, checked])

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
