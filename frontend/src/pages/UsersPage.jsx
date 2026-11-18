import React, { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { WindowFrame } from '@/components/ui/WindowFrame'
import { DataTable } from '@/components/ui/DataTable'
import { Badge, RiskBadge, StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Pagination } from '@/components/ui/Pagination'
import { SearchInput } from '@/components/ui/SearchInput'
import { useUsers, useUserLogins, useUserDevices } from '@/hooks/useUsers'
import { formatDateTime, formatRelativeTime } from '@/utils/formatters'
import { notify } from '@/components/ui/Toast'
import {
  UserPlus,
  UserX,
  Laptop,
  Activity,
  Eye,
} from 'lucide-react'

export default function UsersPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [selectedUser, setSelectedUser] = useState(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  // Form states for create user
  const [newEmail, setNewEmail] = useState('')
  const [newFullName, setNewFullName] = useState('')
  const [newRole, setNewRole] = useState('user')
  const [newPassword, setNewPassword] = useState('')

  const {
    users,
    total,
    isLoading,
    createUser,
    isCreating,
    deactivateUser,
    isDeactivating,
  } = useUsers({ search, page, page_size: pageSize })

  // User detail secondary data
  const { data: userLogins } = useUserLogins(selectedUser?.id, { limit: 10 })
  const { data: userDevices } = useUserDevices(selectedUser?.id)

  const handleCreateUser = async (e) => {
    e.preventDefault()
    try {
      await createUser({
        email: newEmail,
        full_name: newFullName,
        role: newRole,
        password: newPassword,
      })
      notify.success('User account created successfully')
      setIsCreateOpen(false)
      setNewEmail('')
      setNewFullName('')
      setNewPassword('')
    } catch (err) {
      notify.error(err.normalizedMessage || 'Failed to create user')
    }
  }

  const handleDeactivate = async (id) => {
    try {
      await deactivateUser(id)
      notify.success('User account deactivated')
      if (selectedUser?.id === id) {
        setSelectedUser(null)
      }
    } catch (err) {
      notify.error(err.normalizedMessage || 'Failed to deactivate user')
    }
  }

  const columns = [
    {
      key: 'full_name',
      label: 'Name & Email',
      render: (val, row) => (
        <div className="flex flex-col">
          <span className="font-medium text-ink text-xs">
            {val || row.email?.split('@')[0] || 'User'}
          </span>
          <span className="font-mono text-[11px] text-ink-3">
            {row.email}
          </span>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      render: (val) => (
        <Badge
          variant={val === 'admin' ? 'outline' : 'default'}
          size="sm"
        >
          {val || 'user'}
        </Badge>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => <StatusBadge status={val || 'active'} size="sm" />,
    },
    {
      key: 'last_login',
      label: 'Last Authentication',
      render: (val) => (
        <span className="font-mono text-xs text-ink-3">
          {val ? formatRelativeTime(val) : 'Never'}
        </span>
      ),
    },
    {
      key: 'risk_level',
      label: 'Current Risk',
      render: (val, row) => (
        <RiskBadge level={val || 'LOW'} score={row.risk_score} size="sm" />
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedUser(row)}
            aria-label="View user details"
          >
            <Eye className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-danger hover:bg-[#F6E2DE]"
            onClick={() => handleDeactivate(row.id)}
            aria-label="Deactivate user"
          >
            <UserX className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Identity Directory"
        description="Directory of provisioned users, identity risk profiles, and associated authorized devices."
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            leftIcon={<UserPlus className="w-3.5 h-3.5" />}
          >
            Provision User
          </Button>
        }
      />

      {/* Search Toolbar */}
      <div className="bg-paper-raised border border-line-soft rounded-[10px] p-4 shadow-sm">
        <div className="max-w-md">
          <label className="text-[11px] font-mono uppercase tracking-wider text-ink-3 block mb-1">
            Search Identities
          </label>
          <SearchInput
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Search by name or email address..."
          />
        </div>
      </div>

      {/* Users Table */}
      <WindowFrame
        title="IDENTITY_ROSTER"
        actions={
          <span className="font-mono text-[11px] text-ink-3">
            {total} provisioned identities
          </span>
        }
      >
        <div className="p-0">
          <DataTable
            columns={columns}
            data={users}
            isLoading={isLoading}
            onRowClick={(row) => setSelectedUser(row)}
            emptyTitle="No users found"
            emptyDescription="No identity accounts match your current query."
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

      {/* Create User Drawer */}
      <Drawer
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Provision Identity Account"
        description="Add an employee or service account identity to directory."
      >
        <form onSubmit={handleCreateUser} className="space-y-4 pt-2">
          <Input
            label="Full Name"
            placeholder="Jane Doe"
            value={newFullName}
            onChange={(e) => setNewFullName(e.target.value)}
            required
          />

          <Input
            label="Corporate Email"
            type="email"
            placeholder="jane.doe@ato-platform.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            required
          />

          <Select
            label="Assigned Role"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            options={[
              { value: 'user', label: 'Standard User' },
              { value: 'analyst', label: 'Security Analyst' },
              { value: 'admin', label: 'Administrator' },
            ]}
          />

          <Input
            label="Initial Password"
            type="password"
            placeholder="••••••••••••"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-line-soft">
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isCreating}>
              Provision User
            </Button>
          </div>
        </form>
      </Drawer>

      {/* User Details Drawer */}
      <Drawer
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        title={selectedUser?.full_name || selectedUser?.email}
        description={`Identity ID: ${selectedUser?.id || '—'}`}
      >
        {selectedUser && (
          <div className="space-y-6 text-xs text-ink">
            {/* Identity Summary Card */}
            <div className="p-4 rounded-[8px] bg-paper-sunken border border-line-soft space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-ink-3 font-mono text-[11px] uppercase">Account Status:</span>
                <StatusBadge status={selectedUser.status || 'active'} size="sm" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-3 font-mono text-[11px] uppercase">Role:</span>
                <Badge variant="outline" size="sm">
                  {selectedUser.role || 'user'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-3 font-mono text-[11px] uppercase">Current Risk Profile:</span>
                <RiskBadge level={selectedUser.risk_level || 'LOW'} score={selectedUser.risk_score} size="sm" />
              </div>
            </div>

            {/* Registered Devices */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-mono font-semibold uppercase tracking-wider text-ink-3 flex items-center gap-1.5">
                <Laptop className="w-4 h-4 text-ink" /> Enrolled Devices
              </h4>
              {(!userDevices || userDevices.length === 0) ? (
                <p className="text-ink-3 bg-paper-sunken p-3 rounded-[6px] border border-line-soft font-mono">
                  No devices currently enrolled to this identity.
                </p>
              ) : (
                <div className="space-y-2">
                  {userDevices.map((d, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-paper-sunken rounded-[6px] border border-line-soft flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium text-ink">
                          {d.browser || 'Browser'} on {d.os || 'OS'}
                        </div>
                        <div className="text-ink-3 font-mono text-[11px]">
                          Fingerprint: {d.fingerprint?.slice(0, 12)}…
                        </div>
                      </div>
                      <Badge variant={d.is_trusted ? 'success' : 'default'} size="sm">
                        {d.is_trusted ? 'Trusted' : 'Untrusted'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Login History */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-mono font-semibold uppercase tracking-wider text-ink-3 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-ink" /> Recent Sign-ins
              </h4>
              {(!userLogins?.items || userLogins.items.length === 0) ? (
                <p className="text-ink-3 bg-paper-sunken p-3 rounded-[6px] border border-line-soft font-mono">
                  No authentication logs found for this user.
                </p>
              ) : (
                <div className="space-y-2">
                  {userLogins.items.map((lg) => (
                    <div
                      key={lg.id}
                      className="p-2.5 bg-paper-sunken rounded-[6px] border border-line-soft flex items-center justify-between"
                    >
                      <div>
                        <div className="font-mono text-ink text-[11px]">
                          {formatDateTime(lg.timestamp || lg.created_at)}
                        </div>
                        <div className="text-ink-3 font-mono text-[10px]">
                          IP: {lg.ip_address || '—'}
                        </div>
                      </div>
                      <RiskBadge level={lg.risk_level || 'LOW'} score={lg.risk_score} size="sm" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}
