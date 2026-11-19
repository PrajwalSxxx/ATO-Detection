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
      render: (val, row) => {
        const ip = val || row.ip || '—'
        const isClientReported = row.ip_source === 'client_reported' || row.ip_trust_status === 'unverified'
        const isLoopback = row.ip_source === 'loopback' || ip === '127.0.0.1' || ip === '::1'
        const isProxy = row.ip_source === 'trusted_proxy'

        return (
          <div className="flex flex-col gap-1 items-start">
            <CopyableMono text={ip} />
            <div className="flex items-center gap-1">
              {isClientReported && (
                <span
                  title="IP reported by client browser in local development mode — unverified for automated security blocks"
                  className="px-1.5 py-0.2 rounded text-[9px] font-mono font-medium uppercase bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25"
                >
                  DEV REPORTED
                </span>
              )}
              {isLoopback && !isClientReported && (
                <span
                  title="Loopback connection from local machine"
                  className="px-1.5 py-0.2 rounded text-[9px] font-mono font-medium uppercase bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/25"
                >
                  LOOPBACK
                </span>
              )}
              {isProxy && (
                <span
                  title="Resolved through configured trusted proxy"
                  className="px-1.5 py-0.2 rounded text-[9px] font-mono font-medium uppercase bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/25"
                >
                  TRUSTED PROXY
                </span>
              )}
              {!isClientReported && !isLoopback && !isProxy && ip !== '—' && (
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-medium uppercase bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                  DIRECT
                </span>
              )}
            </div>
          </div>
        )
      },
    },
    {
      key: 'location',
      label: 'Location / Network',
      render: (val, row) => {
        let locationText = val
        if (!locationText) {
          if (row.geo_status === 'local_network') {
            locationText = 'Local Network'
          } else if (row.geo_status === 'unavailable') {
            locationText = 'Lookup Unavailable'
          } else if (row.city) {
            locationText = `${row.city}${row.country ? `, ${row.country}` : ''}`
          } else if (row.country) {
            locationText = row.country
          } else {
            locationText = 'Unknown'
          }
        }

        const isTor = row.is_tor || row.tor_status === 'confirmed'
        const isConfirmedVpn = row.vpn_status === 'confirmed'
        const isSuspectedVpn = row.vpn_status === 'suspected' || (!isConfirmedVpn && row.is_vpn)
        const isProxy = row.is_proxy || row.proxy_status === 'confirmed'
        const isDatacenter = row.is_datacenter && !row.is_vpn && !isTor

        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-text-secondary truncate max-w-[140px] block font-mono">
              {locationText}
            </span>
            <div className="flex items-center gap-1 flex-wrap">
              {isTor && (
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-red-600 text-white">
                  TOR
                </span>
              )}
              {isConfirmedVpn && !isTor && (
                <span
                  title="Confirmed commercial VPN exit node"
                  className="px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30"
                >
                  VPN
                </span>
              )}
              {isSuspectedVpn && !isConfirmedVpn && !isTor && (
                <span
                  title="Datacenter/Hosting provider IP indicating potential VPN tunnel"
                  className="px-1.5 py-0.2 rounded text-[9px] font-medium uppercase bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20"
                >
                  HOSTING/VPN
                </span>
              )}
              {isProxy && !row.is_vpn && !isTor && (
                <span className="px-1.5 py-0.2 rounded text-[9px] font-medium uppercase bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  PROXY
                </span>
              )}
              {isDatacenter && (
                <span className="px-1.5 py-0.2 rounded text-[9px] font-medium uppercase bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                  DATACENTER
                </span>
              )}
              {row.impossible_travel && (
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-rose-600 text-white">
                  TRAVEL
                </span>
              )}
            </div>
          </div>
        )
      },
    },
    {
      key: 'client',
      label: 'Device & Client',
      render: (_, row) => {
        const browserLabel = row.browser && row.browser !== 'Unknown'
          ? `${row.browser}${row.browser_version ? ` ${row.browser_version}` : ''}`
          : 'Browser'
        const osLabel = row.os && row.os !== 'Unknown'
          ? `${row.os}${row.os_version ? ` ${row.os_version}` : ''}`
          : 'OS'

        return (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5 text-xs text-text-secondary whitespace-nowrap">
              <span className="font-medium text-text-primary">{browserLabel}</span>
              <span className="text-text-muted">/</span>
              <span>{osLabel}</span>
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
        )
      },
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
      label: 'Decision / MFA',
      render: (val, row) => (
        <div className="flex flex-col gap-1 items-start">
          <DecisionBadge decision={val || 'ALLOW'} size="sm" />
          {row.mfa_phone_masked && (
            <span className="text-[10px] font-mono text-text-muted">
              {row.mfa_phone_masked}
            </span>
          )}
        </div>
      ),
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
