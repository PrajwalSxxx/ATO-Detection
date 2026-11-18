import React, { useEffect, useState } from 'react'
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'
import { cn } from './Button'
import { Sparkline } from './Sparkline'
import { MetricCardSkeleton } from './Skeleton'

/**
 * Animated number count-up hook
 */
function useCountUp(targetValue, duration = 800) {
  const num = Number(targetValue)
  const initial = isNaN(num) ? 0 : num
  const [count, setCount] = useState(initial)

  useEffect(() => {
    const target = Number(targetValue)
    if (isNaN(target)) {
      setCount(0)
      return
    }

    let frameId
    const start = initial
    const end = target
    if (start === end) {
      setCount(end)
      return
    }

    const startTime = performance.now()

    const updateCount = (currentTime) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easedProgress = 1 - Math.pow(1 - progress, 3)
      const current = Math.floor(start + (end - start) * easedProgress)

      setCount(current)

      if (progress < 1) {
        frameId = requestAnimationFrame(updateCount)
      } else {
        setCount(end)
      }
    }

    frameId = requestAnimationFrame(updateCount)
    return () => {
      if (frameId) cancelAnimationFrame(frameId)
    }
  }, [targetValue, duration, initial])

  return count
}

/**
 * MetricCard component
 */
export function MetricCard({
  title,
  value,
  delta, // e.g. +12.5 or -3.2
  deltaLabel, // e.g. "vs yesterday"
  sparklineData,
  sparklineColor = '#161616',
  icon: Icon,
  isLoading = false,
  className,
  valuePrefix = '',
  valueSuffix = '',
}) {
  const isNumeric = typeof value === 'number' || (!isNaN(Number(value)) && value !== null && value !== '' && value !== undefined)
  const displayCount = useCountUp(isNumeric ? Number(value) : 0)

  if (isLoading) {
    return <MetricCardSkeleton />
  }

  const formattedValue = isNumeric
    ? `${valuePrefix}${new Intl.NumberFormat().format(displayCount)}${valueSuffix}`
    : (value ?? '0')

  const hasDelta = delta !== undefined && delta !== null
  const deltaNum = Number(delta)
  const isPositive = deltaNum > 0
  const isNegative = deltaNum < 0
  const isZero = deltaNum === 0

  return (
    <div
      className={cn(
        'bg-paper-raised border border-line-soft rounded-[10px] p-4 flex flex-col justify-between transition-all duration-120 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:border-ink hover:shadow-hard-sm group',
        className
      )}
    >
      {/* Top Row: Title in small caps / uppercase mono + Icon */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[11px] font-mono uppercase tracking-wider text-ink-3 truncate">
          {title}
        </span>
        {Icon && (
          <div className="w-7 h-7 rounded border border-line-soft bg-paper-sunken flex items-center justify-center text-ink group-hover:border-ink transition-colors shrink-0">
            <Icon className="w-3.5 h-3.5" />
          </div>
        )}
      </div>

      {/* Middle Row: Display Serif Number + Delta Chip */}
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <div className="text-3xl sm:text-4xl font-serif font-normal tracking-tight text-ink tabular-nums">
          {formattedValue}
        </div>

        {hasDelta && (
          <div
            className={cn(
              'inline-flex items-center text-[11px] font-mono font-medium px-1.5 py-0.5 rounded-[4px] border',
              isPositive && 'text-[#2F7D5B] bg-[#E6F1EA] border-[#2F7D5B]/30',
              isNegative && 'text-[#B3382C] bg-[#F6E2DE] border-[#B3382C]/30',
              isZero && 'text-ink-3 bg-paper-sunken border-line-soft'
            )}
          >
            {isPositive && <ArrowUpRight className="w-3 h-3 mr-0.5 shrink-0" />}
            {isNegative && <ArrowDownRight className="w-3 h-3 mr-0.5 shrink-0" />}
            {isZero && <Minus className="w-3 h-3 mr-0.5 shrink-0" />}
            <span>
              {isPositive ? '+' : ''}
              {delta}%
            </span>
          </div>
        )}
      </div>

      {/* Bottom Row: Sparkline or Delta label */}
      <div className="mt-auto">
        {sparklineData && sparklineData.length > 0 ? (
          <div className="h-9 -mx-1">
            <Sparkline
              data={sparklineData}
              color={sparklineColor}
              height={36}
            />
          </div>
        ) : deltaLabel ? (
          <div className="text-[11px] font-mono text-ink-3 truncate">
            {deltaLabel}
          </div>
        ) : null}
      </div>
    </div>
  )
}
