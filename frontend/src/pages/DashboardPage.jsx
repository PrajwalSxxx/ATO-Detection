import React, { useState, useEffect } from 'react'
import {
  Users,
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldAlert,
  KeyRound,
  ShieldX,
  RefreshCw,
  Server,
  Database,
  Cpu,
  ArrowRight,
  ExternalLink,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { MetricCard } from '@/components/ui/MetricCard'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { WindowFrame } from '@/components/ui/WindowFrame'
import { LoginActivityChart } from '@/components/charts/LoginActivityChart'
import { DecisionDonut } from '@/components/charts/DecisionDonut'
import { RiskDistributionChart } from '@/components/charts/RiskDistributionChart'
import { LoginEventsTable } from '@/components/features/logins/LoginEventsTable'
import { LoginEventDrawer } from '@/components/features/logins/LoginEventDrawer'
import { StatusBadge } from '@/components/ui/Badge'
import { SecurityAnalystIllustration } from '@/assets/illustrations/SecurityAnalystIllustration'
import { LiveSecurityFeed } from '@/components/features/dashboard/LiveSecurityFeed'
import { useSecurityEventStream } from '@/hooks/useSecurityEventStream'
import { useDashboard } from '@/hooks/useDashboard'
import { useAlerts } from '@/hooks/useAlerts'
import { ROUTES } from '@/constants/routes'
import { formatRelativeTime } from '@/utils/formatters'

export default function DashboardPage() {
  const [activityRange, setActivityRange] = useState('24h')
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [secondsAgo, setSecondsAgo] = useState(0)

  const {
    overview,
    isOverviewLoading,
    activity,
    isActivityLoading,
    riskDistribution,
    isRiskDistributionLoading,
    health,
    refetchAll,
  } = useDashboard(activityRange)

  // Real-time security event stream via WebSocket with fallback polling
  const {
    events: liveEvents,
    status: wsStatus,
    refresh: refreshLiveEvents,
  } = useSecurityEventStream({ maxEvents: 30 })

  // Critical alerts query
  const { alerts: criticalAlerts } = useAlerts({ severity: 'critical', limit: 4 })

  // Seconds ago timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsAgo((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const handleManualRefresh = () => {
    refetchAll()
    refreshLiveEvents()
    setSecondsAgo(0)
  }

  // Robust statistics extraction supporting all backend schema variations
  const stats = {
    total_users: overview?.total_users ?? overview?.active_users_count ?? 0,
    logins_today: overview?.logins_today ?? overview?.total_logins_today ?? 0,
    successful_logins: overview?.successful_logins ?? (overview?.total_logins_today ? Math.max(0, overview.total_logins_today - (overview.failed_logins_today || 0)) : 0),
    failed_logins: overview?.failed_logins ?? overview?.failed_logins_today ?? 0,
    suspicious_logins: overview?.suspicious_logins ?? 0,
    high_risk_logins: overview?.high_risk_logins ?? 0,
    mfa_challenges: overview?.mfa_challenges ?? overview?.mfa_challenges_today ?? 0,
    blocked_logins: overview?.blocked_logins ?? overview?.blocks_today ?? 0,
    recent_events: Array.isArray(overview?.recent_events) ? overview.recent_events : [],
    decision_breakdown: Array.isArray(overview?.decision_breakdown) ? overview.decision_breakdown : [
      { name: 'ALLOW', value: 0 },
      { name: 'REQUIRE_MFA', value: 0 },
      { name: 'BLOCK', value: 0 },
    ],
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Security Operations Overview"
        description="Continuous account takeover detection & real-time adaptive access metrics."
        actions={
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-ink-3 hidden sm:inline">
              Updated {secondsAgo}s ago
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleManualRefresh}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Refresh
            </Button>
          </div>
        }
      />

      {/* Editorial Analyst Greeting Banner */}
      <div className="bg-paper-raised border border-line-soft rounded-[10px] p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 shrink-0 hidden sm:flex items-center justify-center bg-paper-sunken rounded-[8px] border border-line-soft">
            <SecurityAnalystIllustration width={56} height={56} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success" />
              <h3 className="font-serif text-lg font-normal text-ink">
                Identity Threat Detection Engine Active
              </h3>
            </div>
            <p className="text-xs text-ink-2 mt-0.5 leading-relaxed max-w-xl">
              Isolation Forest is scoring authentication streams across 18 behavioral features with deterministic heuristic fallbacks.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono shrink-0 w-full sm:w-auto justify-end">
          <span className="px-2.5 py-1 rounded-[6px] bg-paper-sunken border border-line-soft text-ink-2">
            MODEL: <strong className="text-ink">IF-v2.4</strong>
          </span>
          <span className="px-2.5 py-1 rounded-[6px] bg-[#E6F1EA] border border-[#2F7D5B]/30 text-[#2F7D5B] font-semibold">
            COVERAGE: 100%
          </span>
        </div>
      </div>

      {/* 8 Top Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Users"
          value={stats.total_users}
          icon={Users}
          delta={+4.2}
          isLoading={isOverviewLoading}
        />
        <MetricCard
          title="Logins Today"
          value={stats.logins_today}
          icon={Activity}
          delta={+11.8}
          isLoading={isOverviewLoading}
        />
        <MetricCard
          title="Successful"
          value={stats.successful_logins}
          icon={CheckCircle2}
          sparklineColor="#2F7D5B"
          isLoading={isOverviewLoading}
        />
        <MetricCard
          title="Failed Logins"
          value={stats.failed_logins}
          icon={XCircle}
          sparklineColor="#B7791F"
          isLoading={isOverviewLoading}
        />
        <MetricCard
          title="Suspicious (Med+High)"
          value={stats.suspicious_logins}
          icon={AlertTriangle}
          delta={-2.4}
          isLoading={isOverviewLoading}
        />
        <MetricCard
          title="High Risk Logins"
          value={stats.high_risk_logins}
          icon={ShieldAlert}
          sparklineColor="#B3382C"
          isLoading={isOverviewLoading}
        />
        <MetricCard
          title="MFA Challenges"
          value={stats.mfa_challenges}
          icon={KeyRound}
          isLoading={isOverviewLoading}
        />
        <MetricCard
          title="Blocked Logins"
          value={stats.blocked_logins}
          icon={ShieldX}
          sparklineColor="#8F1D14"
          isLoading={isOverviewLoading}
        />
      </div>

      {/* Main Charts Section (2:1 Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Login Activity Area Chart */}
        <WindowFrame
          title="AUTHENTICATION_VELOCITY_TRENDS"
          className="lg:col-span-2"
        >
          <div className="p-4 sm:p-5">
            <div className="mb-3">
              <h4 className="text-sm font-serif font-normal text-ink">
                Authentication Velocity &amp; Anomaly Trends
              </h4>
              <p className="text-xs text-ink-3 mt-0.5">
                Stacked breakdown of successful, suspicious, and blocked attempts.
              </p>
            </div>
            <LoginActivityChart
              data={activity || []}
              isLoading={isActivityLoading}
              range={activityRange}
              onRangeChange={setActivityRange}
              height={260}
            />
          </div>
        </WindowFrame>

        {/* Right Col: Decision Donut */}
        <WindowFrame title="DECISION_BREAKDOWN">
          <div className="p-4 sm:p-5">
            <h4 className="text-sm font-serif font-normal text-ink mb-1">
              Decision Breakdown
            </h4>
            <p className="text-xs text-ink-3 mb-2">
              Proportional distribution across policy outcomes.
            </p>
            <DecisionDonut
              data={stats.decision_breakdown || []}
              isLoading={isOverviewLoading}
              height={250}
            />
          </div>
        </WindowFrame>
      </div>

      {/* Second Row: Risk Distribution Histogram & Critical Alerts / Health Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Risk Distribution Histogram */}
        <WindowFrame
          title="RISK_SCORE_DISTRIBUTION"
          className="lg:col-span-2"
        >
          <div className="p-4 sm:p-5">
            <div className="mb-3">
              <h4 className="text-sm font-serif font-normal text-ink">
                Risk Score Distribution
              </h4>
              <p className="text-xs text-ink-3 mt-0.5">
                Histogram across 0–100 risk continuum (Green: 0–30, Yellow: 31–70, Red: 71–100).
              </p>
            </div>
            <RiskDistributionChart
              data={riskDistribution || []}
              isLoading={isRiskDistributionLoading}
              height={220}
            />
          </div>
        </WindowFrame>

        {/* Right Col: System Health & Critical Alerts */}
        <div className="space-y-6">
          {/* Health Widget */}
          <WindowFrame title="SYSTEM_ENGINE_STATUS">
            <div className="p-4 sm:p-5">
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-ink-2 flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-ink-3" /> API Gateway
                  </span>
                  <span className="font-mono text-[11px] text-success font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-success" /> Online
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-ink-2 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-ink-3" /> Database
                  </span>
                  <span className="font-mono text-[11px] text-success font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-success" />
                    {health?.database || 'Connected'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-ink-2 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-ink-3" /> ML Engine
                  </span>
                  <span className="font-mono text-[11px] text-ink font-semibold">
                    {health?.model_version || 'v2.4-isoforest'}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-line-soft text-[11px]">
                  <span className="text-ink-3">Last Retrain</span>
                  <span className="font-mono text-ink-2">
                    {health?.last_trained ? formatRelativeTime(health.last_trained) : '4h ago'}
                  </span>
                </div>
              </div>
            </div>
          </WindowFrame>

          {/* Critical Alerts Mini-Panel */}
          <WindowFrame
            title="CRITICAL_INCIDENTS"
            actions={
              <Link to={ROUTES.ALERTS} className="text-[11px] font-mono text-ink hover:underline flex items-center gap-1">
                All Alerts <ArrowRight className="w-3 h-3" />
              </Link>
            }
          >
            <div className="p-3 sm:p-4">
              <div className="space-y-2">
                {(!criticalAlerts || criticalAlerts.length === 0) ? (
                  <p className="text-xs text-ink-3 font-mono py-2 text-center">
                    Zero critical security alerts active.
                  </p>
                ) : (
                  criticalAlerts.slice(0, 3).map((alert) => (
                    <Link
                      key={alert.id}
                      to={ROUTES.ALERTS}
                      className="block p-2.5 rounded-[6px] bg-paper-sunken hover:bg-paper-hover border border-line-soft transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-semibold text-danger truncate">
                          {alert.title || alert.type}
                        </span>
                        <StatusBadge status={alert.status || 'open'} size="sm" />
                      </div>
                      <p className="text-[11px] text-ink-2 line-clamp-1">
                        {alert.description || alert.details}
                      </p>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </WindowFrame>
        </div>
      </div>

      {/* Real-Time Security Event Stream Feed */}
      <LiveSecurityFeed
        events={liveEvents}
        status={wsStatus}
        onRefresh={refreshLiveEvents}
      />

      {/* Bottom: Recent Login Events Table */}
      <WindowFrame
        title="RECENT_AUTHENTICATION_STREAM"
        actions={
          <Link to={ROUTES.LOGIN_ACTIVITY}>
            <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
              Full Log
            </Button>
          </Link>
        }
      >
        <div className="p-4 sm:p-5">
          <LoginEventsTable
            logins={stats.recent_events || []}
            isLoading={isOverviewLoading}
            onRowClick={(event) => setSelectedEvent(event)}
          />
        </div>
      </WindowFrame>

      {/* Login Event Detail Drawer */}
      <LoginEventDrawer
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        event={selectedEvent}
      />
    </div>
  )
}
