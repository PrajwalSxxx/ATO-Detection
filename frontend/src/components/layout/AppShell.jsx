import React, { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { ErrorBoundary } from '../ui/ErrorBoundary'

export function AppShell() {
  const location = useLocation()
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true'
  })

  // Listen to storage changes so AppShell margin matches Sidebar width
  useEffect(() => {
    const handleStorage = () => {
      setIsCollapsed(localStorage.getItem('sidebar_collapsed') === 'true')
    }
    window.addEventListener('storage', handleStorage)
    const interval = setInterval(handleStorage, 500)
    return () => {
      window.removeEventListener('storage', handleStorage)
      clearInterval(interval)
    }
  }, [])

  return (
    <div className="min-h-screen bg-paper text-ink flex selection:bg-ink selection:text-paper font-sans">
      {/* Fixed Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ml-0 ${
          isCollapsed ? 'md:ml-[72px]' : 'md:ml-[248px]'
        }`}
      >
        <TopBar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            >
              <ErrorBoundary>
                <Outlet />
              </ErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
