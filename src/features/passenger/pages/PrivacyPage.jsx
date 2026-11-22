import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function PrivacyPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-bg text-text font-body p-6 select-none">
      <div className="max-w-xl mx-auto pt-safe-top">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-surface border border-line flex items-center justify-center text-text mb-4 active:scale-95 transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <h1 className="font-heading font-extrabold text-2xl mb-4 text-text">Privacy Policy</h1>
        <div className="space-y-4 text-sm text-muted leading-relaxed bg-surface p-5 rounded-[20px] border border-line">
          <p>
            Your privacy is paramount. Nammooru Bus is designed to allow guest transit navigation without unnecessary personal data collection.
          </p>
          <h2 className="font-heading font-bold text-base text-text">1. Location Data</h2>
          <p>
            Passenger device location is used strictly on-device in the foreground to find nearby bus stops, calculate walking directions, and show your distance to approaching buses. Your live coordinates are never stored on central servers or sold to third parties.
          </p>
          <h2 className="font-heading font-bold text-base text-text">2. Driver Real-Time Telemetry</h2>
          <p>
            Authorized drivers broadcasting vehicle location transmit coordinates solely to display active bus positions to commuters during scheduled shifts.
          </p>
          <h2 className="font-heading font-bold text-base text-text">3. Offline Storage</h2>
          <p>
            Saved routes, cached schedules, and theme preferences are stored locally on your device using secure local storage and Capacitor Preferences.
          </p>
        </div>
      </div>
    </div>
  )
}
