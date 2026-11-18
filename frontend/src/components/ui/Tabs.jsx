import React from 'react'
import { motion } from 'framer-motion'
import { cn } from './Button'

/**
 * Tabs component
 * Editorial style: active tab has a solid black (or ink) rounded rectangle pill
 * with paper text. Inactive tabs are text only with soft hover.
 * Animated with Framer Motion spring physics.
 */
export function Tabs({
  tabs = [],
  activeTab,
  onChange,
  className = '',
  layoutId = 'activeTabPill',
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 p-1 bg-paper-sunken border border-line-soft rounded-[8px] overflow-x-auto max-w-full scrollbar-none',
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative px-3 py-1.5 text-xs font-medium rounded-[6px] transition-colors select-none z-10 flex items-center gap-1.5 whitespace-nowrap cursor-pointer',
              isActive
                ? 'text-paper font-semibold'
                : 'text-ink-2 hover:text-ink hover:bg-paper-hover'
            )}
          >
            {isActive && (
              <motion.div
                layoutId={layoutId}
                className="absolute inset-0 bg-ink rounded-[6px] -z-10 shadow-xs"
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
              />
            )}
            {tab.icon && (
              <span className="shrink-0">
                {React.isValidElement(tab.icon)
                  ? tab.icon
                  : React.createElement(tab.icon, { className: 'w-3.5 h-3.5' })}
              </span>
            )}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={cn(
                  'text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold',
                  isActive
                    ? 'bg-paper text-ink'
                    : 'bg-paper-raised text-ink-3 border border-line-soft'
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
