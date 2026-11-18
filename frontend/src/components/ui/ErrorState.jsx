import React from 'react'
import { ErrorStateIllustration } from '@/assets/illustrations'
import { RefreshCw } from 'lucide-react'
import { Button } from './Button'

export function ErrorState({
  title = 'Failed to load data',
  message = 'An unexpected error occurred while fetching information.',
  onRetry,
  className = '',
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center rounded-[10px] border border-dashed border-line-dashed bg-paper-sunken/30 ${className}`}
    >
      <div className="mb-3">
        <ErrorStateIllustration />
      </div>
      <h4 className="text-xs font-semibold text-ink uppercase tracking-wider font-mono mb-1">{title}</h4>
      <p className="text-xs text-ink-2 max-w-sm mb-4">{message}</p>
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          onClick={onRetry}
        >
          Try Again
        </Button>
      )}
    </div>
  )
}
