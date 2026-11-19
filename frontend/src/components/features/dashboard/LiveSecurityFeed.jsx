import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Radio,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Laptop,
  Tablet,
  Globe,
  ArrowRight,
  Wifi,
  Eye,
  Filter,
  RefreshCw,
  AlertOctagon,
  Zap,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { formatDistanceToNow } from 'date-fns'

export function LiveSecurityFeed({
  events = [],
  status = 'connected',
  onRefresh,
}) {
  const [filterType, setFilterType] = useState('all') // 'all' | 'threats' | 'new_device' | 'vpn_tor'
  const [expandedId, setExpandedId] = useState(null)

  const filteredEvents = events.filter((evt) => {
    if (filterType === 'threats') {
      return (
        evt.threats?.is_vpn ||
        evt.threats?.is_tor ||
        evt.threats?.is_proxy ||
        evt.location?.impossible_travel ||
        (evt.risk?.score || 0) >= 70
      )
    }
    if (filterType === 'new_device') {
      return evt.device?.is_new
    }
    if (filterType === 'vpn_tor') {
      return evt.threats?.is_vpn || evt.threats?.is_tor
    }
    return true
  })

  const getDeviceIcon = (category) => {
    const cat = String(category || '').toLowerCase()
    if (cat === 'mobile' || cat === 'smartphone') return <Smartphone className="w-3.5 h-3.5 text-ink-2" />
    if (cat === 'tablet') return <Tablet className="w-3.5 h-3.5 text-ink-2" />
    return <Laptop className="w-3.5 h-3.5 text-ink-2" />
  }

  const getRiskBadgeVariant = (score) => {
    if (score >= 70) return 'danger'
    if (score >= 30) return 'warning'
    return 'success'
  }

  const getDecisionBadge = (decision) => {
    const d = String(decision || 'ALLOW').toUpperCase()
    if (d === 'BLOCK' || d === 'BLOCKED') {
      return <Badge variant="danger" className="text-[10px] uppercase font-mono tracking-wider font-semibold">BLOCK</Badge>
    }
    if (d === 'MFA' || d === 'REQUIRE_MFA') {
      return <Badge variant="warning" className="text-[10px] uppercase font-mono tracking-wider font-semibold">MFA</Badge>
    }
    return <Badge variant="success" className="text-[10px] uppercase font-mono tracking-wider font-semibold">ALLOW</Badge>
  }

  return (
    <div className="bg-paper-raised border border-line-soft rounded-xl shadow-xs overflow-hidden">
      {/* Header Bar */}
      <div className="px-5 py-4 border-b border-line-soft flex flex-wrap items-center justify-between gap-3 bg-paper/50">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-ink/5 border border-line-soft flex items-center justify-center">
            <Radio className="w-4 h-4 text-ink animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-ink font-heading">
                Live ITDR Security Event Stream
              </h3>
              {/* Connection Status Indicator */}
              {status === 'connected' && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  WS: LIVE
                </span>
              )}
              {status === 'polling' && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  HTTP: POLLING
                </span>
              )}
              {status === 'connecting' && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  CONNECTING
                </span>
              )}
              {status === 'reconnecting' && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  RECONNECTING
                </span>
              )}
            </div>
            <p className="text-xs text-ink-3">
              Real-time authentication telemetry, behavioral anomalies, and active IP intelligence
            </p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2">
          <div className="inline-flex bg-paper-sunken p-0.5 rounded-lg border border-line-soft text-xs">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                filterType === 'all'
                  ? 'bg-paper-raised text-ink shadow-xs border border-line-soft font-semibold'
                  : 'text-ink-3 hover:text-ink'
              }`}
            >
              All ({events.length})
            </button>
            <button
              onClick={() => setFilterType('threats')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                filterType === 'threats'
                  ? 'bg-paper-raised text-ink shadow-xs border border-line-soft font-semibold'
                  : 'text-ink-3 hover:text-ink'
              }`}
            >
              Threats
            </button>
            <button
              onClick={() => setFilterType('new_device')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                filterType === 'new_device'
                  ? 'bg-paper-raised text-ink shadow-xs border border-line-soft font-semibold'
                  : 'text-ink-3 hover:text-ink'
              }`}
            >
              New Devices
            </button>
            <button
              onClick={() => setFilterType('vpn_tor')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                filterType === 'vpn_tor'
                  ? 'bg-paper-raised text-ink shadow-xs border border-line-soft font-semibold'
                  : 'text-ink-3 hover:text-ink'
              }`}
            >
              VPN / Tor
            </button>
          </div>

          {onRefresh && (
            <button
              onClick={onRefresh}
              title="Refresh events"
              className="p-1.5 rounded-lg border border-line-soft hover:bg-paper-hover text-ink-2 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Events Table / List */}
      <div className="divide-y divide-line-soft max-h-[440px] overflow-y-auto">
        {filteredEvents.length === 0 ? (
          <div className="py-12 text-center text-ink-3 text-sm">
            <Radio className="w-8 h-8 mx-auto mb-2 opacity-30 text-ink" />
            <p className="font-medium text-ink-2">No security events matching filter</p>
            <p className="text-xs text-ink-3 mt-1">Events will appear here automatically when logins occur</p>
          </div>
        ) : (
          filteredEvents.map((evt) => {
            const isExpanded = expandedId === (evt.event_id || evt.id)
            const isTor = evt.threats?.is_tor
            const isVpn = evt.threats?.is_vpn && !isTor
            const isProxy = evt.threats?.is_proxy && !isTor && !isVpn
            const isDc = evt.threats?.is_datacenter
            const isNewDev = evt.device?.is_new
            const isImpossible = evt.location?.impossible_travel
            const riskScore = evt.risk?.score ?? 0

            return (
              <div
                key={evt.event_id || evt.id || Math.random()}
                className={`transition-colors hover:bg-paper/40 ${
                  isTor || isImpossible
                    ? 'bg-rose-500/[0.02]'
                    : isExpanded
                    ? 'bg-paper-hover/30'
                    : ''
                }`}
              >
                <div
                  onClick={() => setExpandedId(isExpanded ? null : (evt.event_id || evt.id))}
                  className="px-5 py-3 cursor-pointer flex flex-wrap items-center justify-between gap-3 text-xs"
                >
                  {/* Left: User & Device Identity */}
                  <div className="flex items-center gap-3 min-w-[220px]">
                    <div
                      className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${
                        riskScore >= 70
                          ? 'border-rose-300 bg-rose-50 dark:bg-rose-950/30 text-rose-600'
                          : riskScore >= 30
                          ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/30 text-amber-600'
                          : 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600'
                      }`}
                    >
                      {getDeviceIcon(evt.device?.category)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-ink font-mono text-xs truncate max-w-[160px]">
                          {evt.email || evt.user_id || 'Unknown user'}
                        </span>
                        {isNewDev && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                            NEW
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-ink-3 font-mono">
                        {evt.device?.category || 'desktop'} • {evt.ip_address}
                      </div>
                    </div>
                  </div>

                  {/* Middle: Geolocation & Travel info */}
                  <div className="flex items-center gap-2 text-ink-2 min-w-[190px]">
                    <Globe className="w-3.5 h-3.5 text-ink-3 shrink-0" />
                    <div>
                      {evt.location?.prev_city && evt.location?.city && evt.location?.prev_city !== evt.location?.city ? (
                        <div className="flex items-center gap-1 font-mono text-[11px]">
                          <span className="text-ink-3">{evt.location.prev_city}</span>
                          <ArrowRight className="w-2.5 h-2.5 text-ink-3" />
                          <span className="font-semibold text-ink">{evt.location.city}, {evt.location.country}</span>
                        </div>
                      ) : (
                        <div className="font-mono text-[11px] text-ink">
                          {evt.location?.city ? `${evt.location.city}, ` : ''}{evt.location?.country || 'Unknown'}
                        </div>
                      )}
                      {evt.location?.distance_km > 0 && (
                        <div className="text-[10px] text-ink-3 font-mono">
                          {Math.round(evt.location.distance_km)} km away
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Threats & Badges */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {isTor && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-red-600 text-white animate-pulse">
                        TOR EXIT NODE
                      </span>
                    )}
                    {isVpn && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium uppercase tracking-wider bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                        VPN
                      </span>
                    )}
                    {isProxy && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                        PROXY
                      </span>
                    )}
                    {isDc && !isVpn && !isTor && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium uppercase tracking-wider bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                        HOSTING
                      </span>
                    )}
                    {isImpossible && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-rose-600 text-white flex items-center gap-1">
                        <Zap className="w-2.5 h-2.5" />
                        IMPOSSIBLE TRAVEL
                      </span>
                    )}
                  </div>

                  {/* Decision & Risk Score */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-[10px] text-ink-3 uppercase font-mono">Risk</span>
                        <Badge variant={getRiskBadgeVariant(riskScore)} className="font-mono text-xs px-1.5 py-0">
                          {riskScore}
                        </Badge>
                      </div>
                      <div className="text-[10px] text-ink-3 font-mono mt-0.5">
                        {evt.timestamp ? formatDistanceToNow(new Date(evt.timestamp), { addSuffix: true }) : 'just now'}
                      </div>
                    </div>
                    {getDecisionBadge(evt.risk?.decision)}
                  </div>
                </div>

                {/* Expanded Details Drawer */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="px-5 py-3.5 bg-paper-sunken border-t border-line-soft text-xs grid grid-cols-1 md:grid-cols-3 gap-4"
                    >
                      {/* Column 1: Device Fingerprint Details */}
                      <div className="space-y-1.5">
                        <p className="font-semibold text-ink font-heading text-[11px] uppercase tracking-wider text-ink-2">
                          Device Intelligence
                        </p>
                        <div className="text-[11px] font-mono space-y-1">
                          <div>
                            <span className="text-ink-3">Fingerprint: </span>
                            <span className="text-ink break-all font-mono text-[10px]">
                              {evt.device?.fingerprint || 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="text-ink-3">Trust State: </span>
                            <span className={evt.device?.is_new ? 'text-amber-600 font-semibold' : 'text-emerald-600 font-semibold'}>
                              {evt.device?.is_new ? 'New / Unrecognized Device' : 'Previously Trusted Device'}
                            </span>
                          </div>
                          <div>
                            <span className="text-ink-3">Category: </span>
                            <span className="text-ink capitalize">{evt.device?.category || 'desktop'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Column 2: IP Intelligence & ISP */}
                      <div className="space-y-1.5">
                        <p className="font-semibold text-ink font-heading text-[11px] uppercase tracking-wider text-ink-2">
                          IP & Network Intelligence
                        </p>
                        <div className="text-[11px] font-mono space-y-1">
                          <div>
                            <span className="text-ink-3">IP Address: </span>
                            <span className="text-ink">{evt.ip_address}</span>
                          </div>
                          <div>
                            <span className="text-ink-3">ISP / Org: </span>
                            <span className="text-ink">{evt.threats?.isp || 'Standard Network'}</span>
                          </div>
                          <div>
                            <span className="text-ink-3">ASN: </span>
                            <span className="text-ink">{evt.threats?.asn || 'AS Private'}</span>
                          </div>
                          <div>
                            <span className="text-ink-3">Anonymizer: </span>
                            <span className="text-ink">
                              {evt.threats?.is_tor ? 'Confirmed Tor Exit Node' : evt.threats?.is_vpn ? 'VPN Tunnel Detected' : evt.threats?.is_proxy ? 'Proxy Server' : 'None Detected'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Column 3: Risk Factors & Reasons */}
                      <div className="space-y-1.5">
                        <p className="font-semibold text-ink font-heading text-[11px] uppercase tracking-wider text-ink-2">
                          Scoring Factors ({evt.risk?.reasons?.length || 0})
                        </p>
                        <div className="space-y-1 max-h-24 overflow-y-auto">
                          {evt.risk?.reasons && evt.risk.reasons.length > 0 ? (
                            evt.risk.reasons.map((r, i) => (
                              <div key={i} className="flex items-center justify-between text-[11px] bg-paper-raised px-2 py-1 rounded border border-line-soft">
                                <span className="text-ink-2 font-mono truncate max-w-[140px]">{r.factor || r.description}</span>
                                <span className="font-mono font-bold text-rose-600 shrink-0">+{r.points}</span>
                              </div>
                            ))
                          ) : (
                            <div className="text-emerald-600 font-mono text-[11px]">
                              Zero abnormal risk factors triggered
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
