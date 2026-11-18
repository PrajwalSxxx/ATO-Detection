import React, { useState } from 'react'
import { DataTable } from '@/components/ui/DataTable'
import { StatusBadge } from '@/components/ui/Badge'
import { formatDateTime } from '@/utils/formatters'
import { SEVERITY_COLORS } from '@/utils/riskColors'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'

export function AlertsTable({
  alerts = [],
  isLoading = false,
  onRowClick,
  onUpdateStatus,
  isUpdating = false,
}) {
  const [selectedAlertForStatus, setSelectedAlertForStatus] = useState(null)
  const [newStatus, setNewStatus] = useState('investigating')
  const [statusNote, setStatusNote] = useState('')

  const handleOpenStatusModal = (e, alert) => {
    e.stopPropagation()
    setSelectedAlertForStatus(alert)
    setNewStatus(alert.status || 'investigating')
    setStatusNote('')
  }

  const handleConfirmStatus = async () => {
    if (!selectedAlertForStatus || !onUpdateStatus) return
    await onUpdateStatus({
      id: selectedAlertForStatus.id,
      status: newStatus,
      note: statusNote,
    })
    setSelectedAlertForStatus(null)
  }

  const columns = [
    {
      key: 'severity',
      label: 'Severity',
      width: '100px',
      render: (val) => {
        const sev = (val || 'medium').toLowerCase()
        const config = SEVERITY_COLORS[sev] || SEVERITY_COLORS.medium
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[11px] font-mono font-semibold uppercase ${config.bg} ${config.text}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {sev}
          </span>
        )
      },
    },
    {
      key: 'title',
      label: 'Incident & Heuristic Trigger',
      render: (val, row) => (
        <div className="flex flex-col">
          <span className="font-medium text-ink text-xs">
            {val || row.type || 'Suspicious Login Anomaly'}
          </span>
          <span className="text-[11px] text-ink-3 line-clamp-1">
            {row.description || row.details || 'Elevated anomaly score triggered ATO alert.'}
          </span>
        </div>
      ),
    },
    {
      key: 'target_user',
      label: 'Affected Identity',
      render: (val, row) => (
        <span className="font-mono text-xs text-ink-2">
          {val || row.user_email || row.username || 'System-wide'}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Detected At',
      render: (val) => (
        <span className="font-mono text-xs text-ink-3 whitespace-nowrap">
          {formatDateTime(val)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => <StatusBadge status={val || 'open'} size="sm" />,
    },
    {
      key: 'actions',
      label: 'Action',
      align: 'right',
      render: (_, row) => (
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => handleOpenStatusModal(e, row)}
        >
          Triage
        </Button>
      ),
    },
  ]

  return (
    <>
      <DataTable
        columns={columns}
        data={alerts}
        isLoading={isLoading}
        onRowClick={onRowClick}
        emptyTitle="No security alerts"
        emptyDescription="All clear — no security alerts match current criteria."
      />

      {/* Status Update Confirmation Modal */}
      <Modal
        isOpen={!!selectedAlertForStatus}
        onClose={() => setSelectedAlertForStatus(null)}
        title="Update Incident Triage Status"
        description={`Incident ID: ${selectedAlertForStatus?.id || '—'}`}
      >
        <div className="space-y-4">
          <Select
            label="New Triage Status"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            options={[
              { value: 'open', label: 'Open' },
              { value: 'investigating', label: 'Investigating' },
              { value: 'resolved', label: 'Resolved' },
              { value: 'false_positive', label: 'False Positive' },
            ]}
          />

          <div>
            <label className="text-[11px] font-mono uppercase tracking-wider text-ink-3 block mb-1">
              SecOps Investigation Note (Optional)
            </label>
            <textarea
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              placeholder="e.g. Identity verified with user via Out-Of-Band phone call..."
              rows={3}
              className="w-full bg-paper-sunken border border-line-soft rounded-[6px] text-ink text-xs p-2.5 focus:outline-none focus:border-ink focus:border-[1.5px] transition-colors"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => setSelectedAlertForStatus(null)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              isLoading={isUpdating}
              onClick={handleConfirmStatus}
            >
              Save Triage Status
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
