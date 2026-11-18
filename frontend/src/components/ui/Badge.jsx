import React from 'react'
import { cn } from './Button'
import { RISK_COLORS, DECISION_COLORS } from '@/utils/riskColors'

/**
 * Base Badge component
 */
export function Badge({
  children,
  variant = 'default',
  size = 'md',
  className,
  dot = false,
  ...props
}) {
  const variants = {
    default: 'bg-paper-sunken text-ink-2 border border-line-soft',
    brand: 'bg-ink text-paper border border-ink font-semibold',
    accent: 'bg-[#ECE9F9] text-[#5B4BC4] border border-[#5B4BC4]/30',
    success: 'bg-[#E6F1EA] text-[#2F7D5B] border border-[#2F7D5B]/30',
    warning: 'bg-[#F8EFD9] text-[#B7791F] border border-[#B7791F]/30',
    danger: 'bg-[#F6E2DE] text-[#B3382C] border border-[#B3382C]/30',
    critical: 'bg-[#F1D4CF] text-[#8F1D14] border border-[#8F1D14]/30',
  }

  const sizes = {
    sm: 'text-[11px] px-1.5 py-0.5 rounded-[4px] font-medium',
    md: 'text-xs px-2 py-0.5 rounded-[6px] font-medium',
    lg: 'text-xs px-2.5 py-1 rounded-[6px] font-medium',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap select-none',
        variants[variant] || variants.default,
        sizes[size],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className="w-1.5 h-1.5 rounded-full bg-current shrink-0"
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  )
}

/**
 * RiskBadge component: LOW (green), MEDIUM (yellow), HIGH (red), CRITICAL
 */
export function RiskBadge({ level = 'LOW', score, size = 'md', className }) {
  const normLevel = (level || 'LOW').toUpperCase()
  const config = RISK_COLORS[normLevel] || RISK_COLORS.LOW

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded border',
        config.bg,
        config.text,
        config.border,
        size === 'sm' ? 'text-[11px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5',
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
      <span>{config.label}</span>
      {score !== undefined && score !== null && (
        <span className="font-mono text-[11px] opacity-80">({Number(score).toFixed(0)})</span>
      )}
    </span>
  )
}

/**
 * StatusBadge component (open, investigating, resolved, false_positive)
 */
export function StatusBadge({ status = 'open', size = 'md', className }) {
  const normStatus = (status || 'open').toLowerCase()

  const map = {
    open: { variant: 'danger', label: 'Open', dot: true },
    investigating: { variant: 'warning', label: 'Investigating', dot: true },
    resolved: { variant: 'success', label: 'Resolved', dot: true },
    false_positive: { variant: 'default', label: 'False Positive', dot: false },
    active: { variant: 'success', label: 'Active', dot: true },
    inactive: { variant: 'default', label: 'Inactive', dot: false },
    suspended: { variant: 'danger', label: 'Suspended', dot: true },
  }

  const current = map[normStatus] || { variant: 'default', label: status, dot: false }

  return (
    <Badge
      variant={current.variant}
      size={size}
      dot={current.dot}
      className={className}
    >
      {current.label}
    </Badge>
  )
}

/**
 * DecisionBadge component (ALLOW, REQUIRE_MFA, BLOCK)
 */
export function DecisionBadge({ decision = 'ALLOW', size = 'md', className }) {
  const normDecision = (decision || 'ALLOW').toUpperCase()
  const config = DECISION_COLORS[normDecision] || DECISION_COLORS.ALLOW

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-semibold rounded border',
        config.bg,
        config.text,
        config.border,
        size === 'sm' ? 'text-[11px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5',
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
      <span>{config.label}</span>
    </span>
  )
}
