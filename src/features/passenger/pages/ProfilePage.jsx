import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { User, LogOut, ArrowLeft, MessageSquare, HelpCircle, Shield, KeyRound, AlertCircle, CheckCircle2, Bus } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useDataStore } from '@/store/dataStore'
import { useToastStore } from '@/components/ui/Toast'
import LanguageToggle from '@/components/ui/LanguageToggle'
import Button from '@/components/ui/Button'

export default function ProfilePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, profile, signOut, claimDriverRole } = useAuthStore()
  const { routes, initData } = useDataStore()
  const { addToast } = useToastStore()

  const [driverKey, setDriverKey] = useState('')
  const [busRegNo, setBusRegNo] = useState('')
  const [selectedRouteId, setSelectedRouteId] = useState('')
  const [claimLoading, setClaimLoading] = useState(false)
  const [claimError, setClaimError] = useState(null)

  useEffect(() => {
    initData()
  }, [initData])

  useEffect(() => {
    if (routes && routes.length > 0 && !selectedRouteId) {
      setSelectedRouteId(routes[0].id)
    }
  }, [routes, selectedRouteId])

  const handleLogout = async () => {
    await signOut()
    addToast('Logged out successfully', 'info')
    navigate('/')
  }

  const handleClaimDriver = async (e) => {
    e.preventDefault()
    if (!driverKey.trim()) {
      setClaimError('Please enter driver secret key')
      return
    }
    if (!busRegNo.trim()) {
      setClaimError('Please enter bus registration number')
      return
    }

    const submittedKey = driverKey
    const submittedBus = busRegNo.trim().toUpperCase()
    const submittedRoute = selectedRouteId
    setDriverKey('')
    setClaimLoading(true)
    setClaimError(null)

    const { status, error } = await claimDriverRole(submittedKey, submittedBus, submittedRoute)
    setClaimLoading(false)

    if (status === 'ok') {
      addToast('Driver role unlocked! Redirecting...', 'success')
      navigate('/driver')
    } else if (status === 'invalid') {
      setClaimError('Invalid driver key.')
    } else if (status === 'locked') {
      setClaimError('Too many wrong keys. Try again in 15 minutes.')
    } else if (status === 'not_configured') {
      setClaimError('Driver sign-up is not set up yet. Ask the admin.')
    } else if (status === 'bus_taken') {
      setClaimError('Bus is already assigned to another driver. Contact admin.')
    } else if (status === 'bus_required') {
      setClaimError('Please enter your bus registration number.')
    } else {
      setClaimError(error || 'Failed to verify driver key.')
    }
  }

  const isPassenger = !profile?.role || profile.role === 'passenger'

  return (
    <div className="space-y-4 pb-8">
      {/* 1. Gradient Profile Header */}
      <div
        className="rounded-[28px] p-6 text-white shadow-soft relative overflow-hidden"
        style={{ background: 'var(--gradient-brand)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full bg-white/15 text-white flex items-center justify-center transition active:scale-95"
            title="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="font-heading font-extrabold text-xs text-white uppercase tracking-wider">
            {t('nav.profile') || 'My Profile'}
          </span>
          <div className="w-8" />
        </div>

        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full border-4 border-white bg-white text-cobalt-500 font-heading font-extrabold text-2xl flex items-center justify-center shadow-float shrink-0">
            {profile?.full_name ? profile.full_name[0].toUpperCase() : 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-heading font-extrabold text-lg text-white truncate">
              {profile?.full_name || 'Nammooru Passenger'}
            </h2>
            <p className="text-xs text-white/75 truncate mt-0.5">
              {user?.email || 'user@example.com'}
            </p>
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              {profile?.role === 'driver' ? (
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-amber-500 text-navy-900 shadow-xs">
                  Driver
                </span>
              ) : profile?.role === 'admin' ? (
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-white text-navy-900 shadow-xs">
                  Administrator
                </span>
              ) : (
                <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-white/20 text-white">
                  Passenger
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Driver Quick Switch if already a driver */}
      {profile?.role === 'driver' && (
        <div className="p-4 bg-white rounded-[20px] border border-line shadow-soft flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 text-navy-900 flex items-center justify-center">
              <Bus className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-sm text-ink-950">Driver Console</h3>
              <p className="text-xs text-muted">Switch to your vehicle dashboard</p>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/driver')}
          >
            Open &rarr;
          </Button>
        </div>
      )}

      {/* 3. Become a Driver Card (for passengers) */}
      {isPassenger && (
        <div className="p-5 bg-white rounded-[20px] border border-line shadow-soft space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-sky-100 text-cobalt-500 flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-sm text-ink-950">
                Are you a NWKRTC Driver?
              </h3>
              <p className="text-xs text-muted">Claim driver role with your depot secret key</p>
            </div>
          </div>

          {claimError && (
            <div className="p-3 bg-danger/10 border border-danger/30 rounded-[12px] text-xs text-danger font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{claimError}</span>
            </div>
          )}

          <form onSubmit={handleClaimDriver} className="space-y-2.5 pt-1">
            <input
              type="password"
              value={driverKey}
              onChange={(e) => setDriverKey(e.target.value)}
              placeholder="Enter driver secret key"
              className="w-full h-11 px-3.5 bg-sky-50 border border-line rounded-[12px] text-xs font-mono text-ink-950 focus:outline-none focus:border-cobalt-500"
            />
            <input
              type="text"
              value={busRegNo}
              onChange={(e) => setBusRegNo(e.target.value.toUpperCase())}
              placeholder="Bus Registration Number (e.g. KA25 F 1234)"
              className="w-full h-11 px-3.5 bg-sky-50 border border-line rounded-[12px] text-xs font-mono font-bold text-ink-950 uppercase focus:outline-none focus:border-cobalt-500"
            />
            <select
              value={selectedRouteId}
              onChange={(e) => setSelectedRouteId(e.target.value)}
              className="w-full h-11 px-3 bg-sky-50 border border-line rounded-[12px] text-xs font-bold text-ink-950 focus:outline-none focus:border-cobalt-500"
            >
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  Route {r.code} - {r.name_en}
                </option>
              ))}
            </select>
            <Button
              type="submit"
              variant="secondary"
              size="sm"
              loading={claimLoading}
              className="w-full font-bold"
            >
              Verify & Claim Role
            </Button>
          </form>
        </div>
      )}

      {/* 4. Menu Links */}
      <div className="bg-white rounded-[20px] border border-line shadow-soft divide-y divide-line overflow-hidden">
        <Link
          to="/complaints"
          className="p-4 flex items-center justify-between hover:bg-sky-50 transition"
        >
          <div className="flex items-center gap-3">
            <MessageSquare className="w-4 h-4 text-cobalt-500" />
            <span className="text-xs font-bold text-ink-950">{t('nav.complaints') || 'Feedback & Complaints'}</span>
          </div>
          <span className="text-xs text-muted">&rarr;</span>
        </Link>

        <Link
          to="/help"
          className="p-4 flex items-center justify-between hover:bg-sky-50 transition"
        >
          <div className="flex items-center gap-3">
            <HelpCircle className="w-4 h-4 text-cobalt-500" />
            <span className="text-xs font-bold text-ink-950">{t('nav.help') || 'Help & Support'}</span>
          </div>
          <span className="text-xs text-muted">&rarr;</span>
        </Link>
      </div>

      {/* 5. Language toggle card */}
      <div className="p-4 bg-white rounded-[20px] border border-line shadow-soft flex items-center justify-between">
        <span className="text-xs font-bold text-ink-950 font-heading">{t('common.switch_lang') || 'Language'}</span>
        <LanguageToggle />
      </div>

      {/* 6. Logout Button */}
      <Button
        variant="danger"
        size="md"
        onClick={handleLogout}
        className="w-full h-12 text-sm font-bold font-heading shadow-soft"
      >
        <LogOut className="w-4 h-4 mr-1" />
        <span>{t('auth.logout') || 'Log Out'}</span>
      </Button>
    </div>
  )
}
