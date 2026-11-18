import React from 'react'

export function PageHeader({
  title,
  description,
  actions,
  badge,
  className = '',
}) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 mb-6 border-b border-line-soft ${className}`}
    >
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl md:text-3xl font-serif font-normal tracking-tight text-ink">
            {title}
          </h1>
          {badge}
        </div>
        {description && (
          <p className="text-xs md:text-sm text-ink-2 mt-1">
            {description}
          </p>
        )}
      </div>

      {actions && <div className="flex items-center gap-2.5">{actions}</div>}
    </div>
  )
}
