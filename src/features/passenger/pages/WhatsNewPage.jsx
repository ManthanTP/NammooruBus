import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Download, Sparkles, Calendar, CheckCircle2, ShieldCheck } from 'lucide-react'
import Button from '@/components/ui/Button'
import LanguageToggle from '@/components/ui/LanguageToggle'
import ThemeToggle from '@/components/ui/ThemeToggle'
import { APK_URL } from '@/config/links'
import { openExternalUrl } from '@/lib/platform'

export default function WhatsNewPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const lang = i18n.language === 'kn' ? 'kn' : 'en'
  const [releases, setReleases] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/releases.json')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setReleases(data)
        }
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [])

  return (
    <div className="min-h-screen bg-bg text-text font-body transition-colors pb-12">
      {/* Top Header */}
      <header className="sticky top-0 z-30 h-14 bg-surface/90 backdrop-blur-md border-b border-line px-4 md:px-6 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-surface-2 hover:bg-line border border-line flex items-center justify-center transition active:scale-95 cursor-pointer text-text"
            title="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-[10px] bg-white p-0.5 shadow-xs flex items-center justify-center shrink-0 border border-line">
              <img src="/brand/logo-mark.png" alt="Nammooru Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-heading font-extrabold text-sm sm:text-base text-text">
              {lang === 'kn' ? 'ಹೊಸ ನವೀಕರಣಗಳು' : "What's New"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Hero banner */}
        <div
          className="rounded-[28px] p-6 on-brand shadow-soft relative overflow-hidden"
          style={{ background: 'var(--gradient-brand)', color: 'var(--on-brand)' }}
        >
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-white/80">
                  Release Notes & Changelog
                </span>
              </div>
              <h1 className="font-heading font-extrabold text-2xl text-white">
                Nammooru Bus Releases
              </h1>
              <p className="text-xs text-white/80 max-w-md">
                {lang === 'kn'
                  ? 'ಹುಬ್ಬಳ್ಳಿ-ಧಾರವಾಡದ ಸಾರ್ವಜನಿಕ ಸಾರಿಗೆ ಅಪ್ಲಿಕೇಶನ್‌ನ ಇತ್ತೀಚಿನ ಆವೃತ್ತಿಗಳು ಮತ್ತು ಸುಧಾರಣೆಗಳು.'
                  : 'Track the latest features, enhancements, and fixes shipped to the Nammooru Bus transit platform.'}
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => openExternalUrl(APK_URL)}
              className="bg-white text-navy-900 border-none font-extrabold text-xs shrink-0 shadow-xs hover:bg-sky-50"
            >
              <Download className="w-4 h-4 mr-1.5" />
              <span>Download APK</span>
            </Button>
          </div>
        </div>

        {/* Releases List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : releases.length === 0 ? (
          <div className="p-8 text-center text-muted bg-surface rounded-[24px] border border-line">
            No release notes found.
          </div>
        ) : (
          <div className="space-y-6">
            {releases.map((rel, index) => {
              const title = rel.title?.[lang] || rel.title?.en || `Version ${rel.versionName}`
              const notes = rel.notes?.[lang] || rel.notes?.en || []

              return (
                <article
                  key={rel.versionName || index}
                  className="p-5 sm:p-6 bg-surface rounded-[24px] border border-line shadow-soft space-y-4"
                >
                  {/* Release Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-3.5">
                    <div className="flex items-center gap-2.5">
                      <span className="px-3 py-1 rounded-pill bg-brand text-white font-mono font-bold text-xs shadow-xs">
                        v{rel.versionName}
                      </span>
                      {index === 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold uppercase">
                          Latest
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-muted">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{rel.releasedAt}</span>
                      {rel.apkSize && <span>• {rel.apkSize}</span>}
                    </div>
                  </div>

                  {/* Title */}
                  <h2 className="font-heading font-extrabold text-lg text-text">
                    {title}
                  </h2>

                  {/* Bullet Points */}
                  <ul className="space-y-2.5">
                    {notes.map((bullet, bIdx) => (
                      <li key={bIdx} className="flex items-start gap-2.5 text-xs text-text leading-relaxed">
                        <CheckCircle2 className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Action Link */}
                  {rel.apkUrl && (
                    <div className="pt-2">
                      <a
                        href={rel.apkUrl}
                        download="nammooru-bus.apk"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:underline"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download this build ({rel.apkSize || 'APK'})</span>
                      </a>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
