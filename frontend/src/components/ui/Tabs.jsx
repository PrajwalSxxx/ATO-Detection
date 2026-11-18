import React from 'react'
import { motion } from 'framer-motion'
import { cn } from './Button'

/**
 * Tabs component
 * Underline-less editorial style: active tab is a solid black rounded rectangle
 * with paper text. Inactive tabs are text only with soft hover.
 */
export function Tabs({ tabs = [], activeTab, onChange, className = '' }) {
  return (
    <div className={cn('inline-flex items-center gap-1 p-1 bg-paper-sunken border border-line-soft rounded-[8px]', className)}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative px-3 py-1.5 text-xs font-medium rounded-[6px] transition-colors select-none z-10 flex items-center gap-1.5',
              isActive
                ? 'text-paper'
                : 'text-ink-2 hover:text-ink hover:bg-paper-hover'
            )}
          >
            {isActive && (
              <motion.div
                layoutId="activeTabPill"
                className="absolute inset-0 bg-ink rounded-[6px] -z-10"
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
                  'text-[10px] font-mono px-1.5 py-0.2 rounded-full',
                  isActive ? 'bg-paper text-ink' : 'bg-paper-raised text-ink-3 border border-line-soft'
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
