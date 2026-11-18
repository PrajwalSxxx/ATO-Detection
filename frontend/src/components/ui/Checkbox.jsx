import React from 'react'
import { Check } from 'lucide-react'
import { cn } from './Button'

/**
 * Checkbox component in Paper & Ink design
 * 1.5px ink outline, checked state solid black with paper checkmark.
 */
export function Checkbox({ checked = false, onChange, disabled = false, label, id, className = '' }) {
  const checkboxId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

  return (
    <label
      htmlFor={checkboxId}
      className={cn(
        'inline-flex items-center gap-2 select-none cursor-pointer',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <div className="relative flex items-center justify-center">
        <input
          id={checkboxId}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange && onChange(e.target.checked)}
          className="sr-only"
        />
        <div
          className={cn(
            'w-4 h-4 rounded-[4px] border-[1.5px] border-ink flex items-center justify-center transition-all duration-100',
            checked ? 'bg-ink text-paper' : 'bg-paper-raised text-transparent hover:bg-paper-hover'
          )}
        >
          <Check className="w-3 h-3 stroke-[2.5]" />
        </div>
      </div>
      {label && <span className="text-xs font-medium text-ink">{label}</span>}
    </label>
  )
}
