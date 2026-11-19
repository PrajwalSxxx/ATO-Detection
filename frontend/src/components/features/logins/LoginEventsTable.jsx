import React from 'react'
import { DataTable } from '@/components/ui/DataTable'
import { RiskBadge, DecisionBadge, Badge } from '@/components/ui/Badge'
import { CopyableMono } from '@/components/ui/CopyableMono'
import { formatDateTime } from '@/utils/formatters'
import { getRiskColorByScore } from '@/utils/riskColors'

export function LoginEventsTable({
  logins = [],
  isLoading = false,
  onRowClick,
  sortColumn,
  sortDirection,
  onSort,
}) {
  const columns = [
    {
      key: 'user',
      label: 'User',
      render: (_, row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-text-primary truncate max-w-[140px]">
            {row.username || row.user_email || row.user_id || 'Unknown'}
          </span>
          {row.is_simulated && (
            <span className="text-[10px] text-accent font-medium">SIMULATED</span>
          )}
        </div>
      ),
    },
    {
      key: 'timestamp',
      label: 'Timestamp',
      sortable: true,
      render: (val, row) => (
        <span className="font-mono text-xs text-text-secondary whitespace-nowrap">
          {formatDateTime(val || row.created_at)}
        </span>
      ),
    },
    {
      key: 'ip_address',
      label: 'IP Address',
      render: (val, row) => (
        <CopyableMono text={val || row.ip || '—'} />
      ),
    },
    {
      key: 'location',
      label: 'Location / Network',
      render: (val, row) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-text-secondary truncate max-w-[130px] block font-mono">
            {val || (row.city ? `${row.city}, ${row.country || ''}` : 'Unknown')}
          </span>
          <div className="flex items-center gap-1 flex-wrap">
            {row.is_tor && (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-red-600 text-white">
                TOR
              </span>
            )}
            {row.is_vpn && !row.is_tor && (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-medium uppercase bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                VPN
              </span>
            )}
            {row.is_proxy && !row.is_vpn && !row.is_tor && (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-medium uppercase bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                PROXY
              </span>
            )}
            {row.impossible_travel && (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-rose-600 text-white">
                TRAVEL
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'client',
      label: 'Device & Client',
      render: (_, row) => (
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5 text-xs text-text-secondary whitespace-nowrap">
            <span>{row.browser || 'Browser'} / {row.os || 'OS'}</span>
            {row.is_new_device && (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                NEW
              </span>
            )}
          </div>
          {row.device_category && (
            <span className="text-[10px] text-text-muted capitalize">{row.device_category}</span>
          )}
        </div>
      ),
    },
    {
      key: 'risk_score',
      label: 'Risk Score',
      sortable: true,
      render: (val) => {
        const score = Number(val) || 0
        const color = getRiskColorByScore(score)
        return (
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 rounded-full bg-bg-elevated overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, Math.max(5, score))}%`,
                  backgroundColor: color.hex,
                }}
              />
            </div>
            <span className="font-mono text-xs font-semibold text-text-primary">
              {score.toFixed(0)}
            </span>
          </div>
        )
      },
    },
    {
      key: 'risk_level',
      label: 'Risk',
      render: (val, row) => (
        <RiskBadge level={val} score={row.risk_score} size="sm" />
      ),
    },
    {
      key: 'decision',
      label: 'Decision',
      render: (val) => <DecisionBadge decision={val || 'ALLOW'} size="sm" />,
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={logins}
      isLoading={isLoading}
      onRowClick={onRowClick}
      sortColumn={sortColumn}
      sortDirection={sortDirection}
      onSort={onSort}
      emptyTitle="No login events found"
      emptyDescription="No events match your current filters."
    />
  )
}
