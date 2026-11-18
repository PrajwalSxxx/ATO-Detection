import React from 'react'
import { ResponsiveContainer, LineChart, Line } from 'recharts'

export function Sparkline({ data = [], color = '#38BDF8', height = 36 }) {
  if (!data || data.length === 0) return null

  // Ensure format is [{ value: number }]
  const chartData = data.map((d, i) => (typeof d === 'number' ? { value: d } : d))

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={true}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
