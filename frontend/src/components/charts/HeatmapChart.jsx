import React, { useState } from 'react'
import { Skeleton } from '../ui/Skeleton'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOURS = Array.from({ length: 24 }, (_, i) => i)

export function HeatmapChart({ data = [], isLoading = false }) {
  const [hoveredCell, setHoveredCell] = useState(null)

  if (isLoading) {
    return <Skeleton className="w-full h-64 rounded-[10px]" />
  }

  // data format: [{ day: 0-6, hour: 0-23, count: number }, ...]
  const maxCount = Math.max(1, ...(data.map((d) => d.count || 0)))

  // Create lookup matrix: [day][hour] = count
  const matrix = Array.from({ length: 7 }, () => Array(24).fill(0))
  data.forEach((d) => {
    if (d.day >= 0 && d.day < 7 && d.hour >= 0 && d.hour < 24) {
      matrix[d.day][d.hour] = d.count || 0
    }
  })

  // Paper & Ink tonal scale
  const getCellBg = (count) => {
    if (count === 0) return 'bg-paper-sunken border border-line-soft/60'
    const intensity = count / maxCount
    if (intensity < 0.25) return 'bg-[#161616]/15 border border-[#161616]/30'
    if (intensity < 0.5) return 'bg-[#161616]/35 border border-[#161616]/50'
    if (intensity < 0.75) return 'bg-[#161616]/65 border border-[#161616]'
    return 'bg-[#161616] border border-[#161616]'
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[640px] flex flex-col gap-1.5">
        {/* Hours Header */}
        <div className="flex items-center gap-1 pl-12 text-[10px] font-mono text-ink-3">
          {HOURS.map((h) => (
            <div key={h} className="flex-1 text-center">
              {h % 3 === 0 ? `${h}h` : ''}
            </div>
          ))}
        </div>

        {/* Heatmap Grid Rows */}
        {DAYS.map((dayName, dayIdx) => (
          <div key={dayName} className="flex items-center gap-1">
            <span className="w-10 text-[11px] font-mono text-ink-2 shrink-0 text-right pr-2">
              {dayName}
            </span>
            <div className="flex-1 flex items-center gap-1">
              {HOURS.map((hour) => {
                const count = matrix[dayIdx][hour]
                const isHovered =
                  hoveredCell &&
                  hoveredCell.day === dayIdx &&
                  hoveredCell.hour === hour

                return (
                  <div
                    key={hour}
                    onMouseEnter={() => setHoveredCell({ day: dayIdx, hour, count })}
                    onMouseLeave={() => setHoveredCell(null)}
                    className={`flex-1 h-6 rounded-[3px] cursor-pointer transition-all duration-100 ${getCellBg(
                      count
                    )} ${isHovered ? 'ring-2 ring-ink scale-110 z-10' : ''}`}
                    title={`${dayName} at ${hour}:00 - ${count} events`}
                  />
                )
              })}
            </div>
          </div>
        ))}

        {/* Legend & Hover Info */}
        <div className="flex items-center justify-between pt-3 mt-2 border-t border-line-soft text-xs text-ink-3 font-mono">
          <div className="flex items-center gap-2">
            <span>Low</span>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-[2px] bg-paper-sunken border border-line-soft" />
              <span className="w-3 h-3 rounded-[2px] bg-[#161616]/15" />
              <span className="w-3 h-3 rounded-[2px] bg-[#161616]/35" />
              <span className="w-3 h-3 rounded-[2px] bg-[#161616]/65" />
              <span className="w-3 h-3 rounded-[2px] bg-[#161616]" />
            </div>
            <span>High Density</span>
          </div>

          <div className="font-mono text-xs text-ink h-4">
            {hoveredCell ? (
              <span>
                {DAYS[hoveredCell.day]} at {hoveredCell.hour}:00 —{' '}
                <strong className="text-ink font-bold">{hoveredCell.count}</strong> events
              </span>
            ) : (
              <span className="text-ink-3">Hover cell to inspect hourly density</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
