import React, { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { WindowFrame } from '@/components/ui/WindowFrame'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { CopyableMono } from '@/components/ui/CopyableMono'
import { Pagination } from '@/components/ui/Pagination'
import { SearchInput } from '@/components/ui/SearchInput'
import { Tabs } from '@/components/ui/Tabs'
import { useDevices } from '@/hooks/useDevices'
import { formatDateTime, formatRelativeTime } from '@/utils/formatters'
import {
  Laptop,
  Smartphone,
  ShieldAlert,
  Sparkles,
  ShieldCheck,
  Layers,
  X,
} from 'lucide-react'

export default function DevicesPage() {
  const [trustFilter, setTrustFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  const isTrustedParam =
    trustFilter === 'trusted'
      ? true
      : trustFilter === 'untrusted'
      ? false
      : undefined

  const { devices, total, isLoading } = useDevices({
    search: search || undefined,
    is_trusted: isTrustedParam,
    page,
    page_size: pageSize,
  })

  const handleTabChange = (val) => {
    setTrustFilter(val)
    setPage(1)
  }

  const handleClearFilters = () => {
    setTrustFilter('ALL')
    setSearch('')
    setPage(1)
  }

  const isFiltered = trustFilter !== 'ALL' || Boolean(search)

  const filterTabs = [
    { id: 'ALL', label: 'All Clients', icon: Layers },
    { id: 'trusted', label: 'Trusted Hardware', icon: ShieldCheck },
    { id: 'untrusted', label: 'Untrusted / New', icon: ShieldAlert },
  ]

  const columns = [
    {
      key: 'device_info',
      label: 'Device / Client',
      render: (_, row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[6px] bg-paper-sunken border border-line-soft flex items-center justify-center text-ink shrink-0">
            {row.device_type === 'mobile' ? (
              <Smartphone className="w-4 h-4" />
            ) : (
              <Laptop className="w-4 h-4" />
            )}
          </div>
          <div>
            <div className="font-medium text-ink text-xs">
              {row.browser || 'Browser'} on {row.os || 'OS'}
            </div>
            <div className="text-[11px] text-ink-3 font-mono">
              Owner: {row.user_email || row.username || 'Unassigned'}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'fingerprint',
      label: 'Fingerprint ID',
      render: (val) => <CopyableMono text={val || '—'} truncateLength={16} />,
    },
    {
      key: 'is_trusted',
      label: 'Trust Status',
      render: (val) => (
        <Badge variant={val ? 'success' : 'default'} size="sm" dot>
          {val ? 'Trusted Device' : 'Untrusted'}
        </Badge>
      ),
    },
    {
      key: 'flags',
      label: 'Security Flags',
      render: (_, row) => (
        <div className="flex items-center gap-1.5 font-mono text-[10px]">
          {row.is_new && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] bg-[#ECE9F9] border border-[#5B4BC4]/30 text-[#5B4BC4] font-semibold">
              <Sparkles className="w-3 h-3" /> NEW
            </span>
          )}
          {row.fingerprint_changed && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] bg-[#F8EFD9] border border-[#B7791F]/30 text-[#B7791F] font-semibold">
              <ShieldAlert className="w-3 h-3" /> MUTATED
            </span>
          )}
          {!row.is_new && !row.fingerprint_changed && (
            <span className="text-ink-3 text-xs">—</span>
          )}
        </div>
      ),
    },
    {
      key: 'first_seen',
      label: 'First Registered',
      render: (val) => (
        <span className="font-mono text-xs text-ink-3 whitespace-nowrap">
          {formatDateTime(val)}
        </span>
      ),
    },
    {
      key: 'last_seen',
      label: 'Last Active',
      render: (val) => (
        <span className="font-mono text-xs text-ink-2 whitespace-nowrap">
          {val ? formatRelativeTime(val) : '—'}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enrolled Hardware & Devices"
        description="Browser fingerprints, cryptographic device cookies, and trust authorizations."
        actions={
          isFiltered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              leftIcon={<X className="w-3.5 h-3.5" />}
            >
              Clear Filters
            </Button>
          )
        }
      />

      {/* Filter & Search Hub */}
      <div className="bg-paper-raised border border-line-soft rounded-[10px] p-4 shadow-sm space-y-4">
        {/* Top Trust Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line-soft pb-3">
          <Tabs
            tabs={filterTabs}
            activeTab={trustFilter}
            onChange={handleTabChange}
            layoutId="devicesTrustTabs"
          />

          <span className="font-mono text-xs text-ink-3 self-end sm:self-center">
            {isLoading ? 'Loading inventory...' : `${total} enrolled clients`}
          </span>
        </div>

        {/* Search Input */}
        <div className="max-w-md">
          <label className="text-[11px] font-mono uppercase tracking-wider text-ink-3 block mb-1">
            Search Enrolled Hardware
          </label>
          <SearchInput
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Search fingerprint, browser, or user..."
          />
        </div>
      </div>

      <WindowFrame
        title="HARDWARE_INVENTORY"
        actions={
          <span className="font-mono text-[11px] text-ink-3">
            {total} enrolled clients
          </span>
        }
      >
        <div className="p-0">
          <DataTable
            columns={columns}
            data={devices}
            isLoading={isLoading}
            emptyTitle="No devices registered"
            emptyDescription="No client hardware or browsers recorded in identity store."
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
    </div>
  )
}
