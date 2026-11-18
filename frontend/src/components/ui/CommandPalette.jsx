import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
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
  Moon,
  Sun,
  Download,
  RotateCcw,
  User,
  ArrowRight,
  X,
  Command,
} from 'lucide-react'
import { ROUTES } from '@/constants/routes'
import { useTheme } from '@/context/ThemeContext'
import { notify } from '@/components/ui/Toast'

export function CommandPalette({ isOpen, onClose }) {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const [query, setQuery] = useState('')
  const [selectedTab, setSelectedTab] = useState('all')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef(null)

  // Reset query and focus when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // All searchable items
  const allItems = [
    // Pages / Navigation
    {
      id: 'nav-dashboard',
      category: 'pages',
      title: 'Security Operations Dashboard',
      subtitle: 'Real-time telemetry, KPI metrics & velocity charts',
      icon: LayoutDashboard,
      shortcut: 'G D',
      action: () => navigate(ROUTES.DASHBOARD),
    },
    {
      id: 'nav-logins',
      category: 'pages',
      title: 'Authentication Ledger',
      subtitle: 'Live stream of login events and risk scores',
      icon: Activity,
      shortcut: 'G L',
      action: () => navigate(ROUTES.LOGIN_ACTIVITY),
    },
    {
      id: 'nav-threats',
      category: 'pages',
      title: 'Threat Detection Engine',
      subtitle: 'Isolation Forest inference architecture & anomalies',
      icon: ShieldAlert,
      shortcut: 'G T',
      action: () => navigate(ROUTES.THREAT_DETECTION),
    },
    {
      id: 'nav-analytics',
      category: 'pages',
      title: 'Risk & Anomaly Analytics',
      subtitle: 'Longitudinal shifts, temporal heatmap & factor breakdown',
      icon: BarChart3,
      shortcut: 'G R',
      action: () => navigate(ROUTES.RISK_ANALYTICS),
    },
    {
      id: 'nav-users',
      category: 'pages',
      title: 'User Identity Directory',
      subtitle: 'Directory of employee & service account identities',
      icon: Users,
      shortcut: 'G U',
      action: () => navigate(ROUTES.USERS),
    },
    {
      id: 'nav-alerts',
      category: 'pages',
      title: 'Security Alerts & Incidents',
      subtitle: 'SOC triage queue and incident investigations',
      icon: Bell,
      shortcut: 'G A',
      action: () => navigate(ROUTES.ALERTS),
    },
    {
      id: 'nav-devices',
      category: 'pages',
      title: 'Enrolled Hardware & Devices',
      subtitle: 'Browser fingerprints, cookies & trust state',
      icon: Laptop,
      shortcut: 'G H',
      action: () => navigate(ROUTES.DEVICES),
    },
    {
      id: 'nav-audit',
      category: 'pages',
      title: 'Immutable Audit Ledger',
      subtitle: 'Tamper-evident administrative action log',
      icon: FileText,
      shortcut: 'G X',
      action: () => navigate(ROUTES.AUDIT_LOGS),
    },
    {
      id: 'nav-settings',
      category: 'pages',
      title: 'Security Engine Settings',
      subtitle: 'Tune risk thresholds, MFA parameters & diagnostics',
      icon: Settings,
      shortcut: 'G S',
      action: () => navigate(ROUTES.SETTINGS),
    },
    {
      id: 'nav-simulator',
      category: 'pages',
      title: 'Attack Vector Simulator',
      subtitle: 'Trigger synthetic attacks against live ML pipeline',
      icon: Cpu,
      shortcut: 'G M',
      action: () => navigate(ROUTES.SIMULATOR),
    },

    // Quick Actions
    {
      id: 'act-toggle-theme',
      category: 'actions',
      title: `Toggle Theme (Switch to ${theme === 'dark' ? 'Light Paper' : 'Dark Obsidian'})`,
      subtitle: 'Seamlessly switch visual presentation theme',
      icon: theme === 'dark' ? Sun : Moon,
      shortcut: '⌘T',
      action: () => {
        toggleTheme()
        notify.info(`Switched to ${theme === 'dark' ? 'Light Paper' : 'Dark Obsidian'} theme`)
      },
    },
    {
      id: 'act-simulator-credential-spray',
      category: 'actions',
      title: 'Simulate: Credential Stuffing Spray',
      subtitle: 'Execute high-velocity brute-force scenario',
      icon: ShieldAlert,
      action: () => {
        navigate(ROUTES.SIMULATOR)
        notify.info('Navigated to simulator. Ready to run Credential Stuffing scenario.')
      },
    },
    {
      id: 'act-simulator-impossible-travel',
      category: 'actions',
      title: 'Simulate: Impossible Geovelocity Travel',
      subtitle: 'Simulate cross-continental jump (SF to Tokyo in 12m)',
      icon: Cpu,
      action: () => {
        navigate(ROUTES.SIMULATOR)
        notify.info('Navigated to simulator. Ready to run Impossible Travel scenario.')
      },
    },

    // Identities & Users
    {
      id: 'user-admin',
      category: 'users',
      title: 'admin@ato-platform.com',
      subtitle: 'System Administrator • Full Permissions',
      icon: User,
      action: () => navigate(ROUTES.USERS),
    },
    {
      id: 'user-analyst',
      category: 'users',
      title: 'analyst@ato-platform.com',
      subtitle: 'Security Analyst • SOC Triage',
      icon: User,
      action: () => navigate(ROUTES.USERS),
    },
    {
      id: 'user-alice',
      category: 'users',
      title: 'user1@test.com (Alice Johnson)',
      subtitle: 'Standard User • Adaptive Step-up MFA trigger',
      icon: User,
      action: () => navigate(ROUTES.USERS),
    },
    {
      id: 'user-bob',
      category: 'users',
      title: 'user2@test.com (Bob Smith)',
      subtitle: 'Standard User • Baseline Low Risk',
      icon: User,
      action: () => navigate(ROUTES.USERS),
    },

    // Recent Incidents
    {
      id: 'alert-impossible-travel',
      category: 'alerts',
      title: 'Impossible Travel Anomaly [CRITICAL]',
      subtitle: 'Tokyo to SF in 12 mins • Score: 85',
      icon: ShieldAlert,
      action: () => navigate(ROUTES.ALERTS),
    },
    {
      id: 'alert-tor-exit',
      category: 'alerts',
      title: 'Tor Exit Node Proxy Detected [HIGH]',
      subtitle: 'Frankfurt anonymizer IP flagged • Score: 78',
      icon: ShieldAlert,
      action: () => navigate(ROUTES.ALERTS),
    },
  ]

  // Filter items by category tab and search query
  const filteredItems = allItems.filter((item) => {
    const matchesTab = selectedTab === 'all' || item.category === selectedTab
    const q = query.toLowerCase().trim()
    const matchesQuery =
      !q ||
      item.title.toLowerCase().includes(q) ||
      item.subtitle.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    return matchesTab && matchesQuery
  })

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].action()
          onClose()
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, filteredItems, selectedIndex, onClose])

  if (!isOpen) return null

  const tabs = [
    { id: 'all', label: 'All Results' },
    { id: 'pages', label: 'Navigation' },
    { id: 'actions', label: 'Quick Actions' },
    { id: 'users', label: 'Identities' },
    { id: 'alerts', label: 'Incidents' },
  ]

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 bg-[#000000]/50 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Command Palette Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -12 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-2xl bg-paper-raised border-[1.5px] border-ink rounded-[12px] shadow-hard overflow-hidden z-10 flex flex-col max-h-[80vh]"
        >
          {/* Title bar motif with 3 tiny dots */}
          <div className="h-9 px-3.5 bg-paper-sunken border-b border-line-soft flex items-center justify-between select-none">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full border border-ink/70" />
              <div className="w-1.5 h-1.5 rounded-full border border-ink/70" />
              <div className="w-1.5 h-1.5 rounded-full border border-ink/70" />
              <span className="ml-2 font-mono text-[10px] uppercase font-semibold text-ink tracking-wider">
                COMMAND_PALETTE // GLOBAL_SEARCH
              </span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="font-mono text-[10px] bg-paper px-1.5 py-0.5 rounded border border-line-soft text-ink-3">
                ESC to close
              </kbd>
              <button
                type="button"
                onClick={onClose}
                className="text-ink-3 hover:text-ink transition-colors p-0.5"
                aria-label="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Search Input Bar */}
          <div className="p-3.5 border-b border-line-soft flex items-center gap-3 bg-paper-raised">
            <Search className="w-4 h-4 text-ink-3 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setSelectedIndex(0)
              }}
              placeholder="Type a command, page, user, or incident..."
              className="w-full bg-transparent text-sm text-ink placeholder:text-ink-3 focus:outline-none font-sans"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-ink-3 hover:text-ink p-1 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Tabs (Well-Organized Filter Tabs) */}
          <div className="px-3.5 py-2 bg-paper-sunken/60 border-b border-line-soft flex items-center gap-1.5 overflow-x-auto select-none">
            {tabs.map((tab) => {
              const isActive = selectedTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setSelectedTab(tab.id)
                    setSelectedIndex(0)
                  }}
                  className={`px-2.5 py-1 text-xs font-mono rounded-[5px] transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-ink text-paper font-semibold shadow-hard-sm'
                      : 'text-ink-2 hover:text-ink hover:bg-paper-sunken border border-transparent'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Results List */}
          <div className="flex-1 overflow-y-auto p-2 divide-y divide-line-soft/40 max-h-[380px]">
            {filteredItems.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-xs font-mono text-ink-3">
                  Zero results matching "{query}"
                </p>
                <p className="text-[11px] text-ink-3 mt-1">
                  Try searching for "Dashboard", "Alice", "Simulation", or "Theme"
                </p>
              </div>
            ) : (
              filteredItems.map((item, idx) => {
                const isSelected = selectedIndex === idx
                const Icon = item.icon

                return (
                  <motion.div
                    key={item.id}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    onClick={() => {
                      item.action()
                      onClose()
                    }}
                    className={`p-2.5 rounded-[8px] cursor-pointer flex items-center justify-between transition-all select-none ${
                      isSelected
                        ? 'bg-paper-sunken border border-ink shadow-hard-sm -translate-x-0.5'
                        : 'border border-transparent hover:bg-paper-hover'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate mr-3">
                      <div
                        className={`w-7 h-7 rounded-[6px] border flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-ink text-paper border-ink'
                            : 'bg-paper-raised text-ink-2 border-line-soft'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-medium text-ink truncate">
                          {item.title}
                        </div>
                        <div className="text-[10px] text-ink-3 truncate font-mono">
                          {item.subtitle}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.shortcut && (
                        <kbd className="font-mono text-[10px] bg-paper-raised border border-line-soft px-1.5 py-0.5 rounded text-ink-3">
                          {item.shortcut}
                        </kbd>
                      )}
                      <span className="font-mono text-[9px] uppercase tracking-wider text-ink-3 px-1.5 py-0.5 rounded bg-paper-sunken border border-line-soft">
                        {item.category}
                      </span>
                    </div>
                  </motion.div>
                )
              })
            )}
          </div>

          {/* Footer with Keyboard Hints */}
          <div className="px-4 py-2 bg-paper-sunken border-t border-line-soft flex items-center justify-between text-[11px] text-ink-3 font-mono">
            <div className="flex items-center gap-4">
              <span>
                <kbd className="bg-paper-raised border border-line-soft px-1 py-0.2 rounded text-ink">↑↓</kbd> to navigate
              </span>
              <span>
                <kbd className="bg-paper-raised border border-line-soft px-1 py-0.2 rounded text-ink">↵</kbd> to select
              </span>
            </div>
            <span>
              {filteredItems.length} command{filteredItems.length === 1 ? '' : 's'} available
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
