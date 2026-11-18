import React, { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { WindowFrame } from '@/components/ui/WindowFrame'
import { SearchInput } from '@/components/ui/SearchInput'
import { Select } from '@/components/ui/Select'
import { Checkbox } from '@/components/ui/Checkbox'
import { Pagination } from '@/components/ui/Pagination'
import { LoginEventsTable } from '@/components/features/logins/LoginEventsTable'
import { LoginEventDrawer } from '@/components/features/logins/LoginEventDrawer'
import { useLogins } from '@/hooks/useLogins'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export default function LoginActivityPage() {
  const [search, setSearch] = useState('')
  const [riskLevel, setRiskLevel] = useState('ALL')
  const [decision, setDecision] = useState('ALL')
  const [simulatedOnly, setSimulatedOnly] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [sortColumn, setSortColumn] = useState('timestamp')
  const [sortDirection, setSortDirection] = useState('desc')
  const [selectedEvent, setSelectedEvent] = useState(null)

  const params = {
    search: search || undefined,
    risk_level: riskLevel !== 'ALL' ? riskLevel : undefined,
    decision: decision !== 'ALL' ? decision : undefined,
    is_simulated: simulatedOnly ? true : undefined,
    page,
    page_size: pageSize,
    sort_by: sortColumn,
    sort_dir: sortDirection,
  }

  const { logins, total, isLoading, refetch } = useLogins(params)

  const handleSort = (col, dir) => {
    setSortColumn(col)
    setSortDirection(dir)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Authentication Activity Ledger"
        description="Comprehensive audit trail of all authentication events, behavioral telemetry, and ML scores."
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

      {/* Filter Toolbar */}
      <div className="bg-paper-raised border border-line-soft rounded-[10px] p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          {/* Search */}
          <div className="lg:col-span-2">
            <label className="text-[11px] font-mono uppercase tracking-wider text-ink-3 block mb-1">
              Search User, IP, or Device
            </label>
            <SearchInput
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Search username, email, IP..."
            />
          </div>

          {/* Risk Level Filter */}
          <div>
            <Select
              label="Risk Band"
              value={riskLevel}
              onChange={(e) => {
                setRiskLevel(e.target.value)
                setPage(1)
              }}
              options={[
                { value: 'ALL', label: 'All Risk Bands' },
                { value: 'LOW', label: 'Low (0–30)' },
                { value: 'MEDIUM', label: 'Medium (31–70)' },
                { value: 'HIGH', label: 'High (71–100)' },
              ]}
            />
          </div>

          {/* Decision Filter */}
          <div>
            <Select
              label="Decision Policy"
              value={decision}
              onChange={(e) => {
                setDecision(e.target.value)
                setPage(1)
              }}
              options={[
                { value: 'ALL', label: 'All Decisions' },
                { value: 'ALLOW', label: 'ALLOW' },
                { value: 'REQUIRE_MFA', label: 'REQUIRE_MFA' },
                { value: 'BLOCK', label: 'BLOCK' },
              ]}
            />
          </div>

          {/* Simulated Only Toggle */}
          <div className="flex items-center h-10 pb-1">
            <Checkbox
              checked={simulatedOnly}
              onChange={(checked) => {
                setSimulatedOnly(checked)
                setPage(1)
              }}
              label="Simulated only"
            />
          </div>
        </div>
      </div>

      {/* Table & Pagination inside WindowFrame */}
      <WindowFrame
        title="EVENT_STREAM_LEDGER"
        actions={
          <span className="font-mono text-[11px] text-ink-3">
            {total} total records
          </span>
        }
      >
        <div className="p-0">
          <LoginEventsTable
            logins={logins}
            isLoading={isLoading}
            onRowClick={(event) => setSelectedEvent(event)}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
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

      {/* Event Details Drawer */}
      <LoginEventDrawer
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        event={selectedEvent}
      />
    </div>
  )
}
