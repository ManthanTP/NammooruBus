import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, LayoutGroup } from 'framer-motion'
import { User, LogOut, ArrowLeft, MessageSquare, HelpCircle, Shield, KeyRound, AlertCircle, CheckCircle2, Bus, Sun, Moon, Laptop, Smartphone, Vibrate } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useDataStore } from '@/store/dataStore'
import { useThemeStore } from '@/store/themeStore'
import { useToastStore, toast } from '@/components/ui/Toast'
import LanguageToggle from '@/components/ui/LanguageToggle'
import Button from '@/components/ui/Button'
import { appStorage } from '@/lib/storage'
import { hapticTick } from '@/lib/platform'

export default function ProfilePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const isDriverRoute = location.pathname.startsWith('/driver')
  const { user, profile, signOut, claimDriverRole } = useAuthStore()
  const { routes, initData } = useDataStore()
  const { theme, setTheme } = useThemeStore()
  const { addToast } = useToastStore()

  const [driverKey, setDriverKey] = useState('')
  const [busRegNo, setBusRegNo] = useState('')
  const [selectedRouteId, setSelectedRouteId] = useState('')
  const [claimLoading, setClaimLoading] = useState(false)
  const [claimError, setClaimError] = useState(null)
  const [driverBus, setDriverBus] = useState(null)
  const [vibrationEnabled, setVibrationEnabled] = useState(() => appStorage.getItem('nb-vibration') !== 'false')

  useEffect(() => {
    initData()
  }, [initData])

  useEffect(() => {
    if (user && profile?.role === 'driver') {
      supabase
        .from('drivers')
        .select('*, bus:buses(*)')
        .eq('profile_id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.bus) setDriverBus(data.bus)
        })
    }
  }, [user, profile])

  useEffect(() => {
    if (routes && routes.length > 0 && !selectedRouteId) {
      setSelectedRouteId(routes[0].id)
    }
  }, [routes, selectedRouteId])

  const handleLogout = async () => {
    await signOut()
    toast.info('toast.logged_out')
    navigate(isDriverRoute ? '/login' : '/')
  }

  const handleBack = () => {
    if (isDriverRoute) {
      navigate('/driver')
    } else {
      navigate(-1)
    }
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
      toast.success('toast.driver_unlocked')
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
        className="rounded-[28px] p-6 on-brand shadow-soft relative overflow-hidden"
        style={{ background: 'var(--gradient-brand)', color: 'var(--on-brand)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={handleBack}
            className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center transition active:scale-95 cursor-pointer"
            style={{ color: 'var(--on-brand)' }}
            title="Back"
          >
            <ArrowLeft className="w-4 h-4" style={{ color: 'var(--on-brand)' }} />
          </button>
          <span className="font-heading font-extrabold text-xs uppercase tracking-wider" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>
            {isDriverRoute ? 'Driver Profile' : (t('nav.profile') || 'My Profile')}
          </span>
          <div className="w-8" />
        </div>

        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-full border-4 border-white font-heading font-extrabold text-2xl flex items-center justify-center shadow-float shrink-0"
            style={{ backgroundColor: '#FFFFFF', color: '#0040FF' }}
          >
            {profile?.full_name ? profile.full_name[0].toUpperCase() : (profile?.role === 'driver' ? 'D' : 'U')}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-heading font-extrabold text-lg truncate" style={{ color: 'var(--on-brand)' }}>
              {profile?.full_name || (isDriverRoute || profile?.role === 'driver' ? 'NWKRTC Driver' : 'Nammooru Passenger')}
            </h2>
            <p className="text-xs truncate mt-0.5" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>
              {user?.email || 'user@example.com'}
            </p>
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              {isDriverRoute || profile?.role === 'driver' ? (
                <span
                  className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-amber-500 on-amber shadow-xs"
                  style={{ color: 'var(--on-amber)' }}
                >
                  NWKRTC Driver
                </span>
              ) : profile?.role === 'admin' ? (
                <span
                  className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-white shadow-xs"
                  style={{ backgroundColor: '#FFFFFF', color: '#00136E' }}
                >
                  Administrator
                </span>
              ) : (
                <span
                  className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-white/20"
                  style={{ color: 'var(--on-brand)' }}
                >
                  Passenger
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Preferences & Appearance (Language & 3-way Theme) */}
      <div className="p-4 bg-surface rounded-[20px] border border-line shadow-soft space-y-3.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted font-heading">
          {t('settings.preferences') || 'Preferences & Appearance'}
        </h3>

        {/* Language switch */}
        <div className="flex items-center justify-between pt-0.5">
          <span className="text-xs font-bold text-text">
            {t('common.switch_lang') || 'Language'}
          </span>
          <LanguageToggle />
        </div>

        <div className="h-[1px] bg-line/60" />

        {/* 4-way theme segmented control: Light, Dark, Blue, System */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-xs font-bold text-text">
            {t('settings.theme') || 'Theme'}
          </span>
          <LayoutGroup id="profile-theme-group">
            <div className="flex items-center p-1 bg-surface-2 border border-line rounded-pill">
              {[
                { key: 'light', label: 'Light', swatch: '#FFFFFF', border: '#D9E2F7', icon: Sun },
                { key: 'dark', label: 'Dark', swatch: '#0A0B10', border: '#2A2F42', icon: Moon },
                { key: 'blue', label: 'Blue', swatch: '#050B2E', border: '#22308A', icon: Moon },
                { key: 'system', label: 'System', isSys: true, icon: Laptop },
              ].map(({ key, label, swatch, border, isSys, icon: Icon }) => {
                const isActive = theme === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTheme(key)}
                    className={`relative px-2.5 py-1.5 rounded-pill text-xs font-bold flex items-center gap-1.5 transition select-none cursor-pointer ${isActive ? 'on-brand font-extrabold shadow-soft' : 'text-muted hover:text-text'
                      }`}
                    style={
                      isActive
                        ? { background: 'var(--gradient-brand)', color: 'var(--on-brand)' }
                        : { color: 'var(--muted)' }
                    }
                  >
                    {isActive && (
                      <motion.div
                        layoutId="profile-theme-pill"
                        className="absolute inset-0 rounded-pill shadow-xs z-0 pointer-events-none"
                        style={{ background: 'var(--gradient-brand)' }}
                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-1.5" style={{ color: isActive ? 'var(--on-brand)' : 'var(--muted)' }}>
                      {isSys ? (
                        <Icon className="w-3.5 h-3.5" style={{ color: isActive ? 'var(--on-brand)' : 'var(--muted)' }} />
                      ) : (
                        <span
                          className="w-3 h-3 rounded-full border shrink-0"
                          style={{ backgroundColor: swatch, borderColor: border }}
                        />
                      )}
                      <span style={{ color: isActive ? 'var(--on-brand)' : 'var(--muted)' }}>{label}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </LayoutGroup>
        </div>

        {/* Vibration switch */}
        <div className="h-[1px] bg-line/60" />
        <div className="flex items-center justify-between pt-0.5">
          <div className="flex items-center gap-2">
            <Vibrate className="w-4 h-4 text-muted" />
            <span className="text-xs font-bold text-text">Haptic Vibration</span>
          </div>
          <button
            type="button"
            onClick={() => {
              const next = !vibrationEnabled
              setVibrationEnabled(next)
              appStorage.setItem('nb-vibration', next ? 'true' : 'false')
              if (next) hapticTick()
            }}
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
              vibrationEnabled ? 'bg-brand' : 'bg-line'
            }`}
            aria-label="Toggle haptic vibration"
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                vibrationEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Show intro again (Native & onboarding walkthrough - passenger only) */}
        {!isDriverRoute && (
          <>
            <div className="h-[1px] bg-line/60" />
            <div className="pt-0.5">
              <button
                type="button"
                onClick={() => navigate('/welcome')}
                className="w-full py-2.5 px-3 rounded-pill text-xs font-bold text-text bg-surface-2 hover:bg-line border border-line transition text-center flex items-center justify-center gap-2 cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5 text-brand" />
                <span>Show intro walkthrough again</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* 3. Driver Vehicle & Shift Status if already a driver */}
      {(profile?.role === 'driver' || isDriverRoute) && (
        <div className="p-4 bg-surface rounded-[20px] border border-line shadow-soft flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 text-navy-900 flex items-center justify-center">
              <Bus className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-sm text-text">
                {driverBus ? `Assigned Bus: ${driverBus.reg_no}` : 'Driver Console'}
              </h3>
              <p className="text-xs text-muted">
                {driverBus ? 'Vehicle registered for transit duty' : 'Switch to your vehicle dashboard'}
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/driver')}
          >
            {isDriverRoute ? 'Trip' : 'Open'} &rarr;
          </Button>
        </div>
      )}

      {/* 3. Become a Driver Card (for passengers only) */}
      {isPassenger && !isDriverRoute && (
        <div className="p-5 bg-surface rounded-[20px] border border-line shadow-soft space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-sky-100 dark:bg-surface-2 text-cobalt-500 flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-sm text-text">
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
              className="w-full h-11 px-3.5 bg-surface-2 border border-line rounded-[12px] text-xs font-mono text-text focus:outline-none focus:border-brand"
            />
            <input
              type="text"
              value={busRegNo}
              onChange={(e) => setBusRegNo(e.target.value.toUpperCase())}
              placeholder="Bus Registration Number (e.g. KA25 F 1234)"
              className="w-full h-11 px-3.5 bg-surface-2 border border-line rounded-[12px] text-xs font-mono font-bold text-text uppercase focus:outline-none focus:border-brand"
            />
            <select
              value={selectedRouteId}
              onChange={(e) => setSelectedRouteId(e.target.value)}
              className="w-full h-11 px-3 bg-surface-2 border border-line rounded-[12px] text-xs font-bold text-text focus:outline-none focus:border-brand"
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
      <div className="bg-surface rounded-[20px] border border-line shadow-soft divide-y divide-line overflow-hidden">
        {isDriverRoute ? (
          <>
            <Link
              to="/driver/bus"
              className="p-4 flex items-center justify-between hover:bg-surface-2 transition"
            >
              <div className="flex items-center gap-3">
                <Bus className="w-4 h-4 text-cobalt-500" />
                <span className="text-xs font-bold text-text">Assigned Bus & Route</span>
              </div>
              <span className="text-xs text-muted">&rarr;</span>
            </Link>

            <Link
              to="/driver/history"
              className="p-4 flex items-center justify-between hover:bg-surface-2 transition"
            >
              <div className="flex items-center gap-3">
                <KeyRound className="w-4 h-4 text-cobalt-500" />
                <span className="text-xs font-bold text-text">Shift Reports & History</span>
              </div>
              <span className="text-xs text-muted">&rarr;</span>
            </Link>
          </>
        ) : (
          <Link
            to="/complaints"
            className="p-4 flex items-center justify-between hover:bg-surface-2 transition"
          >
            <div className="flex items-center gap-3">
              <MessageSquare className="w-4 h-4 text-cobalt-500" />
              <span className="text-xs font-bold text-text">{t('nav.complaints') || 'Feedback & Complaints'}</span>
            </div>
            <span className="text-xs text-muted">&rarr;</span>
          </Link>
        )}

        <Link
          to="/help"
          className="p-4 flex items-center justify-between hover:bg-surface-2 transition"
        >
          <div className="flex items-center gap-3">
            <HelpCircle className="w-4 h-4 text-cobalt-500" />
            <span className="text-xs font-bold text-text">{t('nav.help') || 'Help & Support'}</span>
          </div>
          <span className="text-xs text-muted">&rarr;</span>
        </Link>
      </div>

      {/* 5. Logout Button */}
      <Button
        variant="danger"
        size="md"
        onClick={handleLogout}
        className="w-full h-12 text-sm font-bold font-heading shadow-soft"
      >
        <LogOut className="w-4 h-4 mr-1" />
        <span>{t('auth.logout') || 'Log out'}</span>
      </Button>
    </div>
  )
}
