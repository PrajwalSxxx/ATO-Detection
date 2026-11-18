import React, { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { WindowFrame } from '@/components/ui/WindowFrame'
import { DataTable } from '@/components/ui/DataTable'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { CopyableMono } from '@/components/ui/CopyableMono'
import { Pagination } from '@/components/ui/Pagination'
import { SearchInput } from '@/components/ui/SearchInput'
import { useQuery } from '@tanstack/react-query'
import { getAuditLogs, exportAuditLogs } from '@/services/api'
import { formatDateTime } from '@/utils/formatters'
import { notify } from '@/components/ui/Toast'
import { Download } from 'lucide-react'

export default function AuditLogsPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [selectedLog, setSelectedLog] = useState(null)
  const [isExporting, setIsExporting] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', { search, page, pageSize }],
    queryFn: async () => {
      try {
        const res = await getAuditLogs({
          search: search || undefined,
          page,
          page_size: pageSize,
        })
        return res.data
      } catch {
        return { items: [], total: 0 }
      }
    },
  })

  const auditLogs = data?.items || []
  const total = data?.total || 0

  const handleExportCSV = async () => {
    setIsExporting(true)
    try {
      const res = await exportAuditLogs({ search })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `ato_audit_log_${Date.now()}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      notify.success('Audit log CSV exported')
    } catch {
      notify.error('Failed to export audit logs CSV')
    } finally {
      setIsExporting(false)
    }
  }

  const columns = [
    {
      key: 'actor',
      label: 'Security Actor',
      render: (val, row) => (
        <span className="font-mono text-xs font-medium text-ink">
          {val || row.actor_email || 'System'}
        </span>
      ),
    },
    {
      key: 'action',
      label: 'Action Taken',
      render: (val) => (
        <Badge variant="outline" size="sm" className="font-mono uppercase text-[10px]">
          {val || 'SYSTEM_ACTION'}
        </Badge>
      ),
    },
    {
      key: 'target',
      label: 'Target Resource',
      render: (val, row) => (
        <span className="text-xs text-ink-2 truncate max-w-[160px] block font-mono">
          {val || row.target_id || '—'}
        </span>
      ),
    },
    {
      key: 'ip_address',
      label: 'Actor IP',
      render: (val) => <CopyableMono text={val || '127.0.0.1'} />,
    },
    {
      key: 'created_at',
      label: 'Timestamp (UTC)',
      render: (val) => (
        <span className="font-mono text-xs text-ink-3 whitespace-nowrap">
          {formatDateTime(val)}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Immutable Audit Ledger"
        description="Tamper-evident system activity log recording all security posture modifications and administrative changes."
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCSV}
            isLoading={isExporting}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Export CSV
          </Button>
        }
      />

      <div className="bg-paper-raised border border-line-soft rounded-[10px] p-4 shadow-sm">
        <div className="max-w-md">
          <label className="text-[11px] font-mono uppercase tracking-wider text-ink-3 block mb-1">
            Search Ledger
          </label>
          <SearchInput
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Search actor email, action, or target..."
          />
        </div>
      </div>

      <WindowFrame
        title="TAMPER_EVIDENT_AUDIT_LOG"
        actions={
          <span className="font-mono text-[11px] text-ink-3">
            {total} immutable records
          </span>
        }
      >
        <div className="p-0">
          <DataTable
            columns={columns}
            data={auditLogs}
            isLoading={isLoading}
            onRowClick={(row) => setSelectedLog(row)}
            emptyTitle="No audit log entries"
            emptyDescription="No administrative actions match your current search query."
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

      {/* Audit Log Metadata Drawer */}
      <Drawer
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Audit Entry Metadata"
        description={`Entry ID: ${selectedLog?.id || '—'}`}
      >
        {selectedLog && (
          <div className="space-y-5 text-xs text-ink">
            <div className="p-4 bg-paper-sunken rounded-[8px] border border-line-soft space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-ink-3 font-mono text-[11px] uppercase">Actor:</span>
                <span className="font-mono font-medium text-ink">
                  {selectedLog.actor || selectedLog.actor_email || 'System'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-3 font-mono text-[11px] uppercase">Action:</span>
                <span className="font-mono text-ink font-semibold">
                  {selectedLog.action}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-3 font-mono text-[11px] uppercase">Recorded Timestamp:</span>
                <span className="font-mono text-ink-2">
                  {formatDateTime(selectedLog.created_at)}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-ink-3 font-mono uppercase font-semibold text-[10px] block">
                Structured Metadata Payload
              </span>
              <pre className="p-3 bg-paper-sunken rounded-[6px] border border-line-soft font-mono text-[11px] text-ink-2 overflow-x-auto">
                {JSON.stringify(selectedLog.metadata || selectedLog, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}
