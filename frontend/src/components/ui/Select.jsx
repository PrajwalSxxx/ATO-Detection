import React from 'react'
import { cn } from './Button'
import { ChevronDown } from 'lucide-react'

/**
 * Select dropdown component
 */
export const Select = React.forwardRef(function Select(
  {
    className,
    label,
    error,
    helperText,
    id,
    disabled,
    options = [],
    children,
    ...props
  },
  ref
) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={selectId}
          className="text-[13px] font-medium text-ink-2 select-none"
        >
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          className={cn(
            'w-full appearance-none bg-paper-raised border border-line-soft rounded-[6px] text-ink text-xs px-3 py-2 pr-9 transition-all cursor-pointer',
            'focus:outline-none focus:border-ink focus:border-[1.5px] focus:shadow-hard-sm',
            'disabled:opacity-50 disabled:bg-paper-sunken disabled:cursor-not-allowed',
            error && 'border-danger focus:border-danger focus:shadow-none',
            className
          )}
          {...props}
        >
          {options.length > 0
            ? options.map((opt) => (
                <option
                  key={opt.value}
                  value={opt.value}
                  className="bg-paper-raised text-ink"
                >
                  {opt.label}
                </option>
              ))
            : children}
        </select>

        <ChevronDown
          className="w-4 h-4 text-ink-3 absolute right-3 pointer-events-none"
          aria-hidden="true"
        />
      </div>

      {error ? (
        <p className="text-xs text-danger font-medium" role="alert">
          {error}
        </p>
      ) : helperText ? (
        <p className="text-xs text-text-muted">{helperText}</p>
      ) : null}
    </div>
  )
})
