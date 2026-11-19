import React from 'react'
import { Drawer } from '@/components/ui/Drawer'
import { RiskGauge } from '@/components/ui/RiskGauge'
import { RiskBadge, DecisionBadge, Badge } from '@/components/ui/Badge'
import { CopyableMono } from '@/components/ui/CopyableMono'
import { Timeline } from '@/components/ui/Timeline'
import { formatDateTime } from '@/utils/formatters'
import {
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  Globe,
  Clock,
  KeyRound,
  FileCode,
  Phone,
} from 'lucide-react'

export function LoginEventDrawer({ isOpen, onClose, event }) {
  if (!event) return null

  const riskScore = event.risk_score !== undefined ? Number(event.risk_score) : 0
  const reasons = event.reasons || event.risk_factors || []
  const features = event.features || {}

  const timelineItems = [
    {
      title: 'Incoming Login Request',
      timestamp: event.timestamp || event.created_at,
      icon: Clock,
      description: `Request received from IP ${event.ip_address || 'unknown'} via ${event.browser || 'Browser'} on ${event.os || 'OS'}`,
      nodeClass: 'border-line-soft text-ink-3',
    },
    {
      title: 'ML Anomaly Evaluation',
      timestamp: event.timestamp || event.created_at,
      icon: FileCode,
      description: `Isolation Forest scored anomaly at ${event.anomaly_score !== undefined ? Number(event.anomaly_score).toFixed(3) : 'N/A'}. Composite risk: ${riskScore.toFixed(1)}.`,
      nodeClass: 'border-ink text-ink',
    },
    {
      title: `Decision Executed: ${event.decision || 'ALLOW'}`,
      timestamp: event.timestamp || event.created_at,
      icon: event.decision === 'BLOCK' ? ShieldAlert : ShieldCheck,
      description:
        event.decision === 'BLOCK'
          ? 'Access blocked due to critical risk profile exceeding threshold.'
          : event.decision === 'REQUIRE_MFA'
          ? 'Adaptive MFA step-up required before granting session token.'
          : 'Low risk profile within safe envelope. Access granted seamlessly.',
      nodeClass:
        event.decision === 'BLOCK'
          ? 'border-danger text-danger'
          : event.decision === 'REQUIRE_MFA'
          ? 'border-warning text-warning'
          : 'border-success text-success',
    },
  ]

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Login Event Details"
      description={`ID: ${event.id || 'N/A'}`}
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
                <DecisionBadge decision={event.decision || 'ALLOW'} size="lg" />
              </div>
            </div>

            <div>
              <div className="text-[10px] text-ink-3 uppercase font-mono tracking-wider font-semibold">
                Risk Classification
              </div>
              <div className="mt-1">
                <RiskBadge
                  level={event.risk_level || (riskScore > 70 ? 'HIGH' : riskScore > 30 ? 'MEDIUM' : 'LOW')}
                  score={riskScore}
                />
              </div>
            </div>

            {event.is_simulated && (
              <Badge variant="outline" size="sm">
                SIMULATED_EVENT
              </Badge>
            )}
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

        {/* Identity & Context */}
        <div className="space-y-2">
          <h4 className="text-[11px] font-mono font-semibold uppercase tracking-wider text-ink-3">
            Identity & Network Context
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 bg-paper-sunken rounded-[6px] border border-line-soft">
              <span className="text-ink-3 block text-[10px] font-mono uppercase">User Account</span>
              <span className="font-medium text-ink mt-0.5 block truncate">
                {event.username || event.user_email || event.user_id || 'Unknown'}
              </span>
            </div>

            <div className="p-3 bg-paper-sunken rounded-[6px] border border-line-soft">
              <span className="text-ink-3 block text-[10px] font-mono uppercase">Timestamp</span>
              <span className="font-mono text-ink mt-0.5 block">
                {formatDateTime(event.timestamp || event.created_at)}
              </span>
            </div>

            <div className="p-3 bg-paper-sunken rounded-[6px] border border-line-soft">
              <span className="text-ink-3 block text-[10px] font-mono uppercase">IP Address</span>
              <div className="mt-0.5">
                <CopyableMono text={event.ip_address || event.ip || '—'} />
              </div>
            </div>

            <div className="p-3 bg-paper-sunken rounded-[6px] border border-line-soft">
              <span className="text-ink-3 block text-[10px] font-mono uppercase">Geo Location</span>
              <span className="text-ink mt-0.5 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-ink-3" />
                <span>
                  {event.location || event.city ? `${event.city || ''}, ${event.country || ''}` : 'Local / Internal'}
                </span>
              </span>
            </div>
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
                Browser & OS:
              </span>
              <span className="text-ink font-medium">
                {event.browser || 'Unknown Browser'} on {event.os || 'Unknown OS'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-ink-2 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-ink-3" />
                Device Category:
              </span>
              <span className="text-ink font-medium capitalize">
                {event.device_category || 'Desktop'} ({event.is_new_device ? 'New Device' : 'Known Device'})
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-ink-2 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-ink-3" />
                Threat Intelligence:
              </span>
              <span className="text-ink font-medium">
                {event.is_tor ? 'Tor Exit Node' : event.is_vpn ? 'VPN Detected' : event.is_proxy ? 'Proxy' : 'Clean / Normal'}
              </span>
            </div>

            {event.prev_city && event.city && event.prev_city !== event.city && (
              <div className="flex items-center justify-between pt-1 border-t border-line-soft">
                <span className="text-ink-3">Location Change:</span>
                <span className="text-ink font-mono text-[11px]">
                  {event.prev_city} ➔ {event.city} ({Math.round(event.geo_distance_km || 0)} km)
                </span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-ink-2 flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-ink-3" />
                Device Fingerprint:
              </span>
              <CopyableMono
                text={event.fingerprint_hash || event.device_id || event.device_fingerprint || '—'}
                truncateLength={16}
              />
            </div>

            {event.user_agent && (
              <div className="pt-2 border-t border-line-soft">
                <span className="text-ink-3 text-[10px] font-mono uppercase block mb-1">Raw User Agent:</span>
                <p className="font-mono text-[11px] text-ink-2 bg-paper-raised border border-line-soft p-2 rounded-[6px] break-all">
                  {event.user_agent}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Adaptive MFA & SMS Delivery */}
        {(event.decision === 'REQUIRE_MFA' || event.mfa_required || event.mfa_phone_masked) && (
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
                  {event.mfa_phone_masked || 'Registered Mobile (Masked)'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-2">Delivery Channel / Status:</span>
                <span className="inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 uppercase font-semibold">
                  {event.mfa_delivery_status || 'SMS Dispatched'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-2">Verification State:</span>
                <span className={`font-mono text-xs font-semibold ${event.mfa_completed ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {event.mfa_completed ? 'MFA Successfully Completed' : 'Pending / Step-Up Required'}
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
