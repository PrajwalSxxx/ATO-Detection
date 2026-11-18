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
      label: 'Location',
      render: (val, row) => (
        <span className="text-xs text-text-secondary truncate max-w-[120px] block">
          {val || (row.city ? `${row.city}, ${row.country || ''}` : 'Unknown')}
        </span>
      ),
    },
    {
      key: 'client',
      label: 'Browser / OS',
      render: (_, row) => (
        <span className="text-xs text-text-secondary whitespace-nowrap">
          {row.browser || 'Browser'} / {row.os || 'OS'}
        </span>
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
