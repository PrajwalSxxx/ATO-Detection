import React, { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Bell,
  LogOut,
  ShieldCheck,
  ChevronDown,
  Search,
  ExternalLink,
  Menu,
  X,
  LayoutDashboard,
  Activity,
  ShieldAlert,
  BarChart3,
  Users,
  Laptop,
  FileText,
  Settings,
  Cpu,
  Moon,
  Sun,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { Badge } from '../ui/Badge'
import { CommandPalette } from '../ui/CommandPalette'
import { useQuery } from '@tanstack/react-query'
import { getAlerts, getSystemHealth } from '@/services/api'
import { formatRelativeTime } from '@/utils/formatters'
import { ROUTES } from '@/constants/routes'

export function TopBar() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme, isDark } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [alertsOpen, setAlertsOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const alertsRef = useRef(null)
  const profileRef = useRef(null)

  // Global keyboard shortcuts for Command Palette (⌘K or /)
  useEffect(() => {
    const handleKeyDown = (e) => {
      const target = e.target
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCommandOpen((prev) => !prev)
      } else if (e.key === '/' && !isInput) {
        e.preventDefault()
        setCommandOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (alertsRef.current && !alertsRef.current.contains(e.target)) {
        setAlertsOpen(false)
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  // System Health query
  const { data: healthData } = useQuery({
    queryKey: ['system-health'],
    queryFn: async () => {
      try {
        const { data } = await getSystemHealth()
        return data
      } catch {
        return { status: 'healthy', database: 'connected', model_loaded: true }
      }
    },
    refetchInterval: 30000,
  })

  // Recent unresolved alerts query
  const { data: alertsData } = useQuery({
    queryKey: ['recent-unresolved-alerts'],
    queryFn: async () => {
      try {
        const { data } = await getAlerts({ status: 'open', limit: 5 })
        return data?.items || []
      } catch {
        return []
      }
    },
    refetchInterval: 20000,
  })

  const alerts = alertsData || []
  const isHealthy = healthData?.status === 'healthy' || healthData?.database === 'connected'

  const handleLogout = async () => {
    await logout()
    navigate(ROUTES.LOGIN)
  }

  const mobileLinks = [
    { label: 'Dashboard', icon: LayoutDashboard, path: ROUTES.DASHBOARD },
    { label: 'Login Activity', icon: Activity, path: ROUTES.LOGIN_ACTIVITY },
    { label: 'Threat Detection', icon: ShieldAlert, path: ROUTES.THREAT_DETECTION },
    { label: 'Risk Analytics', icon: BarChart3, path: ROUTES.RISK_ANALYTICS },
    { label: 'Users', icon: Users, path: ROUTES.USERS },
    { label: 'Alerts', icon: Bell, path: ROUTES.ALERTS, badge: alerts.length || undefined },
    { label: 'Devices', icon: Laptop, path: ROUTES.DEVICES },
    { label: 'Audit Logs', icon: FileText, path: ROUTES.AUDIT_LOGS },
    { label: 'Settings', icon: Settings, path: ROUTES.SETTINGS },
    { label: 'Threat Simulator', icon: Cpu, path: ROUTES.SIMULATOR },
  ]

  return (
    <header className="sticky top-0 z-20 h-16 bg-paper/90 backdrop-blur-sm border-b border-line-soft px-4 sm:px-6 flex items-center justify-between transition-colors">
      {/* Left side: Hamburger button on mobile + Search command button */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="md:hidden p-2 rounded-[6px] text-ink-2 hover:text-ink hover:bg-paper-sunken border border-line-soft transition-colors"
          aria-label="Open mobile navigation"
        >
          <Menu className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => setCommandOpen(true)}
          className="md:hidden p-2 rounded-[6px] text-ink-2 hover:text-ink hover:bg-paper-sunken border border-line-soft transition-colors"
          aria-label="Open global search"
          title="Search (⌘K)"
        >
          <Search className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => setCommandOpen(true)}
          className="hidden md:flex items-center gap-2.5 px-3 py-1.5 text-xs text-ink-3 bg-paper-sunken border border-line-soft rounded-[6px] hover:border-ink/60 hover:text-ink transition-all cursor-pointer group shadow-2xs select-none"
          title="Global search (⌘K or /)"
        >
          <Search className="w-3.5 h-3.5 text-ink-3 group-hover:text-ink transition-colors" />
          <span className="font-sans">Search users, IPs, sessions, commands...</span>
          <kbd className="ml-3 font-mono text-[10px] bg-paper-raised px-1.5 py-0.5 border border-line-soft rounded text-ink-2 group-hover:border-ink/40 transition-colors shadow-2xs">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-2.5 sm:gap-3 md:gap-4">
        {/* System Health Pill */}
        <div className="hidden sm:inline-flex items-center gap-2 px-2.5 py-1 rounded-[6px] bg-paper-sunken border border-line-soft text-xs">
          <span
            className={`w-2 h-2 rounded-full ${
              isHealthy ? 'bg-success' : 'bg-danger'
            }`}
          />
          <span className="font-mono text-[11px] text-ink-2">
            {isHealthy ? 'SYS_ONLINE' : 'SYS_DEGRADED'}
          </span>
        </div>

        {/* Theme Toggle Button (Light Paper / Dark Obsidian) */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.9, rotate: 20 }}
          whileHover={{ scale: 1.05 }}
          onClick={toggleTheme}
          className="p-2 rounded-[6px] text-ink-2 hover:text-ink hover:bg-paper-sunken border border-line-soft transition-colors duration-200 cursor-pointer shadow-2xs"
          aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
          title={`Switch to ${isDark ? 'Light Paper' : 'Dark Obsidian'} theme`}
        >
          {isDark ? (
            <Sun className="w-4 h-4 text-warning" />
          ) : (
            <Moon className="w-4 h-4 text-ink-2" />
          )}
        </motion.button>

        {/* Notifications / Alerts Bell */}
        <div className="relative" ref={alertsRef}>
          <button
            type="button"
            onClick={() => setAlertsOpen(!alertsOpen)}
            className="relative p-2 rounded-[6px] text-ink-2 hover:text-ink hover:bg-paper-sunken border border-line-soft hover:border-ink/40 transition-colors shadow-2xs"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4" />
            {alerts.length > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-ink text-paper text-[10px] font-mono font-bold flex items-center justify-center border border-paper shadow-xs">
                {alerts.length}
              </span>
            )}
          </button>

          {/* Alerts Dropdown (Window Frame style) */}
          {alertsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-paper-raised border border-ink rounded-[10px] shadow-hard py-0 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3.5 py-2.5 bg-paper-sunken border-b border-line-soft flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full border border-ink/70" />
                  <div className="w-1.5 h-1.5 rounded-full border border-ink/70" />
                  <div className="w-1.5 h-1.5 rounded-full border border-ink/70" />
                  <span className="ml-2 font-mono text-[11px] font-semibold text-ink uppercase tracking-wider">
                    Unresolved Alerts ({alerts.length})
                  </span>
                </div>
                <Link
                  to={ROUTES.ALERTS}
                  onClick={() => setAlertsOpen(false)}
                  className="text-[11px] text-ink hover:underline font-mono inline-flex items-center gap-1"
                >
                  View all <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-line-soft">
                {alerts.length === 0 ? (
                  <div className="p-6 text-center text-xs text-ink-3 font-mono">
                    Zero open alerts right now
                  </div>
                ) : (
                  alerts.map((alert) => (
                    <Link
                      key={alert.id}
                      to={ROUTES.ALERTS}
                      onClick={() => setAlertsOpen(false)}
                      className="p-3 block hover:bg-paper-hover transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="text-xs font-medium text-ink truncate">
                          {alert.title || alert.type || 'High Risk Anomaly'}
                        </span>
                        <span className="text-[10px] text-ink-3 font-mono shrink-0">
                          {formatRelativeTime(alert.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-ink-2 line-clamp-1">
                        {alert.description || alert.details || 'Suspicious login pattern detected.'}
                      </p>
                    </Link>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 p-1 rounded-[8px] hover:bg-paper-sunken border border-transparent hover:border-line-soft transition-colors"
          >
            <div className="w-7 h-7 rounded-[6px] bg-ink text-paper flex items-center justify-center font-mono font-semibold text-xs shadow-xs">
              {user?.full_name ? user.full_name[0] : user?.email ? user.email[0].toUpperCase() : 'U'}
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-medium text-ink leading-tight">
                {user?.full_name || user?.email || 'SecOps Admin'}
              </span>
              <span className="text-[10px] text-ink-3 font-mono uppercase">
                {user?.role || 'admin'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-ink-3 hidden md:block" />
          </button>

          {/* Profile Menu (Window Frame style) */}
          {profileOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-paper-raised border border-ink rounded-[10px] shadow-hard py-0 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3.5 py-3 bg-paper-sunken border-b border-line-soft">
                <p className="text-xs font-semibold text-ink truncate">
                  {user?.full_name || 'Administrator'}
                </p>
                <p className="text-[11px] text-ink-3 truncate font-mono">
                  {user?.email || 'admin@ato-platform.com'}
                </p>
                <div className="mt-2">
                  <Badge variant="outline" size="sm">
                    {user?.role || 'admin'}
                  </Badge>
                </div>
              </div>

              <div className="p-1">
                <Link
                  to={ROUTES.SETTINGS}
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-ink-2 hover:text-ink hover:bg-paper-hover rounded-[6px] transition-colors"
                >
                  <ShieldCheck className="w-4 h-4 text-ink-3" />
                  <span>Security &amp; Settings</span>
                </Link>

                <div className="my-1 border-t border-line-soft" />

                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-danger hover:bg-danger/10 rounded-[6px] transition-colors text-left font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Global Command Palette Modal */}
      <CommandPalette isOpen={commandOpen} onClose={() => setCommandOpen(false)} />

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-[#000000]/50 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[80vw] bg-paper h-full border-r border-ink shadow-hard flex flex-col z-10 animate-in slide-in-from-left duration-200">
            <div className="p-4 border-b border-line-soft flex items-center justify-between">
              <span className="font-serif text-lg font-normal text-ink">Navigation</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded text-ink-3 hover:text-ink"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {mobileLinks.map((link) => {
                const Icon = link.icon
                const isActive = location.pathname === link.path
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`flex items-center justify-between px-3 py-2 rounded-[6px] text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-ink text-paper'
                        : 'text-ink-2 hover:text-ink hover:bg-paper-sunken'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4" />
                      <span>{link.label}</span>
                    </div>
                    {link.badge && (
                      <span className="px-1.5 py-0.5 rounded-full bg-paper-sunken text-ink text-[10px] font-mono border border-line-soft">
                        {link.badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
