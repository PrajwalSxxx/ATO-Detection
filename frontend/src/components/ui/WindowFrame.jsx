import React from 'react'
import { motion } from 'framer-motion'
import { cn } from './Button'

/**
 * WindowFrame
 * The signature browser-window motif for the Paper & Ink editorial design system.
 * Features a slim titlebar with 3 tiny outlined unfilled dots (6px circles),
 * 1.5px ink border, white background, and optional hard offset shadow.
 */
export function WindowFrame({
  children,
  title,
  subtitle,
  actions,
  hardShadow = false,
  className = '',
  contentClassName = '',
  headerClassName = '',
  animated = false,
  ...props
}) {
  const Component = animated ? motion.div : 'div'

  return (
    <Component
      className={cn(
        'bg-paper-raised border-[1.5px] border-ink rounded-lg overflow-hidden transition-all duration-150',
        hardShadow && 'shadow-hard',
        className
      )}
      {...props}
    >
      {/* Window Header Titlebar */}
      <div
        className={cn(
          'h-10 px-4 bg-paper-sunken border-b border-line-soft flex items-center justify-between select-none shrink-0',
          headerClassName
        )}
      >
        {/* Left: 3 Tiny Outlined Dots (6px diameter) */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-2 h-2 rounded-full border-[1.25px] border-ink bg-transparent" />
          <span className="w-2 h-2 rounded-full border-[1.25px] border-ink bg-transparent" />
          <span className="w-2 h-2 rounded-full border-[1.25px] border-ink bg-transparent" />
        </div>

        {/* Center: Title / Subtitle */}
        {title && (
          <div className="flex items-center gap-2 px-2 truncate">
            <span className="text-xs font-semibold text-ink tracking-tight truncate">
              {title}
            </span>
            {subtitle && (
              <span className="text-[11px] font-mono text-ink-3 hidden sm:inline truncate">
                // {subtitle}
              </span>
            )}
          </div>
        )}

        {/* Right: Actions / Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
      </div>

      {/* Window Body */}
      <div className={cn('p-4 sm:p-5', contentClassName)}>
        {children}
      </div>
    </Component>
  )
}
