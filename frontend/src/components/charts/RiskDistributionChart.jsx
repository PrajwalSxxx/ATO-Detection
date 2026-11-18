import React from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts'
import { Skeleton } from '../ui/Skeleton'
import { EmptyState } from '../ui/EmptyState'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null
  const data = payload[0]

  return (
    <div className="bg-paper-raised border border-ink rounded-[8px] p-2.5 shadow-hard text-xs">
      <div className="font-mono text-ink-3 mb-1 border-b border-line-soft pb-1 text-[11px]">
        Band: {label}
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-ink-2">Logins:</span>
        <span className="font-mono font-semibold text-ink">{data.value}</span>
      </div>
    </div>
  )
}

function getBarColor(rangeLabel) {
  const start = parseInt(rangeLabel, 10)
  if (isNaN(start) || start <= 30) return '#2F7D5B'
  if (start <= 70) return '#B7791F'
  return '#B3382C'
}

export function RiskDistributionChart({ data = [], isLoading = false, height = 240 }) {
  if (isLoading) {
    return <Skeleton className="w-full rounded-[10px]" style={{ height }} />
  }

  // Normalize data into an array of { bucket, count }
  let chartData = []
  if (Array.isArray(data)) {
    chartData = data.map((d) => ({
      bucket: d.bucket || d.range || d.name || '0–30',
      count: Number(d.count || d.value || 0),
    }))
  } else if (data && typeof data === 'object') {
    chartData = [
      { bucket: '0–30 Low', count: Number(data.low || 0) },
      { bucket: '31–50 Med', count: Number(data.medium || 0) },
      { bucket: '51–70 High', count: Number(data.high || 0) },
      { bucket: '71–100 Crit', count: Number(data.critical || 0) },
    ]
  }

  const hasData = chartData.some((d) => d.count > 0)
  if (!hasData) {
    return (
      <div style={{ height }} className="flex items-center justify-center">
        <EmptyState
          title="No distribution data"
          description="Risk score distribution data is not yet available."
        />
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#DDDAD1" vertical={false} />
          <XAxis
            dataKey="bucket"
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
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell
                key={`bar-${index}`}
                fill={getBarColor(entry.bucket)}
                stroke="#161616"
                strokeWidth={1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
