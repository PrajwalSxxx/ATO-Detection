import React, { useEffect, useState } from 'react'
import { getRiskColorByScore } from '@/utils/riskColors'

/**
 * RiskGauge - SVG radial gauge from 0 to 100
 */
export function RiskGauge({ score = 0, size = 160, strokeWidth = 14, showLabel = true }) {
  const [animatedScore, setAnimatedScore] = useState(0)

  const numScore = Math.min(100, Math.max(0, Number(score) || 0))

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedScore(numScore)
    }, 50)
    return () => clearTimeout(timer)
  }, [numScore])

  const radius = (size - strokeWidth) / 2
  // We make a 240 degree arc gauge (-210 to +30 degrees)
  const circumference = 2 * Math.PI * radius
  const arcLength = circumference * (240 / 360)
  const strokeDashoffset = arcLength - (arcLength * animatedScore) / 100

  const riskInfo = getRiskColorByScore(numScore)

  return (
    <div
      className="relative inline-flex flex-col items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="rotate-[150deg] transform"
      >
        {/* Background Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#DDDAD1"
          strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeLinecap="round"
        />
        {/* Animated Filled Arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={riskInfo.hex}
          strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-serif font-normal text-ink tracking-tight">
          {animatedScore.toFixed(0)}
        </span>
        <span className="text-[11px] font-mono text-ink-3">/ 100</span>
        {showLabel && (
          <span
            className="text-[11px] font-mono font-medium uppercase tracking-wider mt-1 px-2 py-0.5 rounded-[4px] border"
            style={{ color: riskInfo.hex, backgroundColor: riskInfo.tint || '#F1EFE9', borderColor: `${riskInfo.hex}40` }}
          >
            {riskInfo.label} Risk
          </span>
        )}
      </div>
    </div>
  )
}
