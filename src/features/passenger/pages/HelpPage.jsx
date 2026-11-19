import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, HelpCircle, MessageSquare, Bus, MapPin, Radio, Shield } from 'lucide-react'

export default function HelpPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

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
    <div className="space-y-4 pt-1 pb-6">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2 border-b border-line">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-ink transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('common.back')}</span>
        </button>
        <span className="font-extrabold text-xs font-heading">{t('nav.help')}</span>
        <div className="w-10" />
      </div>

      {/* Guide Banner */}
      <div className="p-4 bg-surface rounded-card border border-line shadow-soft">
        <div className="flex items-center gap-2 mb-2">
          <HelpCircle className="w-5 h-5 text-cobalt" />
          <h2 className="text-sm font-extrabold text-ink font-heading">
            Frequently Asked Questions
          </h2>
        </div>
        <p className="text-xs text-text-secondary">
          Find answers about routes, tracking, schedules, and fares in Nammooru Bus.
        </p>
      </div>

      {/* FAQ Accordions / List */}
      <div className="space-y-2">
        {faqs.map((faq, idx) => (
          <div
            key={idx}
            className="p-3.5 bg-surface rounded-card border border-line shadow-soft space-y-1.5"
          >
            <h4 className="text-xs font-bold text-ink">{faq.q}</h4>
            <p className="text-[11px] text-text-secondary leading-relaxed">{faq.a}</p>
          </div>
        ))}
      </div>

      {/* Feedback & Complaints CTA */}
      <div className="p-4 bg-cobalt-tint/60 border border-cobalt/20 rounded-card flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-ink">Have a grievance or complaint?</h4>
          <p className="text-[11px] text-text-secondary">Submit feedback directly to city transport admins.</p>
        </div>
        <Link
          to="/complaints"
          className="px-3 py-1.5 bg-cobalt text-white text-xs font-bold rounded-pill hover:opacity-95 transition shrink-0 ml-2"
        >
          {t('nav.complaints')}
        </Link>
      </div>
    </div>
  )
}
