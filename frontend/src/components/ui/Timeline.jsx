import React from 'react'
import { cn } from './Button'
import { formatDateTime, formatRelativeTime } from '@/utils/formatters'

export function Timeline({ items = [], className }) {
  if (!items || items.length === 0) return null

  return (
    <div className={cn('relative pl-6 space-y-5', className)}>
      {/* Vertical Track Line */}
      <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-line-soft" />

      {items.map((item, idx) => {
        const Icon = item.icon
        return (
          <div key={item.id || idx} className="relative flex items-start gap-4">
            {/* Timeline Node */}
            <div
              className={cn(
                'absolute -left-6 mt-0.5 w-6 h-6 rounded-full border border-ink flex items-center justify-center shrink-0 bg-paper-raised z-10 text-ink shadow-sm',
                item.nodeClass
              )}
            >
              {Icon ? (
                <Icon className="w-3.5 h-3.5" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 bg-paper-raised border border-line-soft rounded-[8px] p-3 text-xs">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-semibold text-ink">
                  {item.title}
                </span>
                {item.timestamp && (
                  <span
                    className="font-mono text-[11px] text-ink-3"
                    title={formatDateTime(item.timestamp)}
                  >
                    {formatRelativeTime(item.timestamp)}
                  </span>
                )}
              </div>
              {item.description && (
                <p className="text-ink-2 leading-relaxed">
                  {item.description}
                </p>
              )}
              {item.metadata && (
                <div className="mt-2 pt-2 border-t border-line-soft text-[11px] font-mono text-ink-3">
                  {item.metadata}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
