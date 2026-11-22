import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Radio,
  Navigation,
  Footprints,
  IndianRupee,
  Users,
  Bookmark,
  Languages,
  WifiOff,
  ArrowRight,
  Download,
  ChevronDown,
  Globe,
  Github,
  Menu,
  X,
  Compass,
  Bus,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useDataStore } from '@/store/dataStore'
import { useLiveStore } from '@/store/liveStore'
import ThemeToggle from '@/components/ui/ThemeToggle'
import LanguageToggle from '@/components/ui/LanguageToggle'
import LiveDot from '@/components/ui/LiveDot'
import RoadRibbon from '@/components/ui/RoadRibbon'
import { PORTFOLIO_URL, GITHUB_URL, APK_URL, APK_VERSION, APK_SIZE } from '@/config/links'

export default function LandingPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { user, profile, loading: authLoading } = useAuthStore()
  const { routes, stops, initData } = useDataStore()
  const { subscribe, unsubscribe, getActiveCount } = useLiveStore()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [openFaqIndex, setOpenFaqIndex] = useState(null)

  // Redirect if logged in or native app
  useEffect(() => {
    if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()) {
      navigate('/explore', { replace: true })
      return
    }

    if (!authLoading && user) {
      if (profile?.role === 'driver') {
        navigate('/driver', { replace: true })
      } else {
        navigate('/explore', { replace: true })
      }
    }
  }, [user, profile, authLoading, navigate])

  // Initialize data for live stats strip
  useEffect(() => {
    initData()
    subscribe()
    return () => unsubscribe()
  }, [initData, subscribe, unsubscribe])

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg">
        <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const liveBusCount = getActiveCount()
  const routesCount = routes.length || 18
  const stopsCount = stops.length || 72

  const features = [
    {
      icon: Radio,
      title: t('landing.feature_live_title', 'Live bus tracking'),
      desc: t('landing.feature_live_desc', 'See exactly where your bus is in real time with smooth GPS updates.'),
    },
    {
      icon: Navigation,
      title: t('landing.feature_journey_title', 'Smart journey planner'),
      desc: t('landing.feature_journey_desc', 'Find the quickest route with transfers and departure times.'),
    },
    {
      icon: Footprints,
      title: t('landing.feature_nearby_title', 'Nearby stops & walking'),
      desc: t('landing.feature_nearby_desc', 'Walking routes to the closest bus stop with minutes and distance.'),
    },
    {
      icon: IndianRupee,
      title: t('landing.feature_fare_title', 'Fare calculator'),
      desc: t('landing.feature_fare_desc', 'Instant transparent fares based on NWKRTC distance slabs.'),
    },
    {
      icon: Users,
      title: t('landing.feature_crowd_title', 'Live crowd reports'),
      desc: t('landing.feature_crowd_desc', 'Know how crowded a bus is before boarding with crowd tags.'),
    },
    {
      icon: Bookmark,
      title: t('landing.feature_saved_title', 'Saved trips'),
      desc: t('landing.feature_saved_desc', 'Bookmark frequent commutes for one-tap departures.'),
    },
    {
      icon: Languages,
      title: t('landing.feature_bilingual_title', 'English & Kannada'),
      desc: t('landing.feature_bilingual_desc', 'Full bilingual interface designed for local riders.'),
    },
    {
      icon: WifiOff,
      title: t('landing.feature_offline_title', 'Works offline'),
      desc: t('landing.feature_offline_desc', 'Saved timetable and route maps stay accessible with low data.'),
    },
  ]

  const faqs = [
    {
      q: t('landing.faq_q1', 'Is Nammooru Bus free to use?'),
      a: t('landing.faq_a1', 'Yes, 100% free with no ads, tracking subscriptions or hidden fees.'),
    },
    {
      q: t('landing.faq_q2', 'Do I need an account to check bus timings?'),
      a: t('landing.faq_a2', 'No, anyone can search buses, check routes and view live maps as a guest without signing up.'),
    },
    {
      q: t('landing.faq_q3', 'How accurate is the live location?'),
      a: t('landing.faq_a3', 'Live locations update every few seconds directly from the on-duty driver phone GPS.'),
    },
    {
      q: t('landing.faq_q4', 'Does it work with slow or offline connections?'),
      a: t('landing.faq_a4', 'Yes, route timetables, stop lists and cached maps work even with spotty connectivity.'),
    },
    {
      q: t('landing.faq_q5', 'Which cities are supported?'),
      a: t('landing.faq_a5', 'Currently live for the Hubballi-Dharwad twin cities urban network.'),
    },
    {
      q: t('landing.faq_q6', 'How do drivers join the platform?'),
      a: t('landing.faq_a6', 'Drivers register with an authorised transit secret key to broadcast their active bus trip.'),
    },
  ]

  const toggleFaq = (idx) => {
    setOpenFaqIndex(openFaqIndex === idx ? null : idx)
  }

  return (
    <div className="min-h-screen bg-bg text-text font-body selection:bg-brand selection:text-white flex flex-col">
      {/* 1. Sticky Top Navigation Bar */}
      <header className="sticky top-0 z-50 h-16 bg-surface/90 backdrop-blur-md border-b border-line px-4 sm:px-6 md:px-8 flex items-center justify-between transition-colors">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5 select-none group">
            {/* White-box logo: 40px, radius 12, kept across all themes */}
            <div className="w-10 h-10 rounded-[12px] bg-white overflow-hidden p-0.5 flex items-center justify-center shadow-xs shrink-0">
              <img
                src="/brand/logo-mark.png"
                alt="Nammooru Bus Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="font-heading text-lg sm:text-xl font-extrabold tracking-tight whitespace-nowrap">
              <span className="text-text">Nammooru</span>
              <span className="text-brand ml-0.5">Bus</span>
            </span>
          </Link>
        </div>

        {/* Desktop Anchor Links */}
        <nav className="hidden lg:flex items-center gap-6 text-xs font-heading font-bold text-muted">
          <a href="#features" className="hover:text-text transition-colors">
            {t('landing.nav_features', 'Features')}
          </a>
          <a href="#how-it-works" className="hover:text-text transition-colors">
            {t('landing.nav_how_it_works', 'How it works')}
          </a>
          <a href="#roles" className="hover:text-text transition-colors">
            {t('landing.nav_roles', 'Roles')}
          </a>
          <a href="#app" className="hover:text-text transition-colors">
            {t('landing.nav_app', 'App')}
          </a>
          <a href="#faq" className="hover:text-text transition-colors">
            {t('landing.nav_faq', 'FAQ')}
          </a>
        </nav>

        {/* Controls & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <div className="hidden sm:block">
            <LanguageToggle />
          </div>

          <Link
            to="/login"
            className="hidden md:inline-flex items-center justify-center min-h-[38px] px-3.5 py-1.5 rounded-full text-xs font-heading font-bold text-text hover:bg-surface-2 transition active:scale-95"
          >
            {t('auth.sign_in', 'Sign in')}
          </Link>

          <Link
            to="/explore"
            className="inline-flex items-center justify-center min-h-[38px] px-4 py-1.5 rounded-full text-xs font-heading font-bold on-brand shadow-xs hover:opacity-95 transition active:scale-95"
            style={{ background: 'var(--gradient-brand)', color: 'var(--on-brand)' }}
          >
            <span style={{ color: 'var(--on-brand)' }}>{t('landing.open_app', 'Open app')}</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" style={{ color: 'var(--on-brand)' }} />
          </Link>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
            className="lg:hidden p-2 rounded-full text-muted hover:text-text hover:bg-surface-2 transition"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Slide-Over Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-surface border-b border-line px-5 py-4 flex flex-col gap-3 shadow-lg z-40"
          >
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <span className="text-xs font-bold text-muted uppercase tracking-wider">Navigation</span>
              <LanguageToggle />
            </div>
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-semibold text-text py-1.5 hover:text-brand"
            >
              {t('landing.nav_features', 'Features')}
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-semibold text-text py-1.5 hover:text-brand"
            >
              {t('landing.nav_how_it_works', 'How it works')}
            </a>
            <a
              href="#roles"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-semibold text-text py-1.5 hover:text-brand"
            >
              {t('landing.nav_roles', 'Roles')}
            </a>
            <a
              href="#app"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-semibold text-text py-1.5 hover:text-brand"
            >
              {t('landing.nav_app', 'App')}
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-semibold text-text py-1.5 hover:text-brand"
            >
              {t('landing.nav_faq', 'FAQ')}
            </a>

            <div className="pt-2 border-t border-line flex flex-col gap-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-[44px] w-full flex items-center justify-center rounded-full border border-line text-sm font-bold text-text hover:bg-surface-2 transition"
              >
                {t('auth.sign_in', 'Sign in')}
              </Link>
              <Link
                to="/explore"
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-[44px] w-full flex items-center justify-center rounded-full text-sm font-bold on-brand shadow-xs transition"
                style={{ background: 'var(--gradient-brand)', color: 'var(--on-brand)' }}
              >
                {t('landing.open_app', 'Open app')}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1">
        {/* 2. Hero Section */}
        <section
          className="relative overflow-hidden pt-8 pb-20 md:pt-16 md:pb-28 px-4 sm:px-6 md:px-8 on-brand"
          style={{ background: 'var(--grad-brand)', color: 'var(--on-brand)' }}
        >
          {/* Subtle Decorative N Slabs: two soft rounded "N" slabs at 8 percent white */}
          <div
            className="absolute top-10 left-10 w-72 h-72 rounded-[40px] pointer-events-none"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', transform: 'rotate(-12deg)' }}
          />
          <div
            className="absolute bottom-10 right-10 w-96 h-96 rounded-[56px] pointer-events-none"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', transform: 'rotate(6deg)' }}
          />

          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center relative z-10">
            {/* Left Column: Headings & CTAs */}
            <div className="lg:col-span-7 flex flex-col items-start text-left text-white">
              <div
                className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full mb-4 select-none"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)' }}
              >
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--amber)' }} />
                <span className="text-xs font-extrabold uppercase tracking-wider font-heading" style={{ color: 'var(--amber)' }}>
                  {t('landing.city_tag', 'Hubballi-Dharwad')}
                </span>
              </div>

              <h1 className="font-heading font-extrabold text-3xl sm:text-5xl lg:text-6xl text-white tracking-tight leading-[1.1] mb-4">
                {t('landing.hero_title', 'Our town. Our bus.')}
              </h1>

              <p className="text-base sm:text-lg max-w-xl leading-relaxed mb-8" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>
                {t('landing.hero_subtitle', 'Live bus locations, smart routes and fares for your city. Free.')}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                <Link
                  to="/explore"
                  className="min-h-[48px] px-6 py-3 rounded-full font-heading font-extrabold text-sm shadow-soft flex items-center justify-center gap-2 transition active:scale-95 select-none"
                  style={{ backgroundColor: '#FFFFFF', color: '#00136E' }}
                >
                  <Compass className="w-4 h-4" style={{ color: '#0040FF' }} />
                  <span style={{ color: '#00136E' }}>{t('landing.continue_guest', 'Continue as guest')}</span>
                </Link>

                <Link
                  to="/login"
                  className="min-h-[48px] px-5 py-3 rounded-full border-2 text-white font-heading font-bold text-sm flex items-center justify-center transition active:scale-95 select-none hover:bg-white/12"
                  style={{ borderColor: '#FFFFFF', color: '#FFFFFF' }}
                >
                  <span style={{ color: '#FFFFFF' }}>{t('auth.sign_in', 'Sign in')}</span>
                </Link>

                <Link
                  to="/register"
                  className="min-h-[48px] px-5 py-3 rounded-full border-2 text-white font-heading font-bold text-sm flex items-center justify-center transition active:scale-95 select-none hover:bg-white/12"
                  style={{ borderColor: '#FFFFFF', color: '#FFFFFF' }}
                >
                  <span style={{ color: '#FFFFFF' }}>{t('auth.sign_up', 'Create account')}</span>
                </Link>
              </div>

              <p className="text-xs mt-3 flex items-center gap-1.5 select-none" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>
                <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'rgba(255, 255, 255, 0.85)' }} />
                <span>{t('landing.no_signup_needed', 'No sign up needed to look up buses')}</span>
              </p>
            </div>

            {/* Right Column: Phone Frame App Preview - Fixed Light Colors in All Themes */}
            <div className="lg:col-span-5 flex justify-center">
              <div
                className="relative w-full max-w-[320px] rounded-[36px] p-3.5 shadow-2xl border-4 select-none"
                style={{ backgroundColor: '#FFFFFF', borderColor: 'rgba(255, 255, 255, 0.35)' }}
              >
                <div
                  className="w-full rounded-[24px] overflow-hidden border p-3 flex flex-col gap-3"
                  style={{ backgroundColor: '#F2F6FF', borderColor: '#D9E2F7' }}
                >
                  {/* Top Bar Preview */}
                  <div className="flex items-center justify-between pb-2" style={{ borderBottom: '1px solid #D9E2F7' }}>
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-md bg-white p-0.5 shadow-xs flex items-center justify-center">
                        <img src="/brand/logo-mark.png" alt="Logo" className="w-full h-full object-contain" />
                      </div>
                      <span className="font-heading font-bold text-xs" style={{ color: '#050F45' }}>Nammooru Bus</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(255, 180, 0, 0.18)', color: '#00136E' }}>
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: '#FFB400' }} />
                      <span style={{ color: '#00136E' }}>LIVE</span>
                    </div>
                  </div>

                  {/* Search Card Mini */}
                  <div
                    className="p-3 rounded-[16px] border shadow-xs flex flex-col gap-2"
                    style={{ backgroundColor: '#FFFFFF', borderColor: '#D9E2F7' }}
                  >
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#12A150' }} />
                      <span className="font-semibold truncate" style={{ color: '#050F45' }}>CBT Hubballi</span>
                    </div>
                    <div className="w-0.5 h-2 ml-1" style={{ backgroundColor: '#D9E2F7' }} />
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#0040FF' }} />
                      <span className="font-semibold truncate" style={{ color: '#050F45' }}>Dharwad Old Bus Stand</span>
                    </div>
                  </div>

                  {/* Route Card Mini */}
                  <div
                    className="p-3 rounded-[16px] border shadow-xs flex items-center justify-between"
                    style={{ backgroundColor: '#FFFFFF', borderColor: '#D9E2F7' }}
                  >
                    <div>
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-extrabold"
                        style={{ backgroundColor: '#0040FF', color: '#FFFFFF' }}
                      >
                        200A
                      </span>
                      <p className="text-[11px] font-bold mt-1" style={{ color: '#050F45' }}>Direct via BRTS Corridor</p>
                      <p className="text-[10px]" style={{ color: '#5B6591' }}>Next bus in 4 min • ₹28</p>
                    </div>
                    <ArrowRight className="w-4 h-4" style={{ color: '#0040FF' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Signature smooth RoadRibbon SVG at bottom */}
          <RoadRibbon />
        </section>

        {/* 3. Live Stats Strip */}
        <section className="bg-surface border-b border-line py-5 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            {/* Live Buses */}
            <div className="flex flex-col items-center justify-center p-3 rounded-[20px] bg-surface-2 border border-line">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber animate-pulse" />
                <span className="font-heading font-extrabold text-2xl text-text">
                  {liveBusCount}
                </span>
              </div>
              <span className="text-xs font-bold text-muted uppercase tracking-wider mt-0.5">
                {t('landing.live_buses', 'Buses live now')}
              </span>
              {liveBusCount === 0 && (
                <span className="text-[10px] text-muted mt-1">
                  {t('landing.buses_appear_here', 'Buses appear here when drivers start a trip')}
                </span>
              )}
            </div>

            {/* Routes Count */}
            <div className="flex flex-col items-center justify-center p-3 rounded-[20px] bg-surface-2 border border-line">
              <span className="font-heading font-extrabold text-2xl text-text">
                {routesCount}
              </span>
              <span className="text-xs font-bold text-muted uppercase tracking-wider mt-0.5">
                {t('landing.routes_count', 'Routes')}
              </span>
              <span className="text-[10px] text-muted mt-1">Twin cities network coverage</span>
            </div>

            {/* Stops Count */}
            <div className="flex flex-col items-center justify-center p-3 rounded-[20px] bg-surface-2 border border-line">
              <span className="font-heading font-extrabold text-2xl text-text">
                {stopsCount}
              </span>
              <span className="text-xs font-bold text-muted uppercase tracking-wider mt-0.5">
                {t('landing.stops_count', 'Stops covered')}
              </span>
              <span className="text-[10px] text-muted mt-1">Geo-coded with road snapping</span>
            </div>
          </div>
        </section>

        {/* 4. Features Grid (8 Cards) */}
        <section id="features" className="py-16 px-4 sm:px-6 md:px-8 max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-heading font-extrabold text-2xl sm:text-4xl text-text tracking-tight">
              Everything you need for your city ride
            </h2>
            <p className="text-sm text-muted mt-2">
              Designed from the ground up for daily commuters in Hubballi and Dharwad.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((feat, idx) => {
              const Icon = feat.icon
              return (
                <div
                  key={idx}
                  className="p-5 bg-surface rounded-[20px] border border-line shadow-card hover:border-brand/40 transition-all flex flex-col gap-3 group"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center on-brand shadow-xs group-hover:scale-105 transition-transform"
                    style={{ background: 'var(--gradient-brand)', color: 'var(--on-brand)' }}
                  >
                    <Icon className="w-5 h-5" style={{ color: 'var(--on-brand)' }} />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-sm text-text">
                      {feat.title}
                    </h3>
                    <p className="text-xs text-muted leading-relaxed mt-1">
                      {feat.desc}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* 5. How It Works (3 Steps) */}
        <section id="how-it-works" className="py-16 px-4 sm:px-6 md:px-8 bg-surface-2/40 border-y border-line">
          <div className="max-w-6xl mx-auto">
            <div className="text-center max-w-xl mx-auto mb-12">
              <h2 className="font-heading font-extrabold text-2xl sm:text-4xl text-text tracking-tight">
                {t('landing.how_title', 'How it works')}
              </h2>
              <p className="text-sm text-muted mt-2">
                Three effortless steps from where you are to where you need to be.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              {/* Step 1 */}
              <div className="p-6 bg-surface rounded-[24px] border border-line shadow-card flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-amber/20 text-navy-900 flex items-center justify-center font-heading font-extrabold text-base text-amber">
                  1
                </div>
                <h3 className="font-heading font-bold text-base text-text">
                  {t('landing.step_1_title', 'Pick From and To')}
                </h3>
                <p className="text-xs text-muted leading-relaxed">
                  {t('landing.step_1_desc', 'Choose your origin and destination stops or use your location.')}
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-6 bg-surface rounded-[24px] border border-line shadow-card flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-brand/20 text-brand flex items-center justify-center font-heading font-extrabold text-base">
                  2
                </div>
                <h3 className="font-heading font-bold text-base text-text">
                  {t('landing.step_2_title', 'See buses and best way')}
                </h3>
                <p className="text-xs text-muted leading-relaxed">
                  {t('landing.step_2_desc', 'Compare direct routes, walking times and estimated fares.')}
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-6 bg-surface rounded-[24px] border border-line shadow-card flex flex-col items-center text-center gap-3">
                <div
                  className="w-12 h-12 rounded-full on-brand flex items-center justify-center font-heading font-extrabold text-base shadow-xs"
                  style={{ background: 'var(--gradient-brand)', color: 'var(--on-brand)' }}
                >
                  3
                </div>
                <h3 className="font-heading font-bold text-base text-text">
                  {t('landing.step_3_title', 'Track your bus live')}
                </h3>
                <p className="text-xs text-muted leading-relaxed">
                  {t('landing.step_3_desc', 'Follow the live bus on the road map until it reaches your stop.')}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Roles Section (Passengers / Drivers / Admins) */}
        <section id="roles" className="py-16 px-4 sm:px-6 md:px-8 max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-heading font-extrabold text-2xl sm:text-4xl text-text tracking-tight">
              {t('landing.roles_title', 'Built for everyone in the city')}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Passengers */}
            <div className="p-6 bg-surface rounded-[24px] border border-line shadow-card flex flex-col justify-between gap-6">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand px-2.5 py-1 rounded-full bg-surface-2 border border-line">
                  Riders
                </span>
                <h3 className="font-heading font-extrabold text-lg text-text mt-3">
                  {t('landing.role_passenger_title', 'For Passengers')}
                </h3>
                <p className="text-xs text-muted mt-2 leading-relaxed">
                  {t('landing.role_passenger_desc', 'Check live arrivals, plan routes, and travel with peace of mind.')}
                </p>
              </div>
              <Link
                to="/explore"
                className="min-h-[44px] px-4 py-2 rounded-full border border-line bg-surface-2 hover:border-brand text-xs font-bold text-text flex items-center justify-center gap-1.5 transition active:scale-95"
              >
                <span>{t('landing.open_app', 'Open app')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Drivers */}
            <div className="p-6 bg-surface rounded-[24px] border-2 border-brand shadow-card flex flex-col justify-between gap-6">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber px-2.5 py-1 rounded-full bg-amber/15 border border-amber/30">
                  Drivers
                </span>
                <h3 className="font-heading font-extrabold text-lg text-text mt-3">
                  {t('landing.role_driver_title', 'For Drivers')}
                </h3>
                <p className="text-xs text-muted mt-2 leading-relaxed">
                  {t('landing.role_driver_desc', 'Share your bus location, view your routes and track your trip logs.')}
                </p>
              </div>
              <Link
                to="/register"
                className="min-h-[44px] px-4 py-2 rounded-full text-xs font-bold on-brand flex items-center justify-center gap-1.5 transition active:scale-95 shadow-xs"
                style={{ background: 'var(--gradient-brand)', color: 'var(--on-brand)' }}
              >
                <span style={{ color: 'var(--on-brand)' }}>{t('landing.role_driver_btn', 'Sign up as driver')}</span>
                <ArrowRight className="w-3.5 h-3.5" style={{ color: 'var(--on-brand)' }} />
              </Link>
            </div>

            {/* Transit Admins */}
            <div className="p-6 bg-surface rounded-[24px] border border-line shadow-card flex flex-col justify-between gap-6">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted px-2.5 py-1 rounded-full bg-surface-2 border border-line">
                  Transit Admins
                </span>
                <h3 className="font-heading font-extrabold text-lg text-text mt-3">
                  {t('landing.role_admin_title', 'For Transit Admins')}
                </h3>
                <p className="text-xs text-muted mt-2 leading-relaxed">
                  {t('landing.role_admin_desc', 'Manage routes, timetables, fleet, fares and rider alerts.')}
                </p>
              </div>
              <Link
                to="/admin/login"
                className="min-h-[44px] px-4 py-2 rounded-full border border-line bg-surface-2 hover:border-brand text-xs font-bold text-text flex items-center justify-center gap-1.5 transition active:scale-95"
              >
                <span>Admin portal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* 7. Android App Section */}
        <section id="app" className="py-16 px-4 sm:px-6 md:px-8 bg-surface border-y border-line">
          <div className="max-w-4xl mx-auto rounded-[32px] p-8 sm:p-12 border border-line flex flex-col md:flex-row items-center justify-between gap-8 bg-surface-2 shadow-card">
            <div className="max-w-md text-left">
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand px-2.5 py-1 rounded-full bg-surface border border-line">
                Mobile Experience
              </span>
              <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-text tracking-tight mt-3">
                {t('landing.app_title', 'Get the Nammooru Bus app')}
              </h2>
              <p className="text-xs sm:text-sm text-muted mt-2 leading-relaxed">
                {t('landing.app_subtitle', 'Fast, responsive live tracking right on your Android phone.')}
              </p>

              <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                {APK_URL ? (
                  <a
                    href={APK_URL}
                    download
                    className="min-h-[44px] px-6 py-2.5 rounded-full text-xs font-bold on-brand flex items-center justify-center gap-2 shadow-xs transition active:scale-95"
                    style={{ background: 'var(--gradient-brand)', color: 'var(--on-brand)' }}
                  >
                    <Download className="w-4 h-4" style={{ color: 'var(--on-brand)' }} />
                    <span style={{ color: 'var(--on-brand)' }}>
                      {t('landing.app_download', 'Download APK')}{' '}
                      {APK_VERSION && `(v${APK_VERSION})`}
                      {APK_SIZE && ` • ${APK_SIZE}`}
                    </span>
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="min-h-[44px] px-6 py-2.5 rounded-full text-xs font-bold bg-surface border border-line text-muted cursor-not-allowed flex items-center gap-2 opacity-75"
                  >
                    <Download className="w-4 h-4" />
                    <span>{t('landing.app_coming_soon', 'Coming soon')}</span>
                  </button>
                )}
              </div>

              <p className="text-[11px] text-muted mt-2.5">
                {APK_URL
                  ? t('landing.app_install_note', 'Allow installs from this source, then open the file')
                  : t('landing.app_note', 'Android app launching soon')}
              </p>
            </div>

            <div className="w-40 h-40 sm:w-52 sm:h-52 rounded-[28px] bg-surface border border-line p-4 flex flex-col items-center justify-center text-center shadow-soft">
              <div
                className="w-16 h-16 rounded-[20px] flex items-center justify-center on-brand mb-3 shadow-xs"
                style={{ background: 'var(--gradient-brand)', color: 'var(--on-brand)' }}
              >
                <Bus className="w-8 h-8" style={{ color: 'var(--on-brand)' }} />
              </div>
              <span className="font-heading font-extrabold text-xs text-text">Nammooru Bus APK</span>
              <span className="text-[10px] text-muted mt-0.5">Built with Capacitor</span>
            </div>
          </div>
        </section>

        {/* 8. FAQ Accordion (6 Questions) */}
        <section id="faq" className="py-16 px-4 sm:px-6 md:px-8 max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-text tracking-tight">
              {t('landing.faq_title', 'Frequently Asked Questions')}
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx
              return (
                <div
                  key={idx}
                  className="bg-surface rounded-[20px] border border-line overflow-hidden shadow-xs transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(idx)}
                    className="w-full min-h-[52px] px-5 py-3.5 flex items-center justify-between text-left gap-4 cursor-pointer"
                  >
                    <span className="font-heading font-bold text-sm text-text">
                      {faq.q}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-muted transition-transform shrink-0 ${
                        isOpen ? 'rotate-180 text-brand' : ''
                      }`}
                    />
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="px-5 pb-4 text-xs text-muted leading-relaxed border-t border-line/40 pt-2"
                      >
                        {faq.a}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        </section>
      </main>

      {/* 9. Footer */}
      <footer className="bg-surface border-t border-line pt-12 pb-8 px-4 sm:px-6 md:px-8">
        <div className="max-w-6xl mx-auto flex flex-col gap-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-line">
            {/* Brand Logo & Tagline */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[12px] bg-white overflow-hidden p-0.5 flex items-center justify-center shadow-xs shrink-0">
                <img src="/brand/logo-mark.png" alt="Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <span className="font-heading font-extrabold text-base text-text">
                  Nammooru Bus
                </span>
                <p className="text-xs text-muted">
                  {t('landing.footer_tagline', 'Our town. Our bus.')}
                </p>
              </div>
            </div>

            {/* Quick Links */}
            <div className="flex items-center gap-6 text-xs font-semibold text-muted">
              <Link to="/explore" className="hover:text-text transition-colors">
                {t('landing.open_app', 'Open app')}
              </Link>
              <Link to="/live" className="hover:text-text transition-colors">
                Live Map
              </Link>
              <Link to="/routes" className="hover:text-text transition-colors">
                Routes
              </Link>
              <Link to="/nearby" className="hover:text-text transition-colors">
                Nearby
              </Link>
              <Link to="/login" className="hover:text-text transition-colors">
                {t('auth.sign_in', 'Sign in')}
              </Link>
            </div>

            {/* Language Switch */}
            <div>
              <LanguageToggle />
            </div>
          </div>

          {/* Credits & External Links */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted">
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
              <span className="font-bold text-text">
                {t('landing.footer_credit', 'Built by Manthan Patel')}
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={PORTFOLIO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Manthan Patel Portfolio"
                  className="min-h-[44px] px-3.5 py-1.5 rounded-full border border-line bg-surface-2 hover:border-brand text-text font-bold text-xs flex items-center gap-1.5 transition active:scale-95"
                >
                  <Globe className="w-3.5 h-3.5 text-brand" />
                  <span>{t('landing.footer_portfolio', 'Portfolio')}</span>
                </a>

                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Manthan Patel GitHub"
                  className="min-h-[44px] px-3.5 py-1.5 rounded-full border border-line bg-surface-2 hover:border-brand text-text font-bold text-xs flex items-center gap-1.5 transition active:scale-95"
                >
                  <Github className="w-3.5 h-3.5 text-text" />
                  <span>{t('landing.footer_github', 'GitHub')}</span>
                </a>
              </div>
            </div>

            <div className="flex items-center gap-3 text-center sm:text-right">
              <span>{t('landing.footer_rights', '© 2026 Nammooru Bus. All rights reserved.')}</span>
              <span>&bull;</span>
              <span className="font-mono text-[11px] text-muted">
                {t('landing.footer_vtu', 'VTU project 1BCS308')}
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
