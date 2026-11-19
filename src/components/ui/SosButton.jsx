import { useState, useRef, useEffect } from 'react'
import { ShieldAlert, Check } from 'lucide-react'
import { useToastStore } from '@/components/ui/Toast'

export default function SosButton({
  routeCode = '',
  busRegNo = '',
  tripId = '',
  variant = 'compact', // 'compact' | 'full'
  className = '',
}) {
  const [holding, setHolding] = useState(false)
  const [progress, setProgress] = useState(0) // 0 to 100
  const [triggered, setTriggered] = useState(false)

  const holdStartTimeRef = useRef(null)
  const animationFrameRef = useRef(null)
  const { addToast } = useToastStore()

  const HOLD_DURATION_MS = 1000 // 1 second

  const triggerSos = () => {
    if (navigator.vibrate) {
      try {
        navigator.vibrate([100, 50, 100])
      } catch (e) {}
    }

    setTriggered(true)
    setTimeout(() => setTriggered(false), 2000)

    const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin
    const trackingUrl = tripId ? `${baseUrl}/live?trip=${tripId}` : `${baseUrl}/live`
    const busDesc = busRegNo ? ` (${busRegNo})` : ''
    const routeDesc = routeCode ? `Route ${routeCode}` : 'our local bus'
    const shareText = `I am on bus ${routeDesc}${busDesc}. Track me: ${trackingUrl}`

    if (navigator.share) {
      navigator
        .share({
          title: 'Nammooru Bus SOS Emergency Tracker',
          text: shareText,
          url: trackingUrl,
        })
        .catch((err) => {
          if (err.name !== 'AbortError') {
            fallbackShare(shareText, trackingUrl)
          }
        })
    } else {
      fallbackShare(shareText, trackingUrl)
    }
  }

  const fallbackShare = (text, url) => {
    // Try opening WhatsApp Web / Mobile directly
    const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`
    const win = window.open(waUrl, '_blank')

    if (!win) {
      // Fallback copy to clipboard
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text)
        addToast({
          message: 'Emergency tracking link copied to clipboard!',
          type: 'info',
        })
      }
    }
  }

  const startHolding = (e) => {
    // Prevent context menu on long press
    if (e.type === 'contextmenu') e.preventDefault()
    setHolding(true)
    setProgress(0)
    holdStartTimeRef.current = Date.now()

    const updateLoop = () => {
      const elapsed = Date.now() - holdStartTimeRef.current
      const pct = Math.min(100, (elapsed / HOLD_DURATION_MS) * 100)
      setProgress(pct)

      if (elapsed >= HOLD_DURATION_MS) {
        setHolding(false)
        setProgress(0)
        triggerSos()
      } else {
        animationFrameRef.current = requestAnimationFrame(updateLoop)
      }
    }

    animationFrameRef.current = requestAnimationFrame(updateLoop)
  }

  const cancelHolding = () => {
    setHolding(false)
    setProgress(0)
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
  }

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  // SVG circular geometry
  const radius = 18
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progress / 100) * circumference

  if (variant === 'full') {
    return (
      <div className={`relative select-none ${className}`}>
        <button
          type="button"
          onMouseDown={startHolding}
          onMouseUp={cancelHolding}
          onMouseLeave={cancelHolding}
          onTouchStart={startHolding}
          onTouchEnd={cancelHolding}
          onTouchCancel={cancelHolding}
          onContextMenu={(e) => e.preventDefault()}
          className={`w-full py-3.5 px-4 rounded-input font-bold text-xs flex items-center justify-center gap-2.5 transition active:scale-[0.98] ${
            holding
              ? 'bg-danger text-white shadow-soft ring-4 ring-danger/30'
              : triggered
              ? 'bg-success text-white'
              : 'bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20'
          }`}
        >
          <div className="relative w-6 h-6 flex items-center justify-center shrink-0">
            {holding && (
              <svg className="absolute inset-0 -rotate-90 w-6 h-6" viewBox="0 0 44 44">
                <circle
                  cx="22"
                  cy="22"
                  r={radius}
                  fill="none"
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth="4"
                />
                <circle
                  cx="22"
                  cy="22"
                  r={radius}
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="4"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                />
              </svg>
            )}
            {triggered ? (
              <Check className="w-4 h-4 text-white" />
            ) : (
              <ShieldAlert className="w-4 h-4" />
            )}
          </div>
          <span>
            {triggered
              ? 'Emergency Alert Shared'
              : holding
              ? `Hold 1s for SOS... (${Math.round(progress)}%)`
              : 'Hold for SOS (Share Live Location)'}
          </span>
        </button>
      </div>
    )
  }

  // Compact variant
  return (
    <div className={`relative select-none ${className}`}>
      <button
        type="button"
        onMouseDown={startHolding}
        onMouseUp={cancelHolding}
        onMouseLeave={cancelHolding}
        onTouchStart={startHolding}
        onTouchEnd={cancelHolding}
        onTouchCancel={cancelHolding}
        onContextMenu={(e) => e.preventDefault()}
        title="Press and hold 1 second for SOS Emergency Share"
        className={`relative px-3.5 py-2.5 rounded-input font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-[0.97] ${
          holding
            ? 'bg-danger text-white ring-2 ring-danger/40'
            : triggered
            ? 'bg-success text-white'
            : 'bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20'
        }`}
      >
        <div className="relative w-5 h-5 flex items-center justify-center shrink-0">
          {holding && (
            <svg className="absolute -inset-1 -rotate-90 w-7 h-7" viewBox="0 0 44 44">
              <circle
                cx="22"
                cy="22"
                r={radius}
                fill="none"
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="4"
              />
              <circle
                cx="22"
                cy="22"
                r={radius}
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="4"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
          )}
          {triggered ? (
            <Check className="w-3.5 h-3.5 text-white" />
          ) : (
            <ShieldAlert className="w-3.5 h-3.5" />
          )}
        </div>
        <span>{triggered ? 'Sent' : holding ? `${Math.round(progress)}%` : 'SOS'}</span>
      </button>
    </div>
  )
}
