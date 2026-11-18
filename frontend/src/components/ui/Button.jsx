import React from 'react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { Loader2 } from 'lucide-react'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * Button component supporting multiple variants, sizes, and loading state.
 *
 * @param {Object} props
 * @param {'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'} [props.variant='primary']
 * @param {'sm' | 'md' | 'lg'} [props.size='md']
 * @param {boolean} [props.isLoading=false]
 * @param {boolean} [props.disabled=false]
 * @param {React.ReactNode} [props.leftIcon]
 * @param {React.ReactNode} [props.rightIcon]
 * @param {React.ReactNode} props.children
 */
export const Button = React.forwardRef(function Button(
  {
    className,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    disabled = false,
    leftIcon,
    rightIcon,
    children,
    type = 'button',
    ...props
  },
  ref
) {
  const baseStyles =
    'inline-flex items-center justify-center font-medium transition-all duration-120 rounded-[8px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none focus-ring'

  const variants = {
    primary:
      'bg-ink text-paper font-medium hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-sm active:translate-x-0 active:translate-y-0 active:shadow-none border border-ink',
    secondary:
      'bg-paper-raised text-ink border border-ink hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-sm active:translate-x-0 active:translate-y-0 active:shadow-none',
    outline:
      'bg-paper-raised text-ink border border-line-soft hover:border-ink hover:bg-paper-hover active:scale-[0.99]',
    ghost:
      'bg-transparent text-ink-2 hover:text-ink hover:bg-paper-hover active:bg-paper-sunken',
    danger:
      'bg-danger-tint text-danger border border-danger hover:bg-danger hover:text-white hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-sm active:translate-x-0 active:translate-y-0',
  }

  const sizes = {
    sm: 'text-xs px-2.5 py-1 gap-1.5 h-8',
    md: 'text-xs px-3.5 py-1.5 gap-2 h-9',
    lg: 'text-sm px-4 py-2 gap-2 h-11',
  }

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  )
})
