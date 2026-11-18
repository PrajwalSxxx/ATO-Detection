import React from 'react'
import { cn } from './Button'

export function Card({ className, children, hardShadow = false, hoverLift = false, ...props }) {
  return (
    <div
      className={cn(
        'bg-paper-raised border border-line-soft rounded-[10px] p-4 md:p-5 transition-all duration-120',
        hardShadow && 'border-[1.5px] border-ink shadow-hard',
        hoverLift && 'hover:-translate-x-0.5 hover:-translate-y-0.5 hover:border-ink hover:shadow-hard-sm cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, children, ...props }) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 pb-3 mb-3 border-b border-line-soft',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardTitle({ className, children, ...props }) {
  return (
    <h3
      className={cn('text-sm md:text-base font-semibold text-ink tracking-tight', className)}
      {...props}
    >
      {children}
    </h3>
  )
}

export function CardDescription({ className, children, ...props }) {
  return (
    <p className={cn('text-xs text-ink-2 mt-0.5', className)} {...props}>
      {children}
    </p>
  )
}

export function CardContent({ className, children, ...props }) {
  return (
    <div className={cn('', className)} {...props}>
      {children}
    </div>
  )
}
