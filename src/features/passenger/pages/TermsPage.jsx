import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function TermsPage() {
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

        <h1 className="font-heading font-extrabold text-2xl mb-4 text-text">Terms of Service</h1>
        <div className="space-y-4 text-sm text-muted leading-relaxed bg-surface p-5 rounded-[20px] border border-line">
          <p>
            Welcome to Nammooru Bus. By using our application, you agree to these Terms of Service.
          </p>
          <h2 className="font-heading font-bold text-base text-text">1. Public Transit Information</h2>
          <p>
            Nammooru Bus provides public transit routing, schedules, fares, and real-time crowd estimates for the Hubballi-Dharwad urban area. Bus positions and arrival estimates are provided for passenger convenience and may vary due to real-world traffic, weather, or transit operations.
          </p>
          <h2 className="font-heading font-bold text-base text-text">2. Acceptable Use</h2>
          <p>
            You agree not to misuse transit communication tools, submit fraudulent crowd reports, or interfere with driver tracking systems.
          </p>
          <h2 className="font-heading font-bold text-base text-text">3. Updates to Terms</h2>
          <p>
            We may update transit routing data and service policies periodically to improve city transit efficiency.
          </p>
        </div>
      </div>
    </div>
  )
}
