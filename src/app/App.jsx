import { useEffect, useState } from 'react'
import { RouterProvider } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { router } from './routes'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import { appStorage } from '@/lib/storage'
import { initNativeBackButton } from '@/lib/backHandler'
import OfflineBanner from '@/components/ui/OfflineBanner'
import SplashScreen from '@/components/splash/SplashScreen'

export default function App() {
  const { init } = useAuthStore()
  const [showSplash, setShowSplash] = useState(() => {
    // Show splash once per session
    return !sessionStorage.getItem('nb_splash_shown')
  })

  useEffect(() => {
    appStorage.initStorage()
    init()
    useThemeStore.getState().initTheme()

    const unbindBack = initNativeBackButton(() => ({
      navigate: router.navigate,
      location: router.state.location,
    }))

    return () => {
      unbindBack?.()
    }
  }, [init])

  const handleSplashFinish = () => {
    sessionStorage.setItem('nb_splash_shown', 'true')
    setShowSplash(false)
  }

  return (
    <MotionConfig reducedMotion="user">
      {showSplash && <SplashScreen onFinish={handleSplashFinish} />}
      <OfflineBanner />
      <RouterProvider router={router} />
    </MotionConfig>
  )
}
