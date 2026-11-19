import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ShieldAlert, LogOut, MapPin, Route, Calendar, CreditCard, Bus, Users, Activity, MessageSquare, Bell, FileText, Upload, History, Cpu } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import LanguageToggle from '@/components/ui/LanguageToggle'

export default function AdminDashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { signOut, user } = useAuthStore()

  const handleLogout = async () => {
    await signOut()
    navigate('/12345678/admin/login')
  }

  const adminModules = [
    { name: t('admin.stops'), path: '/12345678/admin/stops', icon: MapPin },
    { name: t('admin.routes'), path: '/12345678/admin/routes', icon: Route },
    { name: t('admin.schedules'), path: '/12345678/admin/schedules', icon: Calendar },
    { name: t('admin.fares'), path: '/12345678/admin/fares', icon: CreditCard },
    { name: t('admin.fleet'), path: '/12345678/admin/fleet', icon: Bus },
    { name: t('admin.users'), path: '/12345678/admin/users', icon: Users },
    { name: t('admin.live'), path: '/12345678/admin/live', icon: Activity },
    { name: t('admin.complaints'), path: '/12345678/admin/complaints', icon: MessageSquare },
    { name: t('admin.alerts'), path: '/12345678/admin/alerts', icon: Bell },
    { name: t('admin.reports'), path: '/12345678/admin/reports', icon: FileText },
    { name: t('admin.import'), path: '/12345678/admin/import', icon: Upload },
    { name: t('admin.audit'), path: '/12345678/admin/audit', icon: History },
    { name: t('admin.simulator'), path: '/12345678/admin/simulator', icon: Cpu },
  ]

  return (
    <div className="min-h-screen bg-page flex flex-col p-6">
      <header className="flex items-center justify-between pb-6 border-b border-line mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-input bg-ink text-white flex items-center justify-center shadow-soft">
            <ShieldAlert className="w-6 h-6 text-warning" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-ink">{t('admin.dashboard_title')}</h1>
            <p className="text-xs text-text-secondary">{user?.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-line rounded-input text-xs font-semibold text-danger hover:bg-danger/10 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>{t('common.logout')}</span>
          </button>
        </div>
      </header>

      <main className="max-w-5xl w-full mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {adminModules.map((mod) => {
          const Icon = mod.icon
          return (
            <Link
              key={mod.path}
              to={mod.path}
              className="bg-surface p-5 rounded-card border border-line shadow-soft hover:border-cobalt hover:shadow-float transition flex flex-col justify-between group"
            >
              <div className="w-10 h-10 rounded-input bg-cobalt-tint text-cobalt flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-ink mb-1">{mod.name}</h3>
                <span className="text-[11px] text-text-secondary">{t('common.coming_soon')}</span>
              </div>
            </Link>
          )
        })}
      </main>

      <footer className="mt-auto pt-8 text-center text-xs text-text-secondary">
        Nammooru Bus &bull; Admin Operations
      </footer>
    </div>
  )
}
