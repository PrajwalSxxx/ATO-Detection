import React, { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { WindowFrame } from '@/components/ui/WindowFrame'
import { AlertsTable } from '@/components/features/alerts/AlertsTable'
import { Drawer } from '@/components/ui/Drawer'
import { Select } from '@/components/ui/Select'
import { SearchInput } from '@/components/ui/SearchInput'
import { Pagination } from '@/components/ui/Pagination'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Badge'
import { useAlerts } from '@/hooks/useAlerts'
import { formatDateTime } from '@/utils/formatters'
import { notify } from '@/components/ui/Toast'
import { RefreshCw } from 'lucide-react'

export default function AlertsPage() {
  const [severity, setSeverity] = useState('ALL')
  const [status, setStatus] = useState('ALL')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [selectedAlert, setSelectedAlert] = useState(null)

  const params = {
    severity: severity !== 'ALL' ? severity : undefined,
    status: status !== 'ALL' ? status : undefined,
    search: search || undefined,
    page,
    page_size: pageSize,
  }

  const {
    alerts,
    total,
    isLoading,
    refetch,
    updateStatus,
    isUpdating,
  } = useAlerts(params)

  const handleUpdateStatus = async ({ id, status, note }) => {
    try {
      await updateStatus({ id, status, note })
      notify.success(`Alert marked as ${status}`)
      if (selectedAlert?.id === id) {
        setSelectedAlert((prev) => ({ ...prev, status }))
      }
    } catch (err) {
      notify.error(err.normalizedMessage || 'Failed to update alert')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security Alerts & Incidents"
        description="Investigate flagged account anomalies, impossible velocity events, and credential stuffing attacks."
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
        }
      />

      {/* Filter Bar */}
      <div className="bg-paper-raised border border-line-soft rounded-[10px] p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] font-mono uppercase tracking-wider text-ink-3 block mb-1">
              Search Alert or Target
            </label>
            <SearchInput
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Search alert title or user..."
            />
          </div>

          <div>
            <Select
              label="Severity Filter"
              value={severity}
              onChange={(e) => {
                setSeverity(e.target.value)
                setPage(1)
              }}
              options={[
                { value: 'ALL', label: 'All Severities' },
                { value: 'critical', label: 'Critical' },
                { value: 'high', label: 'High' },
                { value: 'medium', label: 'Medium' },
                { value: 'low', label: 'Low' },
              ]}
            />
          </div>

          <div>
            <Select
              label="Triage Status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value)
                setPage(1)
              }}
              options={[
                { value: 'ALL', label: 'All Statuses' },
                { value: 'open', label: 'Open' },
                { value: 'investigating', label: 'Investigating' },
                { value: 'resolved', label: 'Resolved' },
                { value: 'false_positive', label: 'False Positive' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Alerts Table */}
      <WindowFrame
        title="INCIDENT_QUEUE"
        actions={
          <span className="font-mono text-[11px] text-ink-3">
            {total} incidents recorded
          </span>
        }
      >
        <div className="p-0">
          <AlertsTable
            alerts={alerts}
            isLoading={isLoading}
            onRowClick={(alert) => setSelectedAlert(alert)}
            onUpdateStatus={handleUpdateStatus}
            isUpdating={isUpdating}
          />

          <div className="p-4 border-t border-line-soft bg-paper-sunken/40">
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
              onPageSizeChange={(sz) => {
                setPageSize(sz)
                setPage(1)
              }}
            />
          </div>
        </div>
      </WindowFrame>

      {/* Alert Detail Drawer */}
      <Drawer
        isOpen={!!selectedAlert}
        onClose={() => setSelectedAlert(null)}
        title={selectedAlert?.title || 'Security Incident'}
        description={`Alert ID: ${selectedAlert?.id || '—'}`}
      >
        {selectedAlert && (
          <div className="space-y-6 text-xs text-ink">
            {/* Severity & Status */}
            <div className="p-4 rounded-[8px] bg-paper-sunken border border-line-soft flex items-center justify-between">
              <div>
                <span className="text-ink-3 font-mono text-[10px] uppercase block">Severity</span>
                <span className="font-mono font-bold text-danger text-sm uppercase">
                  {selectedAlert.severity || 'Medium'}
                </span>
              </div>
              <div>
                <span className="text-ink-3 font-mono text-[10px] uppercase block mb-1">Status</span>
                <StatusBadge status={selectedAlert.status || 'open'} size="md" />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <span className="text-ink-3 font-mono uppercase font-semibold text-[10px]">
                Incident Heuristics
              </span>
              <p className="text-ink text-xs leading-relaxed bg-paper-sunken p-3 rounded-[6px] border border-line-soft">
                {selectedAlert.description || selectedAlert.details || 'No detailed incident notes provided.'}
              </p>
            </div>

            {/* Target Account & Timestamp */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-paper-sunken rounded-[6px] border border-line-soft">
                <span className="text-ink-3 text-[10px] font-mono uppercase block">Affected Account</span>
                <span className="font-medium text-ink mt-1 block truncate">
                  {selectedAlert.target_user || selectedAlert.user_email || 'System-wide'}
                </span>
              </div>

              <div className="p-3 bg-paper-sunken rounded-[6px] border border-line-soft">
                <span className="text-ink-3 text-[10px] font-mono uppercase block">Detected At</span>
                <span className="font-mono text-ink mt-1 block">
                  {formatDateTime(selectedAlert.created_at)}
                </span>
              </div>
            </div>

            {/* Evidence & Technical Signals */}
            {selectedAlert.evidence && (
              <div className="space-y-1">
                <span className="text-ink-3 font-mono uppercase font-semibold text-[10px]">
                  Technical Telemetry Evidence
                </span>
                <pre className="p-3 rounded-[6px] bg-paper-sunken border border-line-soft font-mono text-[11px] text-ink-2 overflow-x-auto">
                  {typeof selectedAlert.evidence === 'string'
                    ? selectedAlert.evidence
                    : JSON.stringify(selectedAlert.evidence, null, 2)}
                </pre>
              </div>
            )}

            {/* Quick Status Action Buttons */}
            <div className="pt-4 border-t border-line-soft space-y-2">
              <span className="text-ink-3 font-mono uppercase font-semibold text-[10px] block">
                Quick Resolution Actions
              </span>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    handleUpdateStatus({
                      id: selectedAlert.id,
                      status: 'resolved',
                      note: 'Resolved directly from drawer',
                    })
                  }
                >
                  Mark Resolved
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleUpdateStatus({
                      id: selectedAlert.id,
                      status: 'false_positive',
                      note: 'Flagged as false positive',
                    })
                  }
                >
                  Mark False Positive
                </Button>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}
