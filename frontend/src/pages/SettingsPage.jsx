import React, { useState, useEffect } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { WindowFrame } from '@/components/ui/WindowFrame'
import { Tabs } from '@/components/ui/Tabs'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { DecisionBadge } from '@/components/ui/Badge'
import { useSettings } from '@/hooks/useSettings'
import { useAuth } from '@/context/AuthContext'
import { notify } from '@/components/ui/Toast'
import { Sliders, KeyRound, Server, Save } from 'lucide-react'

export default function SettingsPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [activeTab, setActiveTab] = useState('thresholds')
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)

  // Local form states
  const [lowCutoff, setLowCutoff] = useState(30)
  const [highCutoff, setHighCutoff] = useState(70)
  const [otpExpiry, setOtpExpiry] = useState(5)
  const [maxOtpAttempts, setMaxOtpAttempts] = useState(3)
  const [resendCooldown, setResendCooldown] = useState(60)

  const { settings, isLoading, updateSettings, isUpdating } = useSettings()

  useEffect(() => {
    if (settings) {
      if (settings.risk_low_threshold !== undefined) setLowCutoff(settings.risk_low_threshold)
      if (settings.risk_high_threshold !== undefined) setHighCutoff(settings.risk_high_threshold)
      if (settings.mfa_otp_expire_minutes !== undefined) setOtpExpiry(settings.mfa_otp_expire_minutes)
      if (settings.mfa_max_attempts !== undefined) setMaxOtpAttempts(settings.mfa_max_attempts)
      if (settings.mfa_resend_cooldown_seconds !== undefined) setResendCooldown(settings.mfa_resend_cooldown_seconds)
    }
  }, [settings])

  const handleSave = async () => {
    try {
      await updateSettings({
        risk_low_threshold: Number(lowCutoff),
        risk_high_threshold: Number(highCutoff),
        mfa_otp_expire_minutes: Number(otpExpiry),
        mfa_max_attempts: Number(maxOtpAttempts),
        mfa_resend_cooldown_seconds: Number(resendCooldown),
      })
      notify.success('Security policy thresholds updated successfully')
      setConfirmModalOpen(false)
    } catch (err) {
      notify.error(err.normalizedMessage || 'Failed to update settings')
    }
  }

  // Live preview samples
  const sampleScores = [15, 30, 48, 70, 85]
  const classify = (score) => {
    if (score <= lowCutoff) return { decision: 'ALLOW', level: 'LOW' }
    if (score <= highCutoff) return { decision: 'REQUIRE_MFA', level: 'MEDIUM' }
    return { decision: 'BLOCK', level: 'HIGH' }
  }

  const tabs = [
    { id: 'thresholds', label: 'Risk Thresholds', icon: Sliders },
    { id: 'mfa', label: 'MFA Configuration', icon: KeyRound },
    { id: 'system', label: 'System Diagnostics', icon: Server },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security Engine Configuration"
        description="Configure decision thresholds, adaptive MFA policies, and system runtime parameters."
      />

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab: Risk Thresholds */}
      {activeTab === 'thresholds' && (
        <div className="space-y-6">
          <WindowFrame title="CONTINUOUS_RISK_THRESHOLDS">
            <div className="p-5 space-y-6 text-ink">
              <div>
                <h4 className="text-sm font-serif font-normal text-ink">
                  Continuous Risk Classification Cutoffs
                </h4>
                <p className="text-xs text-ink-3 mt-0.5">
                  Set score demarcations for automated ALLOW, REQUIRE_MFA, and BLOCK actions.
                </p>
              </div>

              {/* Slider 1: Low Cutoff */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-ink">
                    Low Risk Cutoff (ALLOW Upper Bound)
                  </label>
                  <span className="font-mono text-xs font-bold text-[#2F7D5B] px-2 py-0.5 rounded-[4px] bg-[#E6F1EA] border border-[#2F7D5B]/30">
                    0 to {lowCutoff}
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="50"
                  value={lowCutoff}
                  disabled={!isAdmin}
                  onChange={(e) => setLowCutoff(Number(e.target.value))}
                  className="w-full accent-ink cursor-pointer"
                />
                <p className="text-[11px] text-ink-3 font-mono">
                  Logins scoring ≤ {lowCutoff} are granted direct frictionless access.
                </p>
              </div>

              {/* Slider 2: High Cutoff */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-ink">
                    High Risk Cutoff (BLOCK Lower Bound)
                  </label>
                  <span className="font-mono text-xs font-bold text-danger px-2 py-0.5 rounded-[4px] bg-[#F6E2DE] border border-danger/30">
                    {highCutoff} to 100
                  </span>
                </div>
                <input
                  type="range"
                  min="51"
                  max="95"
                  value={highCutoff}
                  disabled={!isAdmin}
                  onChange={(e) => setHighCutoff(Number(e.target.value))}
                  className="w-full accent-ink cursor-pointer"
                />
                <p className="text-[11px] text-ink-3 font-mono">
                  Logins scoring ≥ {highCutoff} trigger policy block and immediate incident dispatch.
                </p>
              </div>

              {/* Live Preview of Scores */}
              <div className="p-4 bg-paper-sunken rounded-[8px] border border-line-soft space-y-3">
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-ink-3 block">
                  Live Preview: Policy Evaluation on Sample Risk Scores
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                  {sampleScores.map((score) => {
                    const result = classify(score)
                    return (
                      <div
                        key={score}
                        className="p-3 bg-paper-raised rounded-[6px] border border-line-soft flex flex-col items-center gap-1.5 text-center shadow-xs"
                      >
                        <span className="font-mono text-xs text-ink-3">
                          Score: <strong className="text-ink">{score}</strong>
                        </span>
                        <DecisionBadge decision={result.decision} size="sm" />
                      </div>
                    )
                  })}
                </div>
              </div>

              {isAdmin ? (
                <div className="flex justify-end pt-2">
                  <Button
                    variant="primary"
                    onClick={() => setConfirmModalOpen(true)}
                    leftIcon={<Save className="w-4 h-4" />}
                  >
                    Save Threshold Changes
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-[#B7791F] bg-[#F8EFD9] p-3 rounded-[6px] border border-[#B7791F]/30 font-mono">
                  Analyst read-only mode. Policy alterations require Administrator authorization.
                </p>
              )}
            </div>
          </WindowFrame>
        </div>
      )}

      {/* Tab: MFA Configuration */}
      {activeTab === 'mfa' && (
        <WindowFrame title="ADAPTIVE_MFA_PARAMETERS">
          <div className="p-5 space-y-4 max-w-lg text-ink">
            <Input
              label="OTP Expiration Window (Minutes)"
              type="number"
              min="1"
              max="60"
              value={otpExpiry}
              disabled={!isAdmin}
              onChange={(e) => setOtpExpiry(Number(e.target.value))}
              helperText="How long a generated OTP code remains valid for entry."
            />

            <Input
              label="Max Failed Verification Attempts"
              type="number"
              min="1"
              max="10"
              value={maxOtpAttempts}
              disabled={!isAdmin}
              onChange={(e) => setMaxOtpAttempts(Number(e.target.value))}
              helperText="Number of incorrect submissions before session is invalidated."
            />

            <Input
              label="Resend Cooldown (Seconds)"
              type="number"
              min="15"
              max="300"
              value={resendCooldown}
              disabled={!isAdmin}
              onChange={(e) => setResendCooldown(Number(e.target.value))}
              helperText="Time users must wait before requesting a replacement OTP."
            />

            {isAdmin && (
              <div className="flex justify-end pt-4">
                <Button
                  variant="primary"
                  onClick={() => setConfirmModalOpen(true)}
                  leftIcon={<Save className="w-4 h-4" />}
                >
                  Save MFA Settings
                </Button>
              </div>
            )}
          </div>
        </WindowFrame>
      )}

      {/* Tab: System Information */}
      {activeTab === 'system' && (
        <WindowFrame title="ENVIRONMENT_DIAGNOSTICS">
          <div className="p-5">
            <div className="space-y-3 text-xs max-w-xl text-ink font-mono">
              <div className="flex items-center justify-between py-2 border-b border-line-soft">
                <span className="text-ink-3">Platform:</span>
                <span className="font-semibold text-ink">AI-ATO Sentinel Enterprise</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-line-soft">
                <span className="text-ink-3">Frontend Version:</span>
                <span className="text-ink">2.4.0 (React 18 + Vite)</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-line-soft">
                <span className="text-ink-3">Backend Engine:</span>
                <span className="text-ink">FastAPI (Python 3.11)</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-line-soft">
                <span className="text-ink-3">Inference Engine:</span>
                <span className="text-ink font-semibold">Isolation Forest + RobustScaler</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-line-soft">
                <span className="text-ink-3">Telemetry Store:</span>
                <span className="text-ink">SQLite (Local) / PostgreSQL</span>
              </div>
            </div>
          </div>
        </WindowFrame>
      )}

      {/* Confirmation Modal */}
      <Modal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title="Confirm Policy Modification"
        description="Are you sure you want to apply these updated threshold rules across the organization?"
      >
        <div className="space-y-4 text-xs text-ink">
          <p className="text-ink-2">
            Changes take effect immediately for all subsequent authentication requests processed by the inference engine.
          </p>

          <div className="p-3 bg-paper-sunken rounded-[6px] border border-line-soft font-mono space-y-1">
            <div>Low cutoff: {lowCutoff}</div>
            <div>High cutoff: {highCutoff}</div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setConfirmModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" isLoading={isUpdating} onClick={handleSave}>
              Confirm &amp; Save
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
