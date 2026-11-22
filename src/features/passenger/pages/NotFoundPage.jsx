import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Compass, ArrowLeft } from 'lucide-react'
import Button from '@/components/ui/Button'

export default function NotFoundPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col items-center justify-center p-6 text-center select-none">
      {/* 404 Visual */}
      <div className="relative mb-6">
        <div
          className="w-24 h-24 rounded-[28px] flex items-center justify-center text-white shadow-card"
          style={{ background: 'var(--gradient-brand)' }}
        >
          <Compass className="w-12 h-12" />
        </div>
        <span className="absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-full bg-amber text-navy-900 font-extrabold text-xs shadow-xs">
          404
        </span>
      </div>

      <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-text tracking-tight mb-2">
        Page Not Found
      </h1>
      <p className="text-sm text-muted max-w-sm mb-6 leading-relaxed">
        The stop or page you are looking for does not exist, has been moved, or the link is expired.
      </p>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="min-h-[44px] px-4 py-2 rounded-full border border-line bg-surface text-text font-bold text-xs hover:bg-surface-2 transition active:scale-95 flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4 text-muted" />
          <span>Go Back</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/explore')}
          className="min-h-[44px] px-5 py-2 rounded-full text-white font-bold text-xs shadow-xs transition active:scale-95 flex items-center gap-1.5"
          style={{ background: 'var(--gradient-brand)' }}
        >
          <Compass className="w-4 h-4" />
          <span>Explore Buses</span>
        </button>
      </div>
    </div>
  )
}
