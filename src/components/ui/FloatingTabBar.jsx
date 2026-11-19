import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Compass, Radio, MapPin, Route, Bookmark } from 'lucide-react'

export default function FloatingTabBar() {
  const { t } = useTranslation()
  const location = useLocation()
  const pathname = location.pathname

  const tabs = [
    { key: 'explore', label: t('nav.explore'), path: '/', icon: Compass },
    { key: 'live', label: t('nav.live'), path: '/live', icon: Radio },
    { key: 'nearby', label: t('nav.nearby'), path: '/nearby', icon: MapPin },
    { key: 'routes', label: t('nav.routes'), path: '/routes', icon: Route },
    { key: 'saved', label: t('nav.saved'), path: '/saved', icon: Bookmark },
  ]

  const isActive = (tabPath) => {
    if (tabPath === '/') return pathname === '/'
    return pathname.startsWith(tabPath)
  }

  return (
    <nav
      aria-label="Main Navigation"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-md bg-surface/90 backdrop-blur-md border border-line rounded-pill p-1.5 shadow-float flex items-center justify-around"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon
        const active = isActive(tab.path)

        return (
          <Link
            key={tab.key}
            to={tab.path}
            className={`relative flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-pill text-[11px] font-semibold transition-colors ${
              active ? 'text-cobalt font-bold' : 'text-text-secondary hover:text-ink'
            }`}
          >
            {active && (
              <motion.div
                layoutId="activeTabPill"
                className="absolute inset-0 bg-cobalt-tint rounded-pill -z-10"
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
              />
            )}
            <Icon className={`w-4 h-4 mb-0.5 ${active ? 'text-cobalt' : 'text-text-secondary'}`} />
            <span className="truncate max-w-[54px]">{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
