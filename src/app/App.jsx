import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { router } from './routes'
import { useAuthStore } from '@/store/authStore'
import OfflineBanner from '@/components/ui/OfflineBanner'

export default function App() {
  const { init } = useAuthStore()

  useEffect(() => {
    init()
  }, [init])

  return (
    <MotionConfig reducedMotion="user">
      <OfflineBanner />
      <RouterProvider router={router} />
    </MotionConfig>
  )
}
