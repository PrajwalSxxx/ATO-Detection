import React from 'react'
import { cn } from './Button'

/**
 * Skeleton loading placeholder with shimmer animation
 */
export function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn(
        'rounded-[6px] skeleton-sweep',
        className
      )}
      {...props}
    />
  )
}

/**
 * Metric card skeleton preset
 */
export function MetricCardSkeleton() {
  return (
    <div className="bg-paper-raised border border-line-soft rounded-[10px] p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-6 w-6 rounded-full" />
      </div>
      <div className="flex items-baseline gap-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-4 w-10" />
      </div>
      <Skeleton className="h-8 w-full" />
    </div>
  )
}

/**
 * Table row skeleton preset
 */
export function TableRowSkeleton({ columns = 5 }) {
  return (
    <tr className="border-b border-line-soft">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="py-3 px-4">
          <Skeleton className="h-4 w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  )
}
