import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Compass, Radio, MapPin, Route, Bookmark } from 'lucide-react'

export default function FloatingTabBar() {
  const { t } = useTranslation()
  const location = useLocation()
  const pathname = location.pathname

  const tabs = [
    { key: 'explore', label: t('nav.explore'), path: '/explore', icon: Compass },
    { key: 'live', label: t('nav.live'), path: '/live', icon: Radio },
    { key: 'nearby', label: t('nav.nearby'), path: '/nearby', icon: MapPin },
    { key: 'routes', label: t('nav.routes'), path: '/routes', icon: Route },
    { key: 'saved', label: t('nav.saved'), path: '/saved', icon: Bookmark },
  ]

  const isActive = (tabPath) => {
    if (tabPath === '/explore') return pathname === '/explore'
    return pathname.startsWith(tabPath)
  }

  return (
    <nav
      aria-label="Main Navigation"
      className="fixed bottom-0 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-[420px] h-16 bg-surface px-2 py-1.5 rounded-full flex items-center justify-around border border-line"
      style={{
        boxShadow: 'var(--shadow-float)',
        marginBottom: 'max(12px, var(--safe-bottom))',
      }}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon
        const active = isActive(tab.path)

        return (
          <Link
            key={tab.key}
            to={tab.path}
            className={`relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full py-1 px-1 rounded-full select-none ${
              active ? 'on-brand' : 'text-muted'
            }`}
            style={{ color: active ? 'var(--on-brand)' : 'var(--muted)' }}
          >
            {active && (
              <motion.div
                layoutId="activeTabPill"
                className="absolute inset-0 rounded-full shadow-sm z-0 pointer-events-none"
                style={{ background: 'var(--gradient-brand)' }}
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
              />
            )}
            <Icon
              size={22}
              strokeWidth={2}
              className="relative z-10 transition-colors"
              style={{ color: active ? 'var(--on-brand)' : 'var(--muted)' }}
            />
            <span
              className={`relative z-10 text-[10.5px] leading-tight tracking-tight truncate max-w-[62px] ${
                active ? 'font-bold' : 'font-medium'
              }`}
              style={{ color: active ? 'var(--on-brand)' : 'var(--muted)' }}
            >
              {tab.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
