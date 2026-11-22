import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { ArrowRight, Bus, ShieldCheck } from 'lucide-react'
import Button from '@/components/ui/Button'
import LanguageToggle from '@/components/ui/LanguageToggle'
import { appStorage } from '@/lib/storage'
import { hapticTick } from '@/lib/platform'

export default function GetStartedPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()

  const handleContinueAsGuest = () => {
    hapticTick()
    appStorage.setItem('nb-onboarded', 'true')
    appStorage.setItem('nb-guest', 'true')
    navigate('/explore', { replace: true })
  }

  const handleSignIn = () => {
    hapticTick()
    navigate('/login')
  }

  const handleSignUp = () => {
    hapticTick()
    navigate('/register')
  }

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col justify-between font-body select-none">
      {/* Top Bar with Language Selector */}
      <header className="pt-safe-top px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-[12px] bg-white p-0.5 shadow-xs flex items-center justify-center">
            <img src="/brand/logo-mark.png" alt="Nammooru Logo" className="w-full h-full object-contain" />
          </div>
          <span className="font-heading font-extrabold text-base tracking-tight text-text">
            Nammooru <span className="text-brand">Bus</span>
          </span>
        </div>
        <LanguageToggle />
      </header>

      {/* Main Center Content: Branding & Tagline */}
      <main className="flex-1 max-w-sm w-full mx-auto px-6 flex flex-col items-center justify-center text-center space-y-6">
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="w-24 h-24 rounded-[28px] bg-white p-4 shadow-float flex items-center justify-center border border-line"
        >
          <img src="/brand/logo-mark.png" alt="Nammooru Bus" className="w-full h-full object-contain" />
        </motion.div>

        <div className="space-y-2">
          <h1 className="font-heading font-extrabold text-3xl tracking-tight text-text">
            Nammooru <span className="text-brand">Bus</span>
          </h1>
          <p className="text-sm font-semibold text-muted max-w-[260px] mx-auto leading-relaxed">
            {i18n.language === 'kn'
              ? 'ನಮ್ಮೂರು. ನಮ್ಮ ಬಸ್ಸು. • ಹುಬ್ಬಳ್ಳಿ-ಧಾರವಾಡ'
              : 'Our town. Our bus. • Hubballi-Dharwad'}
          </p>
        </div>

        {/* Action Buttons Stack: 56px height, rounded full */}
        <div className="w-full space-y-3 pt-4">
          {/* 1. Continue as guest */}
          <Button
            variant="primary"
            size="lg"
            onClick={handleContinueAsGuest}
            className="w-full h-14 rounded-full text-base font-heading font-extrabold shadow-float flex items-center justify-center gap-2"
          >
            <span>{i18n.language === 'kn' ? 'ಅತಿಥಿಯಾಗಿ ಮುಂದುವರಿಯಿರಿ' : 'Continue as guest'}</span>
            <ArrowRight className="w-5 h-5" />
          </Button>

          {/* 2. Sign In */}
          <Button
            variant="outline"
            size="lg"
            onClick={handleSignIn}
            className="w-full h-14 rounded-full text-base font-heading font-bold flex items-center justify-center"
          >
            {i18n.language === 'kn' ? 'ಸೈನ್ ಇನ್' : 'Sign in'}
          </Button>

          {/* 3. Sign Up */}
          <Button
            variant="outline"
            size="lg"
            onClick={handleSignUp}
            className="w-full h-14 rounded-full text-base font-heading font-bold flex items-center justify-center"
          >
            {i18n.language === 'kn' ? 'ಖಾತೆ ತೆರೆಯಿರಿ (Sign up)' : 'Sign up'}
          </Button>
        </div>

        {/* Driver Link */}
        <div className="pt-2">
          <Link
            to="/register?driver=true"
            className="text-xs font-bold text-brand hover:underline inline-flex items-center gap-1.5"
          >
            <Bus className="w-3.5 h-3.5" />
            <span>{i18n.language === 'kn' ? 'ಚಾಲಕರೇ? ಚಾಲಕರಾಗಿ ಸೈನ್ ಅಪ್ ಮಾಡಿ' : 'Driver? Sign up as a driver'}</span>
          </Link>
        </div>
      </main>

      {/* Footer Legal Small Print */}
      <footer className="pb-safe-bottom px-6 py-4 text-center">
        <p className="text-[11px] text-muted max-w-xs mx-auto leading-normal">
          {i18n.language === 'kn' ? 'ಮುಂದುವರಿಯುವ ಮೂಲಕ ನೀವು ನಮ್ಮ ' : 'By continuing you agree to our '}
          <Link to="/terms" className="underline font-semibold hover:text-text">
            {i18n.language === 'kn' ? 'ನಿಯಮಗಳು' : 'Terms'}
          </Link>
          {i18n.language === 'kn' ? ' ಮತ್ತು ' : ' and '}
          <Link to="/privacy" className="underline font-semibold hover:text-text">
            {i18n.language === 'kn' ? 'ಗೌಪ್ಯತೆ ನೀತಿ' : 'Privacy Policy'}
          </Link>
        </p>
      </footer>
    </div>
  )
}
