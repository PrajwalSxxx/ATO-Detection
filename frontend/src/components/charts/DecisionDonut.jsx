import React from 'react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts'
import { Skeleton } from '../ui/Skeleton'
import { EmptyState } from '../ui/EmptyState'

const COLORS = {
  ALLOW: '#2F7D5B',
  REQUIRE_MFA: '#B7791F',
  BLOCK: '#B3382C',
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null
  const data = payload[0]

  return (
    <div className="bg-paper-raised border border-ink rounded-[8px] p-2.5 shadow-hard text-xs">
      <div className="flex items-center gap-2">
        <span
          className="w-2.5 h-2.5 rounded-full border border-ink/20"
          style={{ backgroundColor: data.payload.fill || data.color }}
        />
        <span className="font-medium text-ink">{data.name}:</span>
        <span className="font-mono text-ink font-semibold">
          {data.value} ({data.payload.percent ? (data.payload.percent * 100).toFixed(1) : ''}%)
        </span>
      </div>
    </div>
  )
}

export function DecisionDonut({ data = [], isLoading = false, height = 240 }) {
  if (isLoading) {
    return <Skeleton className="w-full rounded-[10px]" style={{ height }} />
  }

  // Normalize data if object or array
  let rawList = []
  if (Array.isArray(data)) {
    rawList = data
  } else if (data && typeof data === 'object') {
    rawList = [
      { name: 'ALLOW', value: Number(data.allow || 0) },
      { name: 'REQUIRE_MFA', value: Number(data.mfa || 0) },
      { name: 'BLOCK', value: Number(data.block || 0) },
    ]
  }

  const chartData = rawList.filter((d) => Number(d.value) > 0)
  const total = chartData.reduce((acc, curr) => acc + Number(curr.value), 0)

  if (chartData.length === 0 || total === 0) {
    return (
      <div style={{ height }} className="flex items-center justify-center">
        <EmptyState
          title="No decisions recorded"
          description="Decision breakdown will appear as logins occur."
        />
      </div>
    )
  }

  // Add percentage
  const formattedData = chartData.map((d) => ({
    ...d,
    percent: total > 0 ? Number(d.value) / total : 0,
    fill: COLORS[d.name] || '#161616',
  }))

  return (
    <div style={{ width: '100%', height }} className="relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            align="center"
            iconType="circle"
            wrapperStyle={{ fontSize: '11px', paddingTop: '8px', color: '#161616', fontFamily: 'JetBrains Mono, monospace' }}
          />
          <Pie
            data={formattedData}
            cx="50%"
            cy="45%"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={3}
            dataKey="value"
          >
            {formattedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} stroke="#161616" strokeWidth={1.5} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      {/* Center Label */}
      <div className="absolute top-[42%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
        <div className="text-2xl font-serif text-ink font-normal">{total}</div>
        <div className="text-[10px] text-ink-3 uppercase font-mono tracking-wider">Total</div>
      </div>
    </div>
  )
}
