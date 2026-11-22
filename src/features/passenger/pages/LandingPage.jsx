import { useState, useEffect, useRef, useId } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useReducedMotion,
  useInView,
  MotionConfig,
  LayoutGroup,
} from 'framer-motion'
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
  ArrowUp,
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
import RoadRibbon from '@/components/ui/RoadRibbon'
import { PORTFOLIO_URL, GITHUB_URL, APK_URL, APK_VERSION, APK_SIZE } from '@/config/links'

/**
 * AnimatedNumber — counts up from 0 to target when in view
 */
function AnimatedNumber({ value, duration = 1200, enabled = true }) {
  const [count, setCount] = useState(enabled ? 0 : value)
  const prefersReduced = useReducedMotion()

  useEffect(() => {
    if (prefersReduced || !enabled) {
      setCount(value)
      return
    }

    let startTimestamp = null
    const startVal = 0
    let frameId

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp
      const progress = Math.min((timestamp - startTimestamp) / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3) // cubic ease-out
      setCount(Math.floor(startVal + (value - startVal) * ease))
      if (progress < 1) {
        frameId = requestAnimationFrame(step)
      } else {
        setCount(value)
      }
    }

    frameId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frameId)
  }, [value, duration, enabled, prefersReduced])

  return <span>{count}</span>
}

/**
 * RollingEta — ticks ETA digit inside phone preview card
 */
function RollingEta() {
  const [minutes, setMinutes] = useState(4)
  const prefersReduced = useReducedMotion()

  useEffect(() => {
    if (prefersReduced) return
    const interval = setInterval(() => {
      setMinutes((prev) => (prev === 4 ? 3 : prev === 3 ? 5 : 4))
    }, 4500)
    return () => clearInterval(interval)
  }, [prefersReduced])

  return (
    <span className="inline-flex items-center overflow-hidden h-[15px] align-baseline">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={minutes}
          initial={prefersReduced ? {} : { y: 10, opacity: 0 }}
          animate={prefersReduced ? {} : { y: 0, opacity: 1 }}
          exit={prefersReduced ? {} : { y: -10, opacity: 0 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          className="font-bold text-[10px]"
          style={{ color: '#5B6591' }}
        >
          {minutes}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

export default function LandingPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, profile, loading: authLoading } = useAuthStore()
  const { routes, stops, initData } = useDataStore()
  const { subscribe, unsubscribe, getActiveCount } = useLiveStore()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [openFaqIndex, setOpenFaqIndex] = useState(null)
  const [activeSection, setActiveSection] = useState(null)
  const [scrolled, setScrolled] = useState(false)
  const [showBackToTop, setShowBackToTop] = useState(false)

  const ignoreObserverRef = useRef(0)
  const statsRef = useRef(null)
  const howItWorksRef = useRef(null)
  const statsInView = useInView(statsRef, { once: true, amount: 0.2 })

  const prefersReduced = useReducedMotion()
  const { scrollY, scrollYProgress } = useScroll()
  const navLayoutId = useId()

  // Parallax for soft N slabs in hero
  const slab1Y = useTransform(scrollY, [0, 600], [0, prefersReduced ? 0 : -35])
  const slab2Y = useTransform(scrollY, [0, 600], [0, prefersReduced ? 0 : 40])

  // Scroll linked progress for How It Works connecting line
  const { scrollYProgress: howItWorksProgress } = useScroll({
    target: howItWorksRef,
    offset: ['start 85%', 'center center'],
  })

  // Scoped smooth scroll class on <html>
  useEffect(() => {
    document.documentElement.classList.add('landing-smooth-scroll')
    return () => {
      document.documentElement.classList.remove('landing-smooth-scroll')
    }
  }, [])

  // Top bar scrolled state & back-to-top trigger
  useEffect(() => {
    return scrollY.on('change', (latest) => {
      setScrolled(latest > 8)
      setShowBackToTop(latest > 600)
    })
  }, [scrollY])

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

  // Active section scroll-spy via IntersectionObserver
  useEffect(() => {
    const sectionIds = ['features', 'how-it-works', 'roles', 'app', 'faq']
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter(Boolean)

    const observer = new IntersectionObserver(
      (entries) => {
        if (Date.now() < ignoreObserverRef.current) return

        // At top of page: no section active
        if (window.scrollY < 200) {
          setActiveSection(null)
          return
        }

        // At bottom of page: FAQ is active
        if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 60) {
          setActiveSection('faq')
          return
        }

        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
          }
        })
      },
      { rootMargin: '-45% 0px -50% 0px' }
    )

    elements.forEach((el) => observer.observe(el))

    const handleScrollCheck = () => {
      if (Date.now() < ignoreObserverRef.current) return
      if (window.scrollY < 200) {
        setActiveSection(null)
      } else if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 60) {
        setActiveSection('faq')
      }
    }

    window.addEventListener('scroll', handleScrollCheck, { passive: true })

    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', handleScrollCheck)
    }
  }, [])

  // Initial mount with URL hash: smooth scroll to section
  useEffect(() => {
    if (window.location.hash) {
      const hashId = window.location.hash.replace('#', '')
      const timer = setTimeout(() => {
        const el = document.getElementById(hashId)
        if (el) {
          el.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth' })
          setActiveSection(hashId)
        }
      }, 350)
      return () => clearTimeout(timer)
    }
  }, [prefersReduced])

  const scrollToSection = (id) => {
    setActiveSection(id)
    ignoreObserverRef.current = Date.now() + 750
    history.replaceState(null, '', '#' + id)
    setMobileMenuOpen(false)

    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth' })
    }
  }

  const liveBusCount = getActiveCount()
  const routesCount = routes.length || 18
  const stopsCount = stops.length || 72

  const navItems = [
    { id: 'features', label: t('landing.nav_features', 'Features') },
    { id: 'how-it-works', label: t('landing.nav_how_it_works', 'How it works') },
    { id: 'roles', label: t('landing.nav_roles', 'Roles') },
    { id: 'app', label: t('landing.nav_app', 'App') },
    { id: 'faq', label: t('landing.nav_faq', 'FAQ') },
  ]

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

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg">
        <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Split headline lines cleanly without breaking Kannada ligature shaping
  const headlineRaw = t('landing.hero_title', 'Our town. Our bus.')
  const headlineLines = headlineRaw.includes('\n')
    ? headlineRaw.split('\n')
    : headlineRaw.includes('.')
      ? headlineRaw.split('.').filter(Boolean).map((s) => s.trim() + '.')
      : [headlineRaw]

  return (
    <MotionConfig reducedMotion="user">
      <div className="landing-root min-h-screen bg-bg text-text font-body selection:bg-brand selection:text-white flex flex-col relative">
        {/* Skip to Content for Keyboard Accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[70] px-4 py-2 bg-brand text-white font-bold rounded-full shadow-lg"
        >
          Skip to content
        </a>

        {/* Scroll Progress Bar at very top: 3px amber */}
        <motion.div
          className="fixed top-0 left-0 right-0 h-[3px] z-[60] origin-left pointer-events-none"
          style={{
            scaleX: scrollYProgress,
            background: 'var(--amber)',
          }}
          aria-hidden="true"
        />

        {/* 1. Sticky Top Navigation Bar with Scrolled Transition */}
        <header
          className={`sticky top-0 z-50 transition-all duration-200 ${scrolled
            ? 'h-15 sm:h-16 shadow-md bg-surface/95 backdrop-blur-md'
            : 'h-18 sm:h-20 shadow-none bg-surface/90 backdrop-blur-md'
            } border-b border-line px-4 sm:px-6 md:px-8 flex items-center justify-between`}
        >
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 select-none group">
              {/* White-box logo: 40px, radius 12, kept across all themes */}
              <div className="w-10 h-10 rounded-[12px] bg-white overflow-hidden p-0.5 flex items-center justify-center shadow-xs shrink-0">
                <img
                  src="/brand/logo-mark.png"
                  alt="Nammooru Bus Logo"
                  className="w-full h-full object-contain"
                  width="40"
                  height="40"
                />
              </div>
              <span className="font-heading text-lg sm:text-xl font-extrabold tracking-tight whitespace-nowrap">
                <span className="text-text">Nammooru</span>
                <span className="text-brand ml-0.5">Bus</span>
              </span>
            </Link>
          </div>

          {/* Desktop Anchor Links with Scroll-Spy & Sliding Pill Indicator */}
          <LayoutGroup id={navLayoutId}>
            <nav
              aria-label="Landing Page Navigation"
              className="hidden lg:flex items-center gap-1 p-1 rounded-full bg-surface-2/70 border border-line/60"
            >
              {navItems.map((item) => {
                const isActive = activeSection === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => scrollToSection(item.id)}
                    aria-current={isActive ? 'true' : undefined}
                    className={`relative px-4 py-1.5 rounded-full text-xs font-heading font-bold transition-colors select-none ${isActive ? 'text-white' : 'text-muted hover:text-text'
                      }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="landing-active-nav-pill"
                        className="absolute inset-0 rounded-full z-0 on-brand shadow-xs"
                        style={{ background: 'var(--grad-brand)' }}
                        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10">{item.label}</span>
                  </button>
                )
              })}
            </nav>
          </LayoutGroup>

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
              style={{ background: 'var(--grad-brand)', color: 'var(--on-brand)' }}
            >
              <span style={{ color: 'var(--on-brand)' }}>{t('landing.open_app', 'Open app')}</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" style={{ color: 'var(--on-brand)' }} />
            </Link>

            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle Navigation Menu"
              aria-expanded={mobileMenuOpen}
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
              className="lg:hidden bg-surface border-b border-line px-5 py-4 flex flex-col gap-2.5 shadow-lg z-40 overflow-hidden"
            >
              <div className="flex items-center justify-between pb-3 border-b border-line">
                <span className="text-xs font-bold text-muted uppercase tracking-wider">Navigation</span>
                <LanguageToggle />
              </div>

              {navItems.map((item) => {
                const isActive = activeSection === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => scrollToSection(item.id)}
                    aria-current={isActive ? 'true' : undefined}
                    className={`w-full text-left px-3 py-2 rounded-xl text-sm font-bold transition flex items-center justify-between ${isActive ? 'on-brand text-white font-extrabold' : 'text-text hover:bg-surface-2'
                      }`}
                    style={isActive ? { background: 'var(--grad-brand)', color: 'var(--on-brand)' } : {}}
                  >
                    <span>{item.label}</span>
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-amber" />}
                  </button>
                )
              })}

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
                  style={{ background: 'var(--grad-brand)', color: 'var(--on-brand)' }}
                >
                  {t('landing.open_app', 'Open app')}
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <main id="main-content" tabIndex="-1" className="flex-1 outline-none">
          {/* 2. Hero Section */}
          <section
            className="relative overflow-hidden pt-8 pb-20 md:pt-16 md:pb-28 px-4 sm:px-6 md:px-8 on-brand"
            style={{ background: 'var(--grad-brand)', color: 'var(--on-brand)' }}
          >
            {/* Parallax N Slabs */}
            <motion.div
              style={{ y: slab1Y }}
              className="absolute top-10 left-10 w-72 h-72 rounded-[40px] pointer-events-none"
              aria-hidden="true"
            >
              <div
                className="w-full h-full rounded-[40px]"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', transform: 'rotate(-12deg)' }}
              />
            </motion.div>
            <motion.div
              style={{ y: slab2Y }}
              className="absolute bottom-10 right-10 w-96 h-96 rounded-[56px] pointer-events-none"
              aria-hidden="true"
            >
              <div
                className="w-full h-full rounded-[56px]"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', transform: 'rotate(6deg)' }}
              />
            </motion.div>

            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center relative z-10">
              {/* Left Column: Headings & CTAs */}
              <div className="lg:col-span-7 flex flex-col items-start text-left text-white">
                <motion.div
                  initial={prefersReduced ? {} : { opacity: 0, y: 16 }}
                  animate={prefersReduced ? {} : { opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full mb-4 select-none"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)' }}
                >
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#FFB400' }} />
                  <span className="text-amber text-xs font-extrabold uppercase tracking-wider font-heading on-amber">
                    {t('landing.city_tag', 'Hubballi-Dharwad')}
                  </span>
                </motion.div>

                {/* Staggered headline lines */}
                <h1 className="font-heading font-extrabold text-3xl sm:text-5xl lg:text-6xl text-white tracking-tight leading-[1.1] mb-4">
                  {headlineLines.map((line, idx) => (
                    <motion.span
                      key={idx}
                      className="block"
                      initial={prefersReduced ? {} : { opacity: 0, y: 24 }}
                      animate={prefersReduced ? {} : { opacity: 1, y: 0 }}
                      transition={{
                        delay: idx * 0.08,
                        duration: 0.5,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    >
                      {line}
                    </motion.span>
                  ))}
                </h1>

                <motion.p
                  initial={prefersReduced ? {} : { opacity: 0, y: 16 }}
                  animate={prefersReduced ? {} : { opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="text-base sm:text-lg max-w-xl leading-relaxed mb-8"
                  style={{ color: 'rgba(255, 255, 255, 0.85)' }}
                >
                  {t('landing.hero_subtitle', 'Live bus locations, smart routes and fares for your city. Free.')}
                </motion.p>

                {/* Action Buttons */}
                <motion.div
                  initial={prefersReduced ? {} : { opacity: 0, y: 16 }}
                  animate={prefersReduced ? {} : { opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto"
                >
                  <Link
                    to="/explore"
                    className="min-h-[48px] px-6 py-3 rounded-full font-heading font-extrabold text-sm shadow-soft flex items-center justify-center gap-2 transition active:scale-95 select-none hover:bg-white/95"
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
                </motion.div>

                <p className="text-xs mt-3 flex items-center gap-1.5 select-none" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  <span>{t('landing.no_signup_needed', 'No sign up needed to look up buses')}</span>
                </p>
              </div>

              {/* Right Column: Phone Frame App Preview with Floating & Rolling ETA */}
              <div className="lg:col-span-5 flex justify-center">
                <motion.div
                  initial={prefersReduced ? {} : { opacity: 0, x: 40, rotate: 3 }}
                  animate={prefersReduced ? {} : { opacity: 1, x: 0, rotate: 0 }}
                  transition={{ delay: 0.35, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="w-full max-w-[320px]"
                >
                  <motion.div
                    animate={prefersReduced ? {} : { y: [0, -8, 0] }}
                    transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
                    className="relative w-full rounded-[36px] p-3.5 shadow-2xl border-4 select-none"
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
                            <img src="/brand/logo-mark.png" alt="Logo" className="w-full h-full object-contain" width="24" height="24" />
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

                      {/* Route Card Mini with Rolling ETA */}
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
                          <p className="text-[10px] flex items-center gap-1" style={{ color: '#5B6591' }}>
                            <span>Next bus in</span>
                            <RollingEta />
                            <span>min • ₹28</span>
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4" style={{ color: '#0040FF' }} />
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              </div>
            </div>

            {/* Signature smooth RoadRibbon SVG at bottom with animated draw & traveling dot */}
            <RoadRibbon animated={true} />
          </section>

          {/* 3. Live Stats Strip with Count-Up */}
          <section ref={statsRef} className="bg-surface border-b border-line py-5 px-4 sm:px-6">
            <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              {/* Live Buses */}
              <div className="flex flex-col items-center justify-center p-3 rounded-[20px] bg-surface-2 border border-line">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber animate-pulse" />
                  <span className="font-heading font-extrabold text-2xl text-text">
                    <AnimatedNumber value={liveBusCount} enabled={statsInView} />
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
                  <AnimatedNumber value={routesCount} enabled={statsInView} />
                </span>
                <span className="text-xs font-bold text-muted uppercase tracking-wider mt-0.5">
                  {t('landing.routes_count', 'Routes')}
                </span>
                <span className="text-[10px] text-muted mt-1">Twin cities network coverage</span>
              </div>

              {/* Stops Count */}
              <div className="flex flex-col items-center justify-center p-3 rounded-[20px] bg-surface-2 border border-line">
                <span className="font-heading font-extrabold text-2xl text-text">
                  <AnimatedNumber value={stopsCount} enabled={statsInView} />
                </span>
                <span className="text-xs font-bold text-muted uppercase tracking-wider mt-0.5">
                  {t('landing.stops_count', 'Stops covered')}
                </span>
                <span className="text-[10px] text-muted mt-1">Geo-coded with road snapping</span>
              </div>
            </div>
          </section>

          {/* 4. Features Grid (8 Cards) with Staggered Fade-Up & Hover Lift */}
          <section
            id="features"
            aria-labelledby="features-heading"
            className="scroll-mt-20 md:scroll-mt-24 py-16 px-4 sm:px-6 md:px-8 max-w-6xl mx-auto"
          >
            <motion.div
              initial={prefersReduced ? {} : { opacity: 0, y: 24 }}
              whileInView={prefersReduced ? {} : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="text-center max-w-2xl mx-auto mb-12"
            >
              <h2 id="features-heading" className="font-heading font-extrabold text-2xl sm:text-4xl text-text tracking-tight">
                Everything you need for your city ride
              </h2>
              <p className="text-sm text-muted mt-2">
                Designed from the ground up for daily commuters in Hubballi and Dharwad.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {features.map((feat, idx) => {
                const Icon = feat.icon
                return (
                  <motion.div
                    key={idx}
                    initial={prefersReduced ? {} : { opacity: 0, y: 24 }}
                    whileInView={prefersReduced ? {} : { opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.15 }}
                    transition={{
                      delay: prefersReduced ? 0 : (idx % 4) * 0.06,
                      duration: 0.5,
                      ease: 'easeOut',
                    }}
                    whileHover={prefersReduced ? {} : { y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    className="p-5 bg-surface rounded-[20px] border border-line shadow-card hover:border-brand/40 transition-shadow flex flex-col gap-3 group"
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center on-brand shadow-xs group-hover:scale-105 transition-transform"
                      style={{ background: 'var(--grad-brand)', color: 'var(--on-brand)' }}
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
                  </motion.div>
                )
              })}
            </div>
          </section>

          {/* 5. How It Works (3 Steps) with Scroll-Linked Connected Road Line */}
          <section
            id="how-it-works"
            ref={howItWorksRef}
            aria-labelledby="how-it-works-heading"
            className="scroll-mt-20 md:scroll-mt-24 py-16 px-4 sm:px-6 md:px-8 bg-surface-2/40 border-y border-line relative overflow-hidden"
          >
            <div className="max-w-6xl mx-auto relative z-10">
              <motion.div
                initial={prefersReduced ? {} : { opacity: 0, y: 24 }}
                whileInView={prefersReduced ? {} : { opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="text-center max-w-xl mx-auto mb-12"
              >
                <h2 id="how-it-works-heading" className="font-heading font-extrabold text-2xl sm:text-4xl text-text tracking-tight">
                  {t('landing.how_title', 'How it works')}
                </h2>
                <p className="text-sm text-muted mt-2">
                  Three effortless steps from where you are to where you need to be.
                </p>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                {/* Connecting road line between the 3 steps */}
                <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-8 pointer-events-none z-0" aria-hidden="true">
                  <svg viewBox="0 0 600 30" fill="none" className="w-full h-full overflow-visible">
                    <path
                      d="M 10 15 C 180 30, 420 0, 590 15"
                      stroke="var(--line)"
                      strokeWidth="3"
                      strokeDasharray="6 6"
                      strokeLinecap="round"
                    />
                    {!prefersReduced && (
                      <motion.path
                        d="M 10 15 C 180 30, 420 0, 590 15"
                        stroke="var(--brand)"
                        strokeWidth="3"
                        strokeDasharray="6 6"
                        strokeLinecap="round"
                        style={{ pathLength: howItWorksProgress }}
                      />
                    )}
                  </svg>
                </div>

                {/* Step 1 */}
                <motion.div
                  initial={prefersReduced ? {} : { opacity: 0, y: 24 }}
                  whileInView={prefersReduced ? {} : { opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.5 }}
                  whileHover={prefersReduced ? {} : { y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  className="p-6 bg-surface rounded-[24px] border border-line shadow-card flex flex-col items-center text-center gap-3 relative z-10"
                >
                  <motion.div
                    whileInView={prefersReduced ? {} : { scale: [0.8, 1.1, 1] }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4 }}
                    className="w-12 h-12 rounded-full flex items-center justify-center font-heading font-extrabold text-base border border-amber/30"
                    style={{ backgroundColor: 'rgba(255, 180, 0, 0.18)', color: '#00136E' }}
                  >
                    <span style={{ color: '#00136E' }}>1</span>
                  </motion.div>
                  <h3 className="font-heading font-bold text-base text-text">
                    {t('landing.step_1_title', 'Pick From and To')}
                  </h3>
                  <p className="text-xs text-muted leading-relaxed">
                    {t('landing.step_1_desc', 'Choose your origin and destination stops or use your location.')}
                  </p>
                </motion.div>

                {/* Step 2 */}
                <motion.div
                  initial={prefersReduced ? {} : { opacity: 0, y: 24 }}
                  whileInView={prefersReduced ? {} : { opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ delay: 0.08, duration: 0.5 }}
                  whileHover={prefersReduced ? {} : { y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  className="p-6 bg-surface rounded-[24px] border border-line shadow-card flex flex-col items-center text-center gap-3 relative z-10"
                >
                  <motion.div
                    whileInView={prefersReduced ? {} : { scale: [0.8, 1.1, 1] }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1, duration: 0.4 }}
                    className="w-12 h-12 rounded-full flex items-center justify-center font-heading font-extrabold text-base border border-brand/30"
                    style={{ backgroundColor: 'var(--surface-2)', color: 'var(--brand)' }}
                  >
                    2
                  </motion.div>
                  <h3 className="font-heading font-bold text-base text-text">
                    {t('landing.step_2_title', 'See buses and best way')}
                  </h3>
                  <p className="text-xs text-muted leading-relaxed">
                    {t('landing.step_2_desc', 'Compare direct routes, walking times and estimated fares.')}
                  </p>
                </motion.div>

                {/* Step 3 */}
                <motion.div
                  initial={prefersReduced ? {} : { opacity: 0, y: 24 }}
                  whileInView={prefersReduced ? {} : { opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ delay: 0.16, duration: 0.5 }}
                  whileHover={prefersReduced ? {} : { y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  className="p-6 bg-surface rounded-[24px] border border-line shadow-card flex flex-col items-center text-center gap-3 relative z-10"
                >
                  <motion.div
                    whileInView={prefersReduced ? {} : { scale: [0.8, 1.1, 1] }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                    className="w-12 h-12 rounded-full on-brand flex items-center justify-center font-heading font-extrabold text-base shadow-xs"
                    style={{ background: 'var(--grad-brand)', color: 'var(--on-brand)' }}
                  >
                    3
                  </motion.div>
                  <h3 className="font-heading font-bold text-base text-text">
                    {t('landing.step_3_title', 'Track your bus live')}
                  </h3>
                  <p className="text-xs text-muted leading-relaxed">
                    {t('landing.step_3_desc', 'Follow the live bus on the road map until it reaches your stop.')}
                  </p>
                </motion.div>
              </div>
            </div>
          </section>

          {/* 6. Roles Section (Passengers / Drivers / Admins) */}
          <section
            id="roles"
            aria-labelledby="roles-heading"
            className="scroll-mt-20 md:scroll-mt-24 py-16 px-4 sm:px-6 md:px-8 max-w-6xl mx-auto"
          >
            <motion.div
              initial={prefersReduced ? {} : { opacity: 0, y: 24 }}
              whileInView={prefersReduced ? {} : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5 }}
              className="text-center max-w-2xl mx-auto mb-12"
            >
              <h2 id="roles-heading" className="font-heading font-extrabold text-2xl sm:text-4xl text-text tracking-tight">
                {t('landing.roles_title', 'Built for everyone in the city')}
              </h2>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Passengers */}
              <motion.div
                initial={prefersReduced ? {} : { opacity: 0, y: 24 }}
                whileInView={prefersReduced ? {} : { opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5 }}
                whileHover={prefersReduced ? {} : { y: -4 }}
                className="p-6 bg-surface rounded-[24px] border border-line shadow-card flex flex-col justify-between gap-6"
              >
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
              </motion.div>

              {/* Drivers */}
              <motion.div
                initial={prefersReduced ? {} : { opacity: 0, y: 24 }}
                whileInView={prefersReduced ? {} : { opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ delay: 0.08, duration: 0.5 }}
                whileHover={prefersReduced ? {} : { y: -4 }}
                className="p-6 bg-surface rounded-[24px] border-2 border-brand shadow-card flex flex-col justify-between gap-6"
              >
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 dark:text-amber px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber/15 border border-amber/30">
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
                  style={{ background: 'var(--grad-brand)', color: 'var(--on-brand)' }}
                >
                  <span style={{ color: 'var(--on-brand)' }}>{t('landing.role_driver_btn', 'Sign up as driver')}</span>
                  <ArrowRight className="w-3.5 h-3.5" style={{ color: 'var(--on-brand)' }} />
                </Link>
              </motion.div>

              {/* Transit Admins */}
              <motion.div
                initial={prefersReduced ? {} : { opacity: 0, y: 24 }}
                whileInView={prefersReduced ? {} : { opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ delay: 0.16, duration: 0.5 }}
                whileHover={prefersReduced ? {} : { y: -4 }}
                className="p-6 bg-surface rounded-[24px] border border-line shadow-card flex flex-col justify-between gap-6"
              >
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
              </motion.div>
            </div>
          </section>

          {/* 7. Android App Section with Shine Sweep Effect */}
          <section
            id="app"
            aria-labelledby="app-heading"
            className="scroll-mt-20 md:scroll-mt-24 py-16 px-4 sm:px-6 md:px-8 bg-surface border-y border-line"
          >
            <motion.div
              initial={prefersReduced ? {} : { opacity: 0, y: 24 }}
              whileInView={prefersReduced ? {} : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5 }}
              className="max-w-4xl mx-auto rounded-[32px] p-8 sm:p-12 border border-line flex flex-col md:flex-row items-center justify-between gap-8 bg-surface-2 shadow-card"
            >
              <div className="max-w-md text-left">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand px-2.5 py-1 rounded-full bg-surface border border-line">
                  Mobile Experience
                </span>
                <h2 id="app-heading" className="font-heading font-extrabold text-2xl sm:text-3xl text-text tracking-tight mt-3">
                  {t('landing.app_title', 'Get the Nammooru Bus app')}
                </h2>
                <p className="text-xs sm:text-sm text-muted mt-2 leading-relaxed">
                  {t('landing.app_subtitle', 'Fast, responsive live tracking right on your Android phone.')}
                </p>

                <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  {APK_URL ? (
                    <a
                      href={APK_URL}
                      download="nammooru-bus.apk"
                      className="relative overflow-hidden min-h-[44px] px-6 py-2.5 rounded-full text-xs font-bold on-brand flex items-center justify-center gap-2 shadow-xs transition active:scale-95"
                      style={{ background: 'var(--grad-brand)', color: 'var(--on-brand)' }}
                    >
                      {!prefersReduced && (
                        <div
                          className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 pointer-events-none"
                          style={{
                            animation: 'shine-sweep 6s infinite',
                          }}
                        />
                      )}
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

              {/* Phone Mockup with Soft Glow */}
              <motion.div
                whileHover={prefersReduced ? {} : { scale: 1.02 }}
                className="w-40 h-40 sm:w-52 sm:h-52 rounded-[28px] bg-surface border border-line p-4 flex flex-col items-center justify-center text-center shadow-soft relative"
              >
                <div
                  className="w-16 h-16 rounded-[20px] flex items-center justify-center on-brand mb-3 shadow-xs"
                  style={{ background: 'var(--grad-brand)', color: 'var(--on-brand)' }}
                >
                  <Bus className="w-8 h-8" style={{ color: 'var(--on-brand)' }} />
                </div>
                <span className="font-heading font-extrabold text-xs text-text">Nammooru Bus APK</span>
                <span className="text-[10px] text-muted mt-0.5">Built with Capacitor</span>
              </motion.div>
            </motion.div>
          </section>

          {/* 8. FAQ Accordion (6 Questions) with Smooth Height Animation */}
          <section
            id="faq"
            aria-labelledby="faq-heading"
            className="scroll-mt-20 md:scroll-mt-24 py-16 px-4 sm:px-6 md:px-8 max-w-3xl mx-auto"
          >
            <motion.div
              initial={prefersReduced ? {} : { opacity: 0, y: 24 }}
              whileInView={prefersReduced ? {} : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5 }}
              className="text-center mb-10"
            >
              <h2 id="faq-heading" className="font-heading font-extrabold text-2xl sm:text-3xl text-text tracking-tight">
                {t('landing.faq_title', 'Frequently Asked Questions')}
              </h2>
            </motion.div>

            <div className="space-y-3">
              {faqs.map((faq, idx) => {
                const isOpen = openFaqIndex === idx
                return (
                  <motion.div
                    key={idx}
                    initial={prefersReduced ? {} : { opacity: 0, y: 16 }}
                    whileInView={prefersReduced ? {} : { opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ delay: idx * 0.05, duration: 0.4 }}
                    className="bg-surface rounded-[20px] border border-line overflow-hidden shadow-xs transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => toggleFaq(idx)}
                      aria-expanded={isOpen}
                      className="w-full min-h-[52px] px-5 py-3.5 flex items-center justify-between text-left gap-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                    >
                      <span className="font-heading font-bold text-sm text-text">
                        {faq.q}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-muted transition-transform shrink-0 ${isOpen ? 'rotate-180 text-brand' : ''
                          }`}
                      />
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={prefersReduced ? {} : { opacity: 0, height: 0 }}
                          animate={prefersReduced ? {} : { opacity: 1, height: 'auto' }}
                          exit={prefersReduced ? {} : { opacity: 0, height: 0 }}
                          transition={{ duration: 0.22, ease: 'easeOut' }}
                          className="px-5 pb-4 text-xs text-muted leading-relaxed border-t border-line/40 pt-2 overflow-hidden"
                        >
                          {faq.a}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
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
                  <img src="/brand/logo-mark.png" alt="Logo" className="w-full h-full object-contain" width="40" height="40" />
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

              {/* Quick Links with Smooth Scrolling */}
              <div className="flex items-center gap-6 text-xs font-semibold text-muted">
                <button
                  type="button"
                  onClick={() => scrollToSection('features')}
                  className="hover:text-text transition-colors"
                >
                  {t('landing.nav_features', 'Features')}
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('how-it-works')}
                  className="hover:text-text transition-colors"
                >
                  {t('landing.nav_how_it_works', 'How it works')}
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('roles')}
                  className="hover:text-text transition-colors"
                >
                  {t('landing.nav_roles', 'Roles')}
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('app')}
                  className="hover:text-text transition-colors"
                >
                  {t('landing.nav_app', 'App')}
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('faq')}
                  className="hover:text-text transition-colors"
                >
                  {t('landing.nav_faq', 'FAQ')}
                </button>
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
                    className="min-h-[44px] px-3.5 py-1.5 rounded-full border border-line bg-surface-2 hover:border-brand text-text font-bold text-xs flex items-center gap-1.5 transition active:scale-95 hover:shadow-xs"
                  >
                    <Globe className="w-3.5 h-3.5 text-brand" />
                    <span>{t('landing.footer_portfolio', 'Portfolio')}</span>
                  </a>

                  <a
                    href={GITHUB_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Manthan Patel GitHub"
                    className="min-h-[44px] px-3.5 py-1.5 rounded-full border border-line bg-surface-2 hover:border-brand text-text font-bold text-xs flex items-center gap-1.5 transition active:scale-95 hover:shadow-xs"
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

        {/* "Back to Top" Floating Button (44px, appears after scrolling 600px) */}
        <AnimatePresence>
          {showBackToTop && (
            <motion.button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' })}
              aria-label="Back to top"
              initial={prefersReduced ? { opacity: 1 } : { opacity: 0, scale: 0.8, y: 10 }}
              animate={prefersReduced ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
              exit={prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 0.8, y: 10 }}
              transition={{ duration: 0.2 }}
              className="fixed right-6 z-40 w-11 h-11 rounded-full on-brand shadow-float flex items-center justify-center transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 cursor-pointer"
              style={{
                background: 'var(--grad-brand)',
                color: 'var(--on-brand)',
                bottom: 'max(1.5rem, calc(env(safe-area-inset-bottom, 0px) + 1.5rem))',
              }}
            >
              <ArrowUp className="w-5 h-5" style={{ color: 'var(--on-brand)' }} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  )
}
