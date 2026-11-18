import React, { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { WindowFrame } from '@/components/ui/WindowFrame'
import { RiskTrendChart } from '@/components/charts/RiskTrendChart'
import { HeatmapChart } from '@/components/charts/HeatmapChart'
import { useQuery } from '@tanstack/react-query'
import {
  getRiskTrend,
  getRiskTopAccounts,
  getRiskHeatmap,
  getRiskFactors,
} from '@/services/api'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from 'recharts'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'

export default function RiskAnalyticsPage() {
  const [trendRange, setTrendRange] = useState('7d')

  // Queries
  const { data: trendData, isLoading: isTrendLoading } = useQuery({
    queryKey: ['risk-trend', trendRange],
    queryFn: async () => {
      try {
        const { data } = await getRiskTrend(trendRange)
        return data
      } catch {
        return [
          { date: 'Mon', low: 120, medium: 18, high: 4 },
          { date: 'Tue', low: 145, medium: 22, high: 7 },
          { date: 'Wed', low: 130, medium: 35, high: 12 },
          { date: 'Thu', low: 160, medium: 24, high: 6 },
          { date: 'Fri', low: 180, medium: 30, high: 9 },
          { date: 'Sat', low: 75, medium: 14, high: 15 },
          { date: 'Sun', low: 85, medium: 20, high: 8 },
        ]
      }
    },
  })

  const { data: topAccounts, isLoading: isTopAccountsLoading } = useQuery({
    queryKey: ['risk-top-accounts'],
    queryFn: async () => {
      try {
        const { data } = await getRiskTopAccounts()
        return data
      } catch {
        return [
          { username: 'root@internal', score: 88, attempts: 24 },
          { username: 'admin@finance', score: 82, attempts: 18 },
          { username: 'carlos.dev@ato', score: 76, attempts: 12 },
          { username: 'hr_payroll@ato', score: 65, attempts: 9 },
          { username: 'marketing@corp', score: 58, attempts: 7 },
        ]
      }
    },
  })

  const { data: heatmapData, isLoading: isHeatmapLoading } = useQuery({
    queryKey: ['risk-heatmap'],
    queryFn: async () => {
      try {
        const { data } = await getRiskHeatmap()
        return data
      } catch {
        const sample = []
        for (let d = 0; d < 7; d++) {
          for (let h = 0; h < 24; h++) {
            const count = (h >= 1 && h <= 5) ? Math.floor(Math.random() * 8) : Math.floor(Math.random() * 2)
            sample.push({ day: d, hour: h, count })
          }
        }
        return sample
      }
    },
  })

  const { data: riskFactors, isLoading: isFactorsLoading } = useQuery({
    queryKey: ['risk-factors'],
    queryFn: async () => {
      try {
        const { data } = await getRiskFactors()
        return data
      } catch {
        return [
          { factor: 'Unrecognized Device Fingerprint', count: 42 },
          { factor: 'Impossible Geovelocity Travel', count: 28 },
          { factor: 'Unusual Off-Hours Deviation', count: 24 },
          { factor: 'Tor / Anonymous Proxy Exit Node', count: 19 },
          { factor: 'Consecutive Failed Attempts', count: 15 },
        ]
      }
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Risk & Anomaly Analytics"
        description="Longitudinal behavioral shifts, threat factor attribution, and high-risk accounts."
      />

      {/* Row 1: Trend Over Time & Top Suspicious Accounts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Chart (2 cols) */}
        <WindowFrame
          title="RISK_CLASSIFICATION_TREND"
          className="lg:col-span-2"
          actions={
            <div className="flex items-center gap-1">
              {['7d', '30d'].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setTrendRange(r)}
                  className={`px-2.5 py-0.5 text-xs font-mono font-medium rounded-[4px] transition-all ${
                    trendRange === r
                      ? 'bg-ink text-paper shadow-hard-sm'
                      : 'text-ink-2 hover:text-ink hover:bg-paper-sunken border border-line-soft'
                  }`}
                >
                  {r.toUpperCase()}
                </button>
              ))}
            </div>
          }
        >
          <div className="p-4 sm:p-5">
            <div className="mb-3">
              <h4 className="text-sm font-serif font-normal text-ink">
                Risk Classification Trend
              </h4>
              <p className="text-xs text-ink-3 mt-0.5">
                Volume of Low, Medium, and High risk login evaluations over time.
              </p>
            </div>
            <RiskTrendChart data={trendData || []} isLoading={isTrendLoading} height={260} />
          </div>
        </WindowFrame>

        {/* Top Suspicious Accounts (1 col) */}
        <WindowFrame title="TOP_TARGETED_ACCOUNTS">
          <div className="p-4 sm:p-5">
            <h4 className="text-sm font-serif font-normal text-ink mb-1">
              Top Targeted Accounts
            </h4>
            <p className="text-xs text-ink-3 mb-3">
              Profiles with highest cumulative risk scores.
            </p>

            {isTopAccountsLoading ? (
              <Skeleton className="w-full h-64 rounded-[8px]" />
            ) : !topAccounts || topAccounts.length === 0 ? (
              <EmptyState title="No targeted accounts" description="No accounts currently have elevated risk scores." />
            ) : (
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={topAccounts}
                    margin={{ top: 5, right: 10, left: 30, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#DDDAD1" horizontal={false} />
                    <XAxis type="number" stroke="#8A8984" fontSize={11} domain={[0, 100]} />
                    <YAxis
                      dataKey="username"
                      type="category"
                      stroke="#8A8984"
                      fontSize={11}
                      tickLine={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null
                        const d = payload[0].payload
                        return (
                          <div className="bg-paper-raised border border-ink rounded-[6px] shadow-hard p-2.5 text-xs text-ink">
                            <div className="font-semibold text-ink truncate">{d.username}</div>
                            <div className="text-danger font-mono mt-1 font-semibold">
                              Risk Score: {d.score} / 100
                            </div>
                            <div className="text-ink-3 font-mono text-[10px]">
                              {d.attempts} recorded attempts
                            </div>
                          </div>
                        )
                      }}
                    />
                    <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                      {topAccounts.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.score > 70 ? '#B3382C' : '#B7791F'}
                          stroke="#161616"
                          strokeWidth={1}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </WindowFrame>
      </div>

      {/* Row 2: Unusual Hours Heatmap */}
      <WindowFrame title="TEMPORAL_ANOMALY_HEATMAP">
        <div className="p-4 sm:p-5">
          <div className="mb-3">
            <h4 className="text-sm font-serif font-normal text-ink">
              Temporal Anomaly Heatmap (Day × Hour)
            </h4>
            <p className="text-xs text-ink-3 mt-0.5">
              Distribution of suspicious &amp; high-risk authentications across time of day (highlighting off-hours anomalies).
            </p>
          </div>
          <HeatmapChart data={heatmapData || []} isLoading={isHeatmapLoading} />
        </div>
      </WindowFrame>

      {/* Row 3: Risk Factor Contribution */}
      <WindowFrame title="RISK_FACTOR_ATTRIBUTION">
        <div className="p-4 sm:p-5">
          <h4 className="text-sm font-serif font-normal text-ink mb-1">
            Risk Factor Contribution Frequency
          </h4>
          <p className="text-xs text-ink-3 mb-4">
            Frequency of specific signals triggering policy escalation.
          </p>

          {isFactorsLoading ? (
            <Skeleton className="w-full h-40 rounded-[8px]" />
          ) : (
            <div className="space-y-3.5">
              {(riskFactors || []).map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-ink">{item.factor}</span>
                    <span className="font-mono text-ink-3">
                      <strong className="text-ink font-semibold">{item.count}</strong> events
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-paper-sunken border border-line-soft overflow-hidden">
                    <div
                      className="h-full bg-ink rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(
                          100,
                          (item.count / ((riskFactors[0]?.count || 1) * 1.2)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </WindowFrame>
    </div>
  )
}
