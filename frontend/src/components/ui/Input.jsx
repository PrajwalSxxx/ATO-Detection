import React from 'react'
import { cn } from './Button'

/**
 * Input component with label, error, helper text, and icon slots.
 */
export const Input = React.forwardRef(function Input(
  {
    className,
    label,
    error,
    helperText,
    leftIcon,
    rightIcon,
    id,
    disabled,
    required,
    type = 'text',
    ...props
  },
  ref
) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)
  const errorId = inputId ? `${inputId}-error` : undefined
  const helperId = inputId ? `${inputId}-helper` : undefined

  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-[13px] font-medium text-ink-2 select-none flex items-center justify-between"
        >
          <span>
            {label}
            {required && <span className="text-danger ml-1">*</span>}
          </span>
        </label>
      )}

      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3 text-ink-3 pointer-events-none flex items-center justify-center">
            {leftIcon}
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          type={type}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={
            error ? errorId : helperText ? helperId : undefined
          }
          className={cn(
            'w-full bg-paper-raised border border-line-soft rounded-[6px] text-ink text-xs px-3 py-2 transition-all placeholder:text-ink-3',
            'focus:outline-none focus:border-ink focus:border-[1.5px] focus:shadow-hard-sm',
            'disabled:opacity-50 disabled:bg-paper-sunken disabled:cursor-not-allowed',
            leftIcon && 'pl-9',
            rightIcon && 'pr-9',
            error && 'border-danger focus:border-danger focus:shadow-none',
            className
          )}
          {...props}
        />

        {rightIcon && (
          <div className="absolute right-3 text-ink-3 flex items-center justify-center">
            {rightIcon}
          </div>
        )}
      </div>

      {error ? (
        <p id={errorId} className="text-xs text-danger font-medium flex items-center gap-1" role="alert">
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-xs text-ink-3">
          {helperText}
        </p>
      ) : null}
    </div>
  )
})
