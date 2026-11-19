import React, { useState } from 'react'
import {
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Plane,
  Eye,
  Clock,
  KeyRound,
  Play,
  RotateCcw,
  Sparkles,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { WindowFrame } from '@/components/ui/WindowFrame'
import { RiskGauge } from '@/components/ui/RiskGauge'
import { DecisionBadge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'

export const SCENARIOS = [
  {
    id: 'normal',
    name: 'Scenario 1: Normal Login',
    icon: CheckCircle2,
    color: 'text-[#2F7D5B]',
    expectedDecision: 'ALLOW',
    description: 'Known device, familiar residential/corporate location (Bengaluru), zero anomalies, low risk score.',
    payload: {
      scenario: 'normal',
      ip_address: '103.21.244.2',
      location: 'Bengaluru, IN',
      device_category: 'desktop',
      is_new_device: false,
      is_tor_or_vpn: false,
      hour_of_day: 14,
      failed_attempts_last_hour: 0,
      impossible_travel: false,
    },
  },
  {
    id: 'new_device',
    name: 'Scenario 2: New Mobile Device',
    icon: Sparkles,
    color: 'text-[#B7791F]',
    expectedDecision: 'REQUIRE_MFA',
    description: 'Same user logging in from a new mobile device from their usual city. Triggers new device detection and admin alert.',
    payload: {
      scenario: 'new_device',
      ip_address: '103.21.244.2',
      location: 'Bengaluru, IN',
      device_category: 'mobile',
      is_new_device: true,
      is_tor_or_vpn: false,
      hour_of_day: 11,
      failed_attempts_last_hour: 0,
      impossible_travel: false,
    },
  },
  {
    id: 'vpn_location',
    name: 'Scenario 3: VPN Location Change',
    icon: Eye,
    color: 'text-[#5B4BC4]',
    expectedDecision: 'REQUIRE_MFA',
    description: 'Simulated German datacenter IP with active VPN flag. Demonstrates location change from India to Germany with distance calculation.',
    payload: {
      scenario: 'vpn_location',
      ip_address: '185.220.101.4',
      location: 'Frankfurt, DE',
      device_category: 'desktop',
      is_new_device: false,
      is_tor_or_vpn: true,
      hour_of_day: 15,
      failed_attempts_last_hour: 0,
      impossible_travel: false,
    },
  },
  {
    id: 'suspicious_ato',
    name: 'Scenario 4: Suspicious ATO (Tor + Mobile)',
    icon: ShieldAlert,
    color: 'text-danger',
    expectedDecision: 'BLOCK',
    description: 'High-risk attack: unrecognized Android device originating from a verified Tor exit node in Frankfurt, high anomaly score.',
    payload: {
      scenario: 'suspicious_ato',
      ip_address: '185.220.101.5',
      location: 'Frankfurt, DE',
      device_category: 'mobile',
      is_new_device: true,
      is_tor_or_vpn: true,
      hour_of_day: 23,
      failed_attempts_last_hour: 2,
      impossible_travel: false,
    },
  },
  {
    id: 'impossible_travel',
    name: 'Impossible Geovelocity Travel',
    icon: Plane,
    color: 'text-danger',
    expectedDecision: 'BLOCK',
    description: 'Sign-in attempt originating in Tokyo only 12 minutes after a confirmed sign-in in San Francisco (>8,000 km/h).',
    payload: {
      scenario: 'impossible_travel',
      ip_address: '133.242.18.9',
      location: 'Tokyo, JP',
      device_category: 'mobile',
      is_new_device: true,
      is_tor_or_vpn: false,
      hour_of_day: 3,
      failed_attempts_last_hour: 0,
      impossible_travel: true,
      calculated_velocity_kmh: 8400,
    },
  },
  {
    id: 'credential_stuffing',
    name: 'Credential Stuffing Spray',
    icon: ShieldAlert,
    color: 'text-danger',
    expectedDecision: 'BLOCK',
    description: 'Multiple consecutive failed password attempts within 3 minutes immediately preceding this login request.',
    payload: {
      scenario: 'credential_stuffing',
      ip_address: '185.220.101.5',
      location: 'Frankfurt, DE',
      device_category: 'desktop',
      is_new_device: true,
      is_tor_or_vpn: true,
      hour_of_day: 4,
      failed_attempts_last_hour: 14,
      impossible_travel: false,
    },
  },
  {
    id: 'unusual_hours',
    name: 'Unusual Off-Hours Activity',
    icon: Clock,
    color: 'text-[#B7791F]',
    expectedDecision: 'REQUIRE_MFA',
    description: 'User logging in at 3:30 AM local time on a weekend, diverging from their typical schedule profile.',
    payload: {
      scenario: 'unusual_hours',
      ip_address: '198.51.100.45',
      location: 'Austin, US',
      is_new_device: false,
      is_tor_or_vpn: false,
      hour_of_day: 3,
      failed_attempts_last_hour: 0,
      impossible_travel: false,
    },
  },
  {
    id: 'compromised_credential',
    name: 'Breached Password Signature',
    icon: KeyRound,
    color: 'text-danger',
    expectedDecision: 'REQUIRE_MFA',
    description: 'Credentials match known corporate spill hash with abnormal device user-agent string.',
    payload: {
      scenario: 'compromised_credential',
      ip_address: '45.154.255.89',
      location: 'Amsterdam, NL',
      is_new_device: true,
      is_tor_or_vpn: false,
      hour_of_day: 19,
      failed_attempts_last_hour: 2,
      impossible_travel: false,
    },
  },
]

export function SimulatorPanel({
  users = [],
  onRunSimulation,
  isRunning = false,
  result,
  onResetDemo,
  isResetting = false,
}) {
  const [selectedScenario, setSelectedScenario] = useState(SCENARIOS[0].id)
  const [selectedUser, setSelectedUser] = useState(users[0]?.id || 'demo_user_1')
  const [resetModalOpen, setResetModalOpen] = useState(false)

  const activeScenario = SCENARIOS.find((s) => s.id === selectedScenario) || SCENARIOS[0]

  const handleRun = () => {
    onRunSimulation({
      ...activeScenario.payload,
      user_id: selectedUser,
      scenario_id: activeScenario.id,
      is_simulated: true,
    })
  }

  // 5 Pipeline execution stages
  const stages = [
    { name: 'Telemetry Ingestion', done: !!result },
    { name: 'Vector Extraction', done: !!result },
    { name: 'Isolation Forest', done: !!result },
    { name: 'Scoring Matrix', done: !!result },
    { name: 'Policy Decision', done: !!result },
  ]

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-4 bg-paper-raised border border-line-soft rounded-[10px] flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[6px] bg-paper-sunken border border-line-soft flex items-center justify-center text-ink shrink-0">
            <Sparkles className="w-4 h-4 text-ink" />
          </div>
          <div>
            <h4 className="text-sm font-serif font-normal text-ink">
              Interactive Attack Vector Simulator
            </h4>
            <p className="text-xs text-ink-3">
              Trigger synthetic anomaly vectors against the live ML inference pipeline.
              All generated events are flagged with <strong className="font-mono text-ink">SIMULATED</strong> tags.
            </p>
          </div>
        </div>

        {onResetDemo && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setResetModalOpen(true)}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Reset Demo Data
          </Button>
        )}
      </div>

      {/* Grid: Scenario Selection & Execution Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: 7 Scenario Cards */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase tracking-wider text-ink-3 font-semibold">
              1. Select Attack or Behavior Scenario
            </h3>
            <span className="text-[10px] font-mono text-ink-3">7 Pre-Configured Vectors</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {SCENARIOS.map((sc) => {
              const Icon = sc.icon
              const isSelected = selectedScenario === sc.id

              return (
                <div
                  key={sc.id}
                  onClick={() => setSelectedScenario(sc.id)}
                  className={`p-3.5 rounded-[10px] cursor-pointer transition-all duration-150 ${
                    isSelected
                      ? 'bg-paper-raised border-[1.5px] border-ink shadow-hard'
                      : 'bg-paper-raised border border-line-soft hover:border-ink/60 hover:shadow-hard-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${sc.color}`} />
                      <span className="text-xs font-semibold text-ink">
                        {sc.name}
                      </span>
                    </div>
                    <DecisionBadge decision={sc.expectedDecision} size="sm" />
                  </div>

                  <p className="text-[11px] text-ink-2 line-clamp-2 leading-relaxed">
                    {sc.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Col: Target User & Run Panel inside WindowFrame */}
        <WindowFrame title="EXECUTION_PAYLOAD">
          <div className="p-5 flex flex-col justify-between space-y-4 h-full">
            <div className="space-y-4">
              <h3 className="text-xs font-mono uppercase tracking-wider text-ink-3 font-semibold">
                2. Target &amp; Parameters
              </h3>

              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-ink-3 block mb-1">
                  Target Identity Account
                </label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full bg-paper-sunken border border-line-soft rounded-[6px] px-3 py-2 text-xs font-mono text-ink focus:outline-none focus:border-ink focus:border-[1.5px] transition-colors"
                >
                  {users.length > 0 ? (
                    users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.email || u.username} ({u.role || 'user'})
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="user1@test.com">user1@test.com (Alice Johnson)</option>
                      <option value="user2@test.com">user2@test.com (Bob Smith)</option>
                      <option value="admin@ato-platform.com">admin@ato-platform.com (Admin)</option>
                    </>
                  )}
                </select>
              </div>

              <div className="p-3 bg-paper-sunken rounded-[6px] border border-line-soft text-xs space-y-1">
                <span className="text-ink-3 text-[10px] font-mono uppercase block">
                  Active Scenario Payload:
                </span>
                <div className="font-semibold text-ink">
                  {activeScenario.name}
                </div>
                <div className="text-[11px] text-ink-2 font-mono">
                  Expected: <strong className="text-ink">{activeScenario.expectedDecision}</strong>
                </div>
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={isRunning}
              onClick={handleRun}
              leftIcon={<Play className="w-4 h-4 fill-current" />}
            >
              Trigger Simulation
            </Button>
          </div>
        </WindowFrame>
      </div>

      {/* Connected Wireframe Pipeline Stages */}
      <WindowFrame title="PIPELINE_EXECUTION_TRACE">
        <div className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
            {stages.map((stage, idx) => (
              <React.Fragment key={stage.name}>
                <div
                  className={`flex items-center gap-2 px-3 py-2 rounded-[6px] border w-full sm:w-auto transition-all ${
                    stage.done
                      ? 'bg-paper-raised border-[1.5px] border-ink text-ink shadow-hard-sm'
                      : isRunning
                      ? 'bg-[#ECE9F9] border-[1.5px] border-ink text-ink animate-pulse'
                      : 'bg-paper-sunken border border-line-dashed text-ink-3'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] font-bold ${
                      stage.done
                        ? 'bg-ink text-paper'
                        : isRunning
                        ? 'bg-ink text-paper'
                        : 'bg-paper-raised border border-line-soft text-ink-3'
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span className="font-medium font-mono text-[11px] truncate">{stage.name}</span>
                </div>
                {idx < stages.length - 1 && (
                  <div className="hidden sm:flex items-center">
                    <span
                      className={`w-4 h-0 border-t ${
                        stage.done ? 'border-ink border-[1.5px]' : 'border-line-dashed border-dashed'
                      }`}
                    />
                    <ArrowRight
                      className={`w-3.5 h-3.5 ${
                        stage.done ? 'text-ink' : 'text-line-dashed'
                      }`}
                    />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </WindowFrame>

      {/* Result Card in WindowFrame */}
      {result && (
        <WindowFrame
          title="SIMULATION_OUTPUT // PIPELINE_RESULT"
          hardShadow
          actions={
            <span className="font-mono text-[10px] uppercase font-bold text-ink bg-paper-sunken px-2 py-0.5 rounded-[4px] border border-line-soft">
              SIMULATED
            </span>
          }
        >
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-line-soft pb-4">
              <div>
                <h3 className="text-base font-serif font-normal text-ink">
                  Inference Output: Automated Decision
                </h3>
                <p className="text-xs text-ink-3 font-mono mt-0.5">
                  Evaluated with Isolation Forest + Rule-based fallback heuristics
                </p>
              </div>
              <DecisionBadge decision={result.decision || activeScenario.expectedDecision} size="lg" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              {/* Risk Gauge */}
              <div className="flex flex-col items-center justify-center p-4 bg-paper-sunken rounded-[8px] border border-line-soft">
                <RiskGauge score={result.risk_score || 0} size={150} />
              </div>

              {/* Reasons */}
              <div className="md:col-span-2 space-y-3">
                <h4 className="text-[10px] font-mono font-semibold uppercase tracking-wider text-ink-3">
                  Triggered Threat Factors &amp; Behavioral Deviations
                </h4>
                <div className="space-y-1.5">
                  {(result.reasons || result.risk_factors || [activeScenario.description]).map(
                    (r, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-[#F6E2DE] border border-danger/30 rounded-[6px] text-xs font-mono text-danger flex items-center gap-2"
                      >
                        <ShieldAlert className="w-4 h-4 shrink-0" />
                        <span>{typeof r === 'string' ? r : r.description || JSON.stringify(r)}</span>
                      </div>
                    )
                  )}
                </div>

                {/* Feature Telemetry */}
                {result.features && (
                  <div className="mt-4 pt-3 border-t border-line-soft">
                    <span className="text-[10px] font-mono font-semibold uppercase text-ink-3 block mb-1.5">
                      Extracted Features:
                    </span>
                    <div className="flex flex-wrap gap-1.5 text-xs font-mono">
                      {Object.entries(result.features).map(([k, v]) => (
                        <span key={k} className="px-2 py-0.5 rounded-[4px] bg-paper-sunken text-ink-2 border border-line-soft text-[11px]">
                          {k}: <strong className="text-ink font-semibold">{String(v)}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </WindowFrame>
      )}

      {/* Confirmation Modal for Reset Demo */}
      <Modal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title="Reset Demo Environment"
        description="Are you sure you want to reset all simulated logins and alerts to initial seed state?"
      >
        <div className="space-y-4 text-xs text-ink">
          <p className="text-ink-2">
            This action will wipe newly generated simulated telemetry and restore clean baseline events.
          </p>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setResetModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              isLoading={isResetting}
              onClick={async () => {
                await onResetDemo()
                setResetModalOpen(false)
              }}
            >
              Confirm Reset
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
