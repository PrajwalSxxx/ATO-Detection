import React, { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { WindowFrame } from '@/components/ui/WindowFrame'
import { AlertsTable } from '@/components/features/alerts/AlertsTable'
import { Drawer } from '@/components/ui/Drawer'
import { Select } from '@/components/ui/Select'
import { SearchInput } from '@/components/ui/SearchInput'
import { Pagination } from '@/components/ui/Pagination'
import { Button } from '@/components/ui/Button'
import { Tabs } from '@/components/ui/Tabs'
import { StatusBadge } from '@/components/ui/Badge'
import { useAlerts } from '@/hooks/useAlerts'
import { formatDateTime } from '@/utils/formatters'
import { notify } from '@/components/ui/Toast'
import {
  RefreshCw,
  X,
  Bell,
  Clock,
  CheckCircle2,
  AlertOctagon,
  ShieldAlert,
  Layers,
} from 'lucide-react'

export default function AlertsPage() {
  const [severity, setSeverity] = useState('ALL')
  const [status, setStatus] = useState('ALL')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [selectedAlert, setSelectedAlert] = useState(null)

  const handleTabChange = (newStatus) => {
    setStatus(newStatus)
    setPage(1)
  }

  const handleClearFilters = () => {
    setStatus('ALL')
    setSeverity('ALL')
    setSearch('')
    setPage(1)
  }

  const isFiltered = status !== 'ALL' || severity !== 'ALL' || Boolean(search)

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

  const statusTabs = [
    { id: 'ALL', label: 'All Incidents', icon: Layers },
    { id: 'open', label: 'Open Triage', icon: Bell },
    { id: 'investigating', label: 'In Review', icon: Clock },
    { id: 'resolved', label: 'Resolved', icon: CheckCircle2 },
    { id: 'false_positive', label: 'False Positive', icon: AlertOctagon },
  ]

  const severityOptions = [
    { id: 'ALL', label: 'All Severities' },
    { id: 'critical', label: 'Critical' },
    { id: 'high', label: 'High' },
    { id: 'medium', label: 'Medium' },
    { id: 'low', label: 'Low' },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security Alerts & Incidents"
        description="Investigate flagged account anomalies, impossible velocity events, and credential stuffing attacks."
        actions={
          <div className="flex items-center gap-2">
            {isFiltered && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                leftIcon={<X className="w-3.5 h-3.5" />}
              >
                Clear Filters
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => refetch()}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Refresh
            </Button>
          </div>
        }
      />

      {/* Filter & Search Hub */}
      <div className="bg-paper-raised border border-line-soft rounded-[10px] p-4 shadow-sm space-y-4">
        {/* Top Triage Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line-soft pb-3">
          <Tabs
            tabs={statusTabs}
            activeTab={status}
            onChange={handleTabChange}
            layoutId="alertsStatusTabs"
          />

          <span className="font-mono text-xs text-ink-3 self-end sm:self-center">
            {isLoading ? 'Loading triage...' : `${total} matching incidents`}
          </span>
        </div>

        {/* Search & Severity Chips Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div className="sm:col-span-2">
            <label className="text-[11px] font-mono uppercase tracking-wider text-ink-3 block mb-1">
              Search Alert Title, IP, or Target User
            </label>
            <SearchInput
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Search alert title or user email..."
            />
          </div>

          <div>
            <label className="text-[11px] font-mono uppercase tracking-wider text-ink-3 block mb-1">
              Severity Level
            </label>
            <div className="flex items-center gap-1 overflow-x-auto p-1 bg-paper-sunken border border-line-soft rounded-[6px]">
              {severityOptions.map((opt) => {
                const isSelected = severity === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setSeverity(opt.id)
                      setPage(1)
                    }}
                    className={`px-2 py-1 text-xs font-mono rounded transition-colors whitespace-nowrap cursor-pointer ${
                      isSelected
                        ? 'bg-ink text-paper font-semibold shadow-2xs'
                        : 'text-ink-2 hover:text-ink hover:bg-paper-hover'
                    }`}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
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
              onPageSizeChange={(newSize) => {
                setPageSize(newSize)
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
