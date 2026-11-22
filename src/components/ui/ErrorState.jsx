import { AlertCircle, RotateCcw } from 'lucide-react'
import Button from './Button'

/**
 * ErrorState — clean error view with retry action.
 */
export default function ErrorState({
  title = 'Something went wrong',
  description = 'Could not load data. Please check your connection and try again.',
  onRetry,
  retryLabel = 'Try again',
  className = '',
}) {
  return (
    <div
      className={`bg-white rounded-[20px] p-6 text-center border border-line space-y-4 ${className}`}
      style={{ boxShadow: 'var(--shadow-soft)' }}
    >
      <div className="w-12 h-12 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto shadow-xs">
        <AlertCircle className="w-6 h-6" />
      </div>

      <div className="space-y-1">
        <h4 className="font-heading font-bold text-base text-ink-950">
          {title}
        </h4>
        <p className="text-xs text-muted max-w-xs mx-auto">
          {description}
        </p>
      </div>

      {onRetry && (
        <div className="pt-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onRetry}
            className="mx-auto"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            <span>{retryLabel}</span>
          </Button>
        </div>
      )}
    </div>
  )
}
