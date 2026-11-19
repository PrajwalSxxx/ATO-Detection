import React, { useState, useEffect } from 'react'
import { Drawer } from '@/components/ui/Drawer'
import { RiskGauge } from '@/components/ui/RiskGauge'
import { RiskBadge, DecisionBadge, Badge } from '@/components/ui/Badge'
import { CopyableMono } from '@/components/ui/CopyableMono'
import { Timeline } from '@/components/ui/Timeline'
import { formatDateTime, formatDateTimeUTC } from '@/utils/formatters'
import { refreshLoginEventIP } from '@/services/api'
import {
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  Globe,
  Clock,
  KeyRound,
  FileCode,
  Phone,
  RefreshCw,
  Server,
  Wifi,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react'

export function LoginEventDrawer({ isOpen, onClose, event }) {
  const [currentEvent, setCurrentEvent] = useState(event)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [refreshMessage, setRefreshMessage] = useState(null)

  useEffect(() => {
    setCurrentEvent(event)
    setRefreshMessage(null)
  }, [event])

  if (!currentEvent) return null

  const riskScore = currentEvent.risk_score !== undefined ? Number(currentEvent.risk_score) : 0
  const reasons = currentEvent.reasons || currentEvent.risk_factors || []
  const features = currentEvent.features || currentEvent.features_snapshot || {}

  const handleRefreshIP = async () => {
    if (!currentEvent?.id) return
    setIsRefreshing(true)
    setRefreshMessage(null)
    try {
      const res = await refreshLoginEventIP(currentEvent.id)
      const freshGeo = res.data?.geo
      if (freshGeo) {
        setCurrentEvent((prev) => ({
          ...prev,
          country: freshGeo.country,
          region: freshGeo.region,
          city: freshGeo.city,
          isp: freshGeo.isp,
          asn: freshGeo.asn,
          is_vpn: freshGeo.is_vpn,
          vpn_status: freshGeo.vpn_status,
          is_proxy: freshGeo.is_proxy,
          proxy_status: freshGeo.proxy_status,
          is_tor: freshGeo.is_tor,
          tor_status: freshGeo.tor_status,
          is_datacenter: freshGeo.is_datacenter,
          datacenter_status: freshGeo.datacenter_status,
          geo_provider: freshGeo.provider,
          geo_status: freshGeo.geo_status,
        }))
        setRefreshMessage({ type: 'success', text: 'Live IP threat intelligence refreshed successfully' })
      }
    } catch (err) {
      setRefreshMessage({
        type: 'error',
        text: err.normalizedMessage || 'Failed to query live intelligence provider',
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  // Location display resolution
  let locationLabel = currentEvent.location
  if (!locationLabel) {
    if (currentEvent.geo_status === 'local_network') {
      locationLabel = 'Local Network / Loopback'
    } else if (currentEvent.geo_status === 'unavailable') {
      locationLabel = 'Lookup Unavailable'
    } else if (currentEvent.city) {
      locationLabel = `${currentEvent.city}${currentEvent.country ? `, ${currentEvent.country}` : ''}`
    } else if (currentEvent.country) {
      locationLabel = currentEvent.country
    } else {
      locationLabel = 'Local / Internal'
    }
  }

  // IP Trust and Source label
  const ipSource = currentEvent.ip_source || 'direct'
  const isClientReported = ipSource === 'client_reported' || currentEvent.ip_trust_status === 'unverified'
  const isLoopback = ipSource === 'loopback' || currentEvent.ip_address === '127.0.0.1' || currentEvent.ip_address === '::1'

  // Threat status classifications
  const isTor = currentEvent.is_tor || currentEvent.tor_status === 'confirmed'
  const isConfirmedVpn = currentEvent.vpn_status === 'confirmed'
  const isSuspectedVpn = currentEvent.vpn_status === 'suspected' || (!isConfirmedVpn && currentEvent.is_vpn)
  const isProxy = currentEvent.is_proxy || currentEvent.proxy_status === 'confirmed'
  const isDatacenter = currentEvent.is_datacenter || currentEvent.datacenter_status === 'hosting'

  const browserDisplay = currentEvent.browser && currentEvent.browser !== 'Unknown'
    ? `${currentEvent.browser}${currentEvent.browser_version && currentEvent.browser_version !== '0' ? ` ${currentEvent.browser_version}` : ''}`
    : 'Unknown Browser'

  const osDisplay = currentEvent.os && currentEvent.os !== 'Unknown'
    ? `${currentEvent.os}${currentEvent.os_version && currentEvent.os_version !== '0' ? ` ${currentEvent.os_version}` : ''}`
    : 'Unknown OS'

  const rawTimestamp = currentEvent.timestamp || currentEvent.created_at

  const timelineItems = [
    {
      title: 'Incoming Login Request',
      timestamp: rawTimestamp,
      icon: Clock,
      description: `Request received from IP ${currentEvent.ip_address || 'unknown'} (${ipSource}) via ${browserDisplay} on ${osDisplay}`,
      nodeClass: 'border-line-soft text-ink-3',
    },
    {
      title: 'ML & Behavioral Anomaly Evaluation',
      timestamp: rawTimestamp,
      icon: FileCode,
      description: `Risk engine evaluated device, IP geolocation, and behavioral features. Score: ${riskScore.toFixed(1)}/100.`,
      nodeClass: 'border-ink text-ink',
    },
    {
      title: `Decision Executed: ${currentEvent.decision || 'ALLOW'}`,
      timestamp: rawTimestamp,
      icon: currentEvent.decision === 'BLOCK' ? ShieldAlert : ShieldCheck,
      description:
        currentEvent.decision === 'BLOCK'
          ? 'Access blocked due to critical risk profile exceeding threshold.'
          : currentEvent.decision === 'REQUIRE_MFA'
          ? 'Adaptive SMS MFA step-up required before granting session token.'
          : 'Low risk profile within safe envelope. Access granted seamlessly.',
      nodeClass:
        currentEvent.decision === 'BLOCK'
          ? 'border-danger text-danger'
          : currentEvent.decision === 'REQUIRE_MFA'
          ? 'border-warning text-warning'
          : 'border-success text-success',
    },
  ]

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Login Event Details"
      description={`Audit ID: ${currentEvent.id || 'N/A'}`}
      width="max-w-xl"
    >
      <div className="space-y-6 pb-6 text-ink">
        {/* Top Risk & Decision Card */}
        <div className="bg-paper-sunken border border-line-soft rounded-[10px] p-5 flex flex-col sm:flex-row items-center justify-between gap-6">
          <RiskGauge score={riskScore} size={140} strokeWidth={10} />

          <div className="flex-1 space-y-3 w-full">
            <div>
              <div className="text-[10px] text-ink-3 uppercase font-mono tracking-wider font-semibold">
                Decision Outcome
              </div>
              <div className="mt-1">
                <DecisionBadge decision={currentEvent.decision || 'ALLOW'} size="lg" />
              </div>
            </div>

            <div>
              <div className="text-[10px] text-ink-3 uppercase font-mono tracking-wider font-semibold">
                Risk Classification
              </div>
              <div className="mt-1">
                <RiskBadge
                  level={currentEvent.risk_level || (riskScore > 70 ? 'HIGH' : riskScore > 30 ? 'MEDIUM' : 'LOW')}
                  score={riskScore}
                />
              </div>
            </div>

            {currentEvent.is_simulated && (
              <Badge variant="outline" size="sm">
                SIMULATED_EVENT
              </Badge>
            )}
          </div>
        </div>

        {/* Timestamps Card (Dual IST & UTC) */}
        <div className="p-3.5 bg-paper-sunken rounded-[6px] border border-line-soft space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-ink-3 font-mono text-[11px] uppercase flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-ink-3" />
              Indian Standard Time (IST):
            </span>
            <span className="font-mono font-semibold text-ink">
              {formatDateTime(rawTimestamp)}
            </span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-line-soft/60">
            <span className="text-ink-3 font-mono text-[10px] uppercase">
              Audit Baseline (UTC ISO 8601):
            </span>
            <span className="font-mono text-[11px] text-ink-2">
              {formatDateTimeUTC(rawTimestamp)}
            </span>
          </div>
        </div>

        {/* Reasons & Signals Triggered */}
        <div className="space-y-2">
          <h4 className="text-[11px] font-mono font-semibold uppercase tracking-wider text-ink-3">
            Risk Factors Triggered
          </h4>
          {reasons.length === 0 ? (
            <p className="text-xs text-ink-2 bg-paper-sunken p-3 rounded-[6px] border border-line-soft">
              No elevated risk factors detected for this login attempt.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {reasons.map((r, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-[#F6E2DE] border border-danger/30 text-danger text-xs font-mono font-medium"
                >
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                  <span>{typeof r === 'string' ? r : r.description || r.factor || JSON.stringify(r)}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Identity & Network Context with Refresh Action */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-[11px] font-mono font-semibold uppercase tracking-wider text-ink-3">
              Identity & IP Intelligence
            </h4>
            <button
              onClick={handleRefreshIP}
              disabled={isRefreshing}
              title="Query live IP intelligence bypassing cache"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] border border-line-soft hover:bg-paper-hover text-[11px] font-mono text-ink-2 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Querying...' : 'Refresh IP Intel'}</span>
            </button>
          </div>

          {refreshMessage && (
            <div
              className={`p-2 rounded text-xs font-mono flex items-center gap-1.5 ${
                refreshMessage.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20'
              }`}
            >
              {refreshMessage.type === 'success' ? (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>{refreshMessage.text}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 bg-paper-sunken rounded-[6px] border border-line-soft">
              <span className="text-ink-3 block text-[10px] font-mono uppercase">User Account</span>
              <span className="font-medium text-ink mt-0.5 block truncate">
                {currentEvent.username || currentEvent.user_email || currentEvent.user_id || 'Unknown'}
              </span>
            </div>

            <div className="p-3 bg-paper-sunken rounded-[6px] border border-line-soft">
              <span className="text-ink-3 block text-[10px] font-mono uppercase">IP Address</span>
              <div className="mt-0.5">
                <CopyableMono text={currentEvent.ip_address || currentEvent.ip || '—'} />
              </div>
            </div>

            <div className="p-3 bg-paper-sunken rounded-[6px] border border-line-soft">
              <span className="text-ink-3 block text-[10px] font-mono uppercase">IP Source & Trust</span>
              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                {isClientReported && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                    Client-Reported (Dev)
                  </span>
                )}
                {isLoopback && !isClientReported && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30">
                    Loopback (Local)
                  </span>
                )}
                {ipSource === 'trusted_proxy' && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                    Trusted Proxy
                  </span>
                )}
                {!isClientReported && !isLoopback && ipSource === 'direct' && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                    Direct (Verified)
                  </span>
                )}
              </div>
            </div>

            <div className="p-3 bg-paper-sunken rounded-[6px] border border-line-soft">
              <span className="text-ink-3 block text-[10px] font-mono uppercase">Geolocation</span>
              <span className="text-ink mt-0.5 flex items-center gap-1 font-mono">
                <Globe className="w-3.5 h-3.5 text-ink-3 shrink-0" />
                <span className="truncate">{locationLabel}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Network & ISP Intelligence */}
        <div className="space-y-2">
          <h4 className="text-[11px] font-mono font-semibold uppercase tracking-wider text-ink-3">
            Network & Carrier Context
          </h4>
          <div className="p-3.5 bg-paper-sunken rounded-[6px] border border-line-soft space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between">
              <span className="text-ink-2 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-ink-3" />
                ISP / Organization:
              </span>
              <span className="text-ink font-medium">
                {currentEvent.isp || 'Local / Private Network'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-ink-2 flex items-center gap-1.5">
                <Wifi className="w-3.5 h-3.5 text-ink-3" />
                Autonomous System (ASN):
              </span>
              <span className="text-ink font-medium">
                {currentEvent.asn || 'AS Private'}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-line-soft/60">
              <span className="text-ink-3 text-[10px] uppercase">Geo Provider & Lookup Status:</span>
              <span className="text-ink-2 text-[11px]">
                {currentEvent.geo_provider || 'internal'} ({currentEvent.geo_status || 'ok'})
              </span>
            </div>
          </div>
        </div>

        {/* Threat Intelligence / Anonymizer Status */}
        <div className="space-y-2">
          <h4 className="text-[11px] font-mono font-semibold uppercase tracking-wider text-ink-3">
            Anonymizer & Threat Intelligence
          </h4>
          <div className="p-3.5 bg-paper-sunken rounded-[6px] border border-line-soft space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-ink-2 font-mono">VPN Tunnel Status:</span>
              <div>
                {isConfirmedVpn ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                    Confirmed Commercial VPN
                  </span>
                ) : isSuspectedVpn ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                    Suspected VPN (Hosting Provider)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono text-ink-3 bg-paper-raised border border-line-soft">
                    Not Detected
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-ink-2 font-mono">Proxy Status:</span>
              <div>
                {isProxy ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                    Proxy Server Detected
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono text-ink-3 bg-paper-raised border border-line-soft">
                    Not Detected
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-ink-2 font-mono">Tor Network Status:</span>
              <div>
                {isTor ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-600 text-white animate-pulse">
                    Confirmed Tor Exit Node
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono text-ink-3 bg-paper-raised border border-line-soft">
                    Not Detected
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-ink-2 font-mono">Datacenter / Cloud Hosting:</span>
              <div>
                {isDatacenter ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                    Hosting Provider IP
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono text-ink-3 bg-paper-raised border border-line-soft">
                    Residential / Standard
                  </span>
                )}
              </div>
            </div>

            {currentEvent.prev_city && currentEvent.city && currentEvent.prev_city !== currentEvent.city && (
              <div className="flex items-center justify-between pt-1 border-t border-line-soft">
                <span className="text-ink-3 font-mono">Location Change:</span>
                <span className="text-ink font-mono text-[11px]">
                  {currentEvent.prev_city} ➔ {currentEvent.city} ({Math.round(currentEvent.geo_distance_km || 0)} km)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Device & Client Telemetry */}
        <div className="space-y-2">
          <h4 className="text-[11px] font-mono font-semibold uppercase tracking-wider text-ink-3">
            Device & Client Telemetry
          </h4>
          <div className="p-3.5 bg-paper-sunken rounded-[6px] border border-line-soft space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-ink-2 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-ink-3" />
                Browser:
              </span>
              <span className="text-ink font-medium font-mono">
                {browserDisplay}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-ink-2 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-ink-3" />
                Operating System:
              </span>
              <span className="text-ink font-medium font-mono">
                {osDisplay}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-ink-2 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-ink-3" />
                Device Category:
              </span>
              <span className="text-ink font-medium capitalize">
                {currentEvent.device_category || 'Desktop'} ({currentEvent.is_new_device ? 'New Device' : 'Known Device'})
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-ink-2 flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-ink-3" />
                Device Fingerprint:
              </span>
              <CopyableMono
                text={currentEvent.fingerprint_hash || currentEvent.device_id || currentEvent.device_fingerprint || '—'}
                truncateLength={16}
              />
            </div>

            {currentEvent.user_agent && (
              <div className="pt-2 border-t border-line-soft">
                <span className="text-ink-3 text-[10px] font-mono uppercase block mb-1">Raw User Agent:</span>
                <p className="font-mono text-[11px] text-ink-2 bg-paper-raised border border-line-soft p-2 rounded-[6px] break-all">
                  {currentEvent.user_agent}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Adaptive MFA & SMS Delivery */}
        {(currentEvent.decision === 'REQUIRE_MFA' || currentEvent.mfa_required || currentEvent.mfa_phone_masked) && (
          <div className="space-y-2">
            <h4 className="text-[11px] font-mono font-semibold uppercase tracking-wider text-ink-3">
              Adaptive MFA & SMS Delivery
            </h4>
            <div className="p-3.5 bg-paper-sunken rounded-[6px] border border-line-soft space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-ink-2 flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-ink-3" />
                  Masked Destination:
                </span>
                <span className="text-ink font-mono font-medium">
                  {currentEvent.mfa_phone_masked || 'Registered Mobile (Masked)'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-2">Delivery Channel / Status:</span>
                <span className="inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 uppercase font-semibold">
                  {currentEvent.mfa_delivery_status || 'SMS Dispatched'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-2">Verification State:</span>
                <span className={`font-mono text-xs font-semibold ${currentEvent.mfa_completed ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {currentEvent.mfa_completed ? 'MFA Successfully Completed' : 'Pending / Step-Up Required'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Raw ML Features */}
        {Object.keys(features).length > 0 && (
          <div className="space-y-2">
            <h4 className="text-[11px] font-mono font-semibold uppercase tracking-wider text-ink-3">
              Computed Feature Values
            </h4>
            <div className="p-3 bg-paper-sunken rounded-[6px] border border-line-soft">
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                {Object.entries(features).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between py-1 border-b border-line-soft">
                    <span className="text-ink-3">{k}:</span>
                    <span className="text-ink font-semibold">
                      {typeof v === 'number' ? v.toFixed(3) : String(v)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Lifecycle Timeline */}
        <div className="space-y-3">
          <h4 className="text-[11px] font-mono font-semibold uppercase tracking-wider text-ink-3">
            Evaluation Timeline
          </h4>
          <Timeline items={timelineItems} />
        </div>
      </div>
    </Drawer>
  )
}
