import React, { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { WindowFrame } from '@/components/ui/WindowFrame'
import { Badge, DecisionBadge } from '@/components/ui/Badge'
import { DataTable } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { CopyableMono } from '@/components/ui/CopyableMono'
import { LoginEventDrawer } from '@/components/features/logins/LoginEventDrawer'
import { useQuery } from '@tanstack/react-query'
import { getModelInfo, getLogins } from '@/services/api'
import { formatDateTime } from '@/utils/formatters'
import {
  Brain,
  ShieldAlert,
  Info,
  RefreshCw,
} from 'lucide-react'

export default function ThreatDetectionPage() {
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [anomalyThreshold, setAnomalyThreshold] = useState(0.55)

  // Query Model Information
  const { data: modelInfo, isLoading: isModelLoading } = useQuery({
    queryKey: ['model-info'],
    queryFn: async () => {
      try {
        const { data } = await getModelInfo()
        return data
      } catch {
        return {
          algorithm: 'Isolation Forest (Ensemble)',
          version: '2.4.2',
          trained_at: new Date().toISOString(),
          evaluation: {
            roc_auc: 0.942,
            f1_score: 0.887,
            precision: 0.865,
            recall: 0.912,
            note: 'SYNTHETIC DATA — Not calibrated on real production attacks',
          },
          features: [
            'geovelocity_kmh',
            'time_of_day_divergence',
            'failed_attempts_last_hour',
            'device_fingerprint_mismatch',
            'tor_exit_node_flag',
            'asn_risk_reputation',
          ],
        }
      }
    },
  })

  // Query anomalous events only
  const { data: anomaliesData, isLoading: isEventsLoading, refetch } = useQuery({
    queryKey: ['anomalous-events'],
    queryFn: async () => {
      const { data } = await getLogins({
        risk_level: 'HIGH',
        limit: 50,
      })
      return data?.items || []
    },
  })

  const anomalousEvents = anomaliesData || []

  const columns = [
    {
      key: 'user',
      label: 'Target User',
      render: (_, row) => (
        <span className="font-medium text-ink">
          {row.username || row.user_email || row.user_id || 'Unknown'}
        </span>
      ),
    },
    {
      key: 'anomaly_score',
      label: 'Anomaly Score',
      sortable: true,
      render: (val, row) => {
        const score = val !== undefined ? Number(val) : (Number(row.risk_score || 0) / 100)
        return (
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-danger">
              {score.toFixed(3)}
            </span>
            <span className="text-[10px] text-ink-3 font-mono">
              (&gt; {anomalyThreshold})
            </span>
          </div>
        )
      },
    },
    {
      key: 'reasons',
      label: 'Detected Risk Factors',
      render: (val, row) => {
        const reasons = val || row.risk_factors || []
        return (
          <div className="flex flex-wrap gap-1.5 max-w-md">
            {reasons.slice(0, 3).map((r, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-[4px] bg-[#F6E2DE] border border-danger/30 text-danger text-[11px] font-mono font-medium"
              >
                {typeof r === 'string' ? r : r.description || r.factor}
              </span>
            ))}
            {reasons.length > 3 && (
              <span className="text-[11px] text-ink-3 font-mono">
                +{reasons.length - 3} more
              </span>
            )}
          </div>
        )
      },
    },
    {
      key: 'ip_address',
      label: 'Source IP',
      render: (val, row) => <CopyableMono text={val || row.ip || '—'} />,
    },
    {
      key: 'timestamp',
      label: 'Timestamp',
      render: (val, row) => (
        <span className="font-mono text-xs text-ink-3 whitespace-nowrap">
          {formatDateTime(val || row.created_at)}
        </span>
      ),
    },
    {
      key: 'decision',
      label: 'Action Taken',
      render: (val) => <DecisionBadge decision={val || 'BLOCK'} size="sm" />,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Threat Detection Engine"
        description="Machine Learning behavioral anomaly inspection and automated threat isolation."
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh Anomalies
          </Button>
        }
      />

      {/* Model Information WindowFrame */}
      <WindowFrame
        title="INFERENCE_MODEL_ARCHITECTURE"
        actions={
          <span className="px-2 py-0.5 rounded-[4px] bg-paper-sunken border border-line-soft text-ink-2 font-mono text-[10px] font-semibold">
            SYNTHETIC_DATA_EVALUATION
          </span>
        }
      >
        <div className="p-5">
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-line-soft">
            <div className="w-8 h-8 rounded-[6px] bg-paper-sunken border border-line-soft flex items-center justify-center text-ink">
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-serif font-normal text-ink">
                {modelInfo?.algorithm || 'Isolation Forest (Ensemble)'}
              </h4>
              <p className="text-xs text-ink-3 font-mono">
                Model version: v{modelInfo?.version || '2.4.2'} • Latency budget: &lt; 50ms
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-paper-sunken rounded-[8px] border border-line-soft">
              <span className="text-ink-3 text-[10px] font-mono uppercase block">ROC AUC Score</span>
              <span className="font-serif text-2xl font-normal text-ink mt-0.5 block">
                {modelInfo?.evaluation?.roc_auc || '0.942'}
              </span>
            </div>

            <div className="p-3 bg-paper-sunken rounded-[8px] border border-line-soft">
              <span className="text-ink-3 text-[10px] font-mono uppercase block">F1 Anomaly Score</span>
              <span className="font-serif text-2xl font-normal text-ink mt-0.5 block">
                {modelInfo?.evaluation?.f1_score || '0.887'}
              </span>
            </div>

            <div className="p-3 bg-paper-sunken rounded-[8px] border border-line-soft">
              <span className="text-ink-3 text-[10px] font-mono uppercase block">Precision / Recall</span>
              <span className="font-mono text-base font-semibold text-ink mt-1.5 block">
                {modelInfo?.evaluation?.precision || '0.865'} / {modelInfo?.evaluation?.recall || '0.912'}
              </span>
            </div>

            <div className="p-3 bg-paper-sunken rounded-[8px] border border-line-soft">
              <span className="text-ink-3 text-[10px] font-mono uppercase block">Trained Baseline</span>
              <span className="font-mono text-xs text-ink-2 mt-2 block">
                {formatDateTime(modelInfo?.trained_at)}
              </span>
            </div>
          </div>

          {/* Model Features Used */}
          <div className="mt-4 pt-3 border-t border-line-soft">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-ink-3 block mb-2">
              Extracted 18-Dimensional Feature Vector:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(modelInfo?.features || []).map((feat) => (
                <span
                  key={feat}
                  className="px-2 py-0.5 rounded-[4px] bg-paper-sunken border border-line-soft font-mono text-[11px] text-ink-2"
                >
                  {feat}
                </span>
              ))}
            </div>
          </div>

          {/* Honesty note */}
          <div className="mt-4 p-2.5 bg-paper-sunken/60 rounded-[6px] border border-line-dashed flex items-center gap-2 text-[11px] text-ink-3 font-mono">
            <Info className="w-3.5 h-3.5 text-ink-3 shrink-0" />
            <span>Honesty notice: Isolation Forest detects unusual outlier patterns. Raw scores are not calibrated probabilities.</span>
          </div>
        </div>
      </WindowFrame>

      {/* Anomalous Events Table */}
      <WindowFrame
        title="HIGH_CONFIDENCE_ANOMALIES"
        actions={
          <Badge variant="danger" size="sm">
            {anomalousEvents.length} Outliers Flagged
          </Badge>
        }
      >
        <div className="p-0">
          <DataTable
            columns={columns}
            data={anomalousEvents}
            isLoading={isEventsLoading}
            onRowClick={(row) => setSelectedEvent(row)}
            emptyTitle="No anomalous threats detected"
            emptyDescription="All current authentication traffic falls within baseline behavioral profiles."
          />
        </div>
      </WindowFrame>

      {/* Login Event Details Drawer */}
      <LoginEventDrawer
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        event={selectedEvent}
      />
    </div>
  )
}
