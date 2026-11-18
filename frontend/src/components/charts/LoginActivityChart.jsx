import React from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
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

export function LoginActivityChart({
  data = [],
  isLoading = false,
  range = '24h',
  onRangeChange,
  height = 280,
}) {
  const chartData = Array.isArray(data)
    ? data.map((d) => ({
        ...d,
        timestamp: d.timestamp || (d.hour ? (d.hour.includes(' ') ? d.hour.split(' ')[1] : d.hour) : '—'),
        successful: Number(d.successful || 0),
        suspicious: Number(d.suspicious || 0),
        blocked: Number(d.blocked || (d.failed ? d.failed : 0)),
      }))
    : []

  return (
    <div className="w-full">
      {/* Range Filter Controls */}
      {onRangeChange && (
        <div className="flex items-center justify-end gap-1 mb-3">
          {['24h', '7d', '30d'].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onRangeChange(r)}
              className={`px-2.5 py-1 text-xs font-mono font-medium rounded-[6px] transition-all ${
                range === r
                  ? 'bg-ink text-paper shadow-hard-sm'
                  : 'text-ink-2 hover:text-ink hover:bg-paper-sunken border border-line-soft'
              }`}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <Skeleton className="w-full rounded-[10px]" style={{ height }} />
      ) : chartData.length === 0 ? (
        <div style={{ height }} className="flex items-center justify-center">
          <EmptyState
            title="No login activity"
            description="No login events recorded for this time range."
          />
        </div>
      ) : (
        <div style={{ width: '100%', height }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSuccessful" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2F7D5B" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#2F7D5B" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorSuspicious" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#B7791F" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#B7791F" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorBlocked" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#B3382C" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#B3382C" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#DDDAD1" vertical={false} />
              <XAxis
                dataKey="timestamp"
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
              <Area
                type="monotone"
                dataKey="successful"
                name="Successful"
                stroke="#2F7D5B"
                strokeWidth={1.5}
                fillOpacity={1}
                fill="url(#colorSuccessful)"
              />
              <Area
                type="monotone"
                dataKey="suspicious"
                name="Suspicious"
                stroke="#B7791F"
                strokeWidth={1.5}
                fillOpacity={1}
                fill="url(#colorSuspicious)"
              />
              <Area
                type="monotone"
                dataKey="blocked"
                name="Blocked"
                stroke="#B3382C"
                strokeWidth={1.5}
                fillOpacity={1}
                fill="url(#colorBlocked)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
