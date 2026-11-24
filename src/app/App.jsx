import { useEffect, useState } from 'react'
import { RouterProvider } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { router } from './routes'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import { appStorage } from '@/lib/storage'
import { initNativeBackButton } from '@/lib/backHandler'
import { isNative, initScreenInsets, setStatusBarTheme } from '@/lib/platform'
import OfflineBanner from '@/components/ui/OfflineBanner'
import SplashScreen from '@/components/splash/SplashScreen'
import AppUpdateChecker from '@/components/ui/AppUpdateChecker'

export default function App() {
  const { init } = useAuthStore()
  const [currentPath, setCurrentPath] = useState(() => router.state.location.pathname)
  const [showSplash, setShowSplash] = useState(() => {
    // Show splash once per session
    return !sessionStorage.getItem('nb_splash_shown')
  })

  useEffect(() => {
    appStorage.initStorage()
    init()
    useThemeStore.getState().initTheme()
    initScreenInsets()

    const unbindBack = initNativeBackButton(() => ({
      navigate: router.navigate,
      location: router.state.location,
    }))

    const unsubscribeRouter = router.subscribe((state) => {
      setCurrentPath(state.location.pathname)
    })

    // Register Web PWA service worker on web only (never in native Capacitor app)
    if (!isNative() && typeof window !== 'undefined' && 'serviceWorker' in navigator && import.meta.env.PROD) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
          console.warn('PWA: Service Worker registration failed:', err)
        })
      })
    }

    return () => {
      unbindBack?.()
      unsubscribeRouter()
    }
  }, [init])

  const handleSplashFinish = () => {
    sessionStorage.setItem('nb_splash_shown', 'true')
    setShowSplash(false)
    const currentTheme = useThemeStore.getState().resolvedTheme || 'dark'
    setStatusBarTheme(currentTheme)
  }

  return (
    <MotionConfig reducedMotion="user">
      {showSplash && <SplashScreen onFinish={handleSplashFinish} />}
      <OfflineBanner />
      <AppUpdateChecker currentPath={currentPath} showSplash={showSplash} />
      <RouterProvider router={router} />
    </MotionConfig>
  )
}
