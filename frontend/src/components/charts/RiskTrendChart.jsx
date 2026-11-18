import React from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts'
import { Skeleton } from '../ui/Skeleton'
import { EmptyState } from '../ui/EmptyState'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null

  return (
    <div className="bg-paper-raised border border-ink rounded-[8px] p-3 shadow-hard text-xs">
      <div className="font-mono text-ink-3 mb-2 border-b border-line-soft pb-1 text-[11px]">
        {label}
      </div>
      <div className="space-y-1.5">
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full border border-ink/20"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-ink-2 font-medium">{entry.name}:</span>
            </div>
            <span className="font-mono font-semibold text-ink">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function RiskTrendChart({ data = [], isLoading = false, height = 280 }) {
  if (isLoading) {
    return <Skeleton className="w-full rounded-[10px]" style={{ height }} />
  }

  if (!data || data.length === 0) {
    return (
      <div style={{ height }} className="flex items-center justify-center">
        <EmptyState
          title="No trend data"
          description="Risk level trends over time will appear here."
        />
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#DDDAD1" vertical={false} />
          <XAxis
            dataKey="date"
            stroke="#8A8984"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: '#DDDAD1' }}
          />
          <YAxis
            stroke="#8A8984"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: '#DDDAD1' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            wrapperStyle={{ fontSize: '11px', paddingBottom: '10px', fontFamily: 'JetBrains Mono, monospace' }}
          />
          <Line
            type="monotone"
            dataKey="low"
            name="Low Risk"
            stroke="#2F7D5B"
            strokeWidth={1.5}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="medium"
            name="Medium Risk"
            stroke="#B7791F"
            strokeWidth={1.5}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="high"
            name="High/Crit Risk"
            stroke="#B3382C"
            strokeWidth={1.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
