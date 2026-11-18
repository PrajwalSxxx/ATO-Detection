import React, { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Activity,
  ShieldAlert,
  BarChart3,
  Users,
  Bell,
  Laptop,
  FileText,
  Settings,
  Cpu,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react'
import { cn } from '../ui/Button'
import { Tooltip } from '../ui/Tooltip'
import { ROUTES } from '@/constants/routes'
import { useQuery } from '@tanstack/react-query'
import { getUnresolvedAlertCount } from '@/services/api'

export function Sidebar() {
  const location = useLocation()
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true'
  })

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', isCollapsed ? 'true' : 'false')
  }, [isCollapsed])

  // Get unresolved alerts count for badge
  const { data: alertCountData } = useQuery({
    queryKey: ['unresolved-alert-count'],
    queryFn: async () => {
      try {
        const { data } = await getUnresolvedAlertCount()
        return data?.count || 0
      } catch {
        return 0
      }
    },
    refetchInterval: 30000,
  })

  const unresolvedCount = alertCountData || 0

  const navSections = [
    {
      title: 'Monitor',
      items: [
        { label: 'Dashboard', icon: LayoutDashboard, path: ROUTES.DASHBOARD },
        { label: 'Login Activity', icon: Activity, path: ROUTES.LOGIN_ACTIVITY },
        { label: 'Threat Detection', icon: ShieldAlert, path: ROUTES.THREAT_DETECTION },
        { label: 'Risk Analytics', icon: BarChart3, path: ROUTES.RISK_ANALYTICS },
      ],
    },
    {
      title: 'Manage',
      items: [
        { label: 'Users', icon: Users, path: ROUTES.USERS },
        {
          label: 'Alerts',
          icon: Bell,
          path: ROUTES.ALERTS,
          badge: unresolvedCount > 0 ? unresolvedCount : null,
        },
        { label: 'Devices', icon: Laptop, path: ROUTES.DEVICES },
      ],
    },
    {
      title: 'System',
      items: [
        { label: 'Audit Logs', icon: FileText, path: ROUTES.AUDIT_LOGS },
        { label: 'Settings', icon: Settings, path: ROUTES.SETTINGS },
        { label: 'Login Simulator', icon: Cpu, path: ROUTES.SIMULATOR },
      ],
    },
  ]

  return (
    <aside
      className={cn(
        'fixed top-0 left-0 bottom-0 z-30 bg-paper border-r border-line-soft transition-all duration-200 ease-out select-none',
        'hidden md:flex flex-col',
        isCollapsed ? 'w-[72px]' : 'w-[248px]'
      )}
    >
      {/* Brand Logo Header */}
      <div className="h-16 px-4 border-b border-line-soft flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 rounded-[6px] border border-ink bg-paper-raised flex items-center justify-center text-ink shrink-0 shadow-sm">
            <ShieldCheck className="w-4 h-4 stroke-[1.75]" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col truncate animate-in fade-in duration-150">
              <span className="text-sm font-semibold tracking-tight text-ink">
                AI-ATO <span className="font-serif italic font-normal text-ink">Sentinel</span>
              </span>
              <span className="text-[10px] text-ink-3 uppercase font-mono tracking-wider">
                Detection Platform
              </span>
            </div>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            'p-1.5 rounded-[4px] border border-line-soft text-ink-3 hover:text-ink hover:border-ink transition-colors',
            isCollapsed && 'hidden'
          )}
          aria-label="Collapse sidebar"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 space-y-6">
        {navSections.map((section) => (
          <div key={section.title} className="space-y-1">
            {!isCollapsed ? (
              <div className="px-3 pb-1 text-[11px] font-mono uppercase tracking-wider text-ink-3">
                {section.title}
              </div>
            ) : (
              <div className="h-2" />
            )}

            {section.items.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path

              const linkContent = (
                <NavLink
                  to={item.path}
                  className={cn(
                    'relative flex items-center gap-3 px-3 py-2 rounded-[6px] text-xs font-medium transition-all duration-120 group',
                    isActive
                      ? 'bg-ink text-paper font-medium shadow-sm'
                      : 'text-ink-2 hover:text-ink hover:bg-paper-hover',
                    isCollapsed && 'justify-center px-0'
                  )}
                >
                  <Icon
                    className={cn(
                      'w-4 h-4 shrink-0 transition-colors',
                      isActive ? 'text-paper stroke-[2]' : 'text-ink-3 group-hover:text-ink stroke-[1.5]'
                    )}
                  />

                  {!isCollapsed && (
                    <span className="truncate flex-1">{item.label}</span>
                  )}

                  {!isCollapsed && item.badge && (
                    <span
                      className={cn(
                        'px-1.5 py-0.2 text-[10px] font-mono font-bold rounded-full shrink-0',
                        isActive
                          ? 'bg-paper text-ink'
                          : 'bg-[#B3382C] text-white'
                      )}
                    >
                      {item.badge}
                    </span>
                  )}

                  {isCollapsed && item.badge && (
                    <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-[#B3382C]" />
                  )}
                </NavLink>
              )

              if (isCollapsed) {
                return (
                  <Tooltip key={item.path} content={item.label} className="w-full">
                    {linkContent}
                  </Tooltip>
                )
              }

              return <React.Fragment key={item.path}>{linkContent}</React.Fragment>
            })}
          </div>
        ))}
      </div>

      {/* Footer / Expand Button for Collapsed State */}
      {isCollapsed && (
        <div className="p-3 border-t border-line-soft flex justify-center">
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="p-2 rounded-[4px] border border-line-soft text-ink-3 hover:text-ink hover:border-ink transition-colors"
            title="Expand sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </aside>
  )
}
