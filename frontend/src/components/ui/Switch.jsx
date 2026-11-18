import React from 'react'
import { motion } from 'framer-motion'
import { cn } from './Button'

/**
 * Switch component in Paper & Ink design
 * 1.5px ink outline, checked state solid black, smooth spring.
 */
export function Switch({ checked = false, onChange, disabled = false, label, className = '' }) {
  return (
    <label className={cn('inline-flex items-center gap-2.5 select-none cursor-pointer', disabled && 'opacity-50 cursor-not-allowed', className)}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange && onChange(!checked)}
        className={cn(
          'w-10 h-6 rounded-full border-[1.5px] border-ink p-0.5 transition-colors duration-150 relative flex items-center focus-ring',
          checked ? 'bg-ink' : 'bg-paper-sunken'
        )}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          className={cn(
            'w-4 h-4 rounded-full border-[1.25px] border-ink block transition-colors',
            checked ? 'bg-paper translate-x-4 border-paper' : 'bg-paper-raised translate-x-0'
          )}
        />
      </button>
      {label && <span className="text-xs font-medium text-ink">{label}</span>}
    </label>
  )
}
