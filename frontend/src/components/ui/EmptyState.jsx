import React from 'react'
import { EmptyStateIllustration } from '@/assets/illustrations'
import { Button } from './Button'

export function EmptyState({
  icon: Icon,
  title = 'No data found',
  description = 'There are no records to display matching your current criteria.',
  actionLabel,
  onAction,
  className = '',
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center rounded-[10px] border border-dashed border-line-dashed bg-paper-sunken/30 ${className}`}
    >
      <div className="mb-3">
        {Icon ? <Icon className="w-8 h-8 text-ink-3 mx-auto" /> : <EmptyStateIllustration />}
      </div>
      <h4 className="text-xs font-semibold text-ink uppercase tracking-wider font-mono mb-1">{title}</h4>
      <p className="text-xs text-ink-2 max-w-sm mb-4">{description}</p>
      {actionLabel && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
