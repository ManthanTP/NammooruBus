import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, MessageSquare } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

export default function HelpPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const isDriver = profile?.role === 'driver'

  const handleBack = () => {
    if (isDriver) {
      navigate('/driver/profile', { replace: true })
    } else {
      navigate(-1)
    }
  }

  const faqs = [
    {
      q: 'How does live bus tracking work?',
      a: 'Buses are tracked via drivers using their phones to share GPS positions directly to Supabase Realtime every 5 seconds. No special hardware is required.',
    },
    {
      q: 'Does route search work offline?',
      a: 'Yes! All route, stop, schedule, and fare data are cached in your device’s storage on first load. Route finding runs 100% client-side in JavaScript.',
    },
    {
      q: 'How are bus fares calculated?',
      a: 'Fares are stage-based: ₹5 minimum fare covering up to 2.0 km, with ₹5 per each 2.0 km stage thereafter.',
    },
    {
      q: 'Can I use Nammooru Bus without an account?',
      a: 'Yes. Passengers can search routes, view timetables, browse nearby stops, and track buses as a guest. Accounts allow syncing saved trips across devices and reporting crowd levels.',
    },
  ]

  return (
    <div className="space-y-4 pb-8">
      {/* 1. Header with logo-full */}
      <div
        className="rounded-[28px] p-6 on-brand shadow-soft relative overflow-hidden text-center flex flex-col items-center"
        style={{ background: 'var(--gradient-brand)', color: 'var(--on-brand)' }}
      >
        <div className="w-full flex items-center justify-between mb-2">
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
            {t('nav.help') || 'Help & Support'}
          </span>
          <div className="w-8" />
        </div>

        {/* Logo plate */}
        <div className="bg-surface rounded-[20px] p-3 shadow-float mb-3 flex items-center justify-center max-w-[170px] border border-line">
          <img
            src="/brand/logo-full.png"
            alt="Nammooru Bus"
            className="w-28 h-auto object-contain"
          />
        </div>

        <h1 className="font-heading font-extrabold text-xl text-white">
          Frequently Asked Questions
        </h1>
        <p className="text-xs text-white/75 mt-0.5 max-w-xs">
          Learn how live tracking, offline search, and ticketing work
        </p>

        <div className="absolute bottom-0 left-0 right-0 h-2 road-ribbon opacity-75" />
      </div>

      {/* 2. FAQ Accordions */}
      <div className="space-y-2.5">
        {faqs.map((faq, idx) => (
          <div
            key={idx}
            className="p-4 bg-surface rounded-[20px] border border-line shadow-soft space-y-1.5 text-left"
          >
            <h3 className="text-xs font-bold font-heading text-text">{faq.q}</h3>
            <p className="text-xs text-muted leading-relaxed">{faq.a}</p>
          </div>
        ))}
      </div>

      {/* 3. Feedback CTA (Passengers only) */}
      {!isDriver && (
        <div className="p-4 bg-surface rounded-[20px] border border-line shadow-soft flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold font-heading text-text">Have a grievance or complaint?</h3>
            <p className="text-xs text-muted mt-0.5">Submit feedback directly to transit support.</p>
          </div>
          <Link
            to="/complaints"
            className="px-4 py-2 on-brand text-xs font-bold rounded-full transition shrink-0 active:scale-95 shadow-xs flex items-center gap-1.5"
            style={{ background: 'var(--gradient-brand)', color: 'var(--on-brand)' }}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{t('nav.complaints') || 'Feedback'}</span>
          </Link>
        </div>
      )}
    </div>
  )
}
