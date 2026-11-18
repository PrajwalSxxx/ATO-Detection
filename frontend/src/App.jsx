import React, { Suspense, lazy } from 'react'
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { AppShell } from '@/components/layout/AppShell'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { ROUTES } from '@/constants/routes'
import { Loader2 } from 'lucide-react'

// Code-split Lazy Pages
const LoginPage = lazy(() => import('@/pages/LoginPage'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const LoginActivityPage = lazy(() => import('@/pages/LoginActivityPage'))
const ThreatDetectionPage = lazy(() => import('@/pages/ThreatDetectionPage'))
const RiskAnalyticsPage = lazy(() => import('@/pages/RiskAnalyticsPage'))
const UsersPage = lazy(() => import('@/pages/UsersPage'))
const AlertsPage = lazy(() => import('@/pages/AlertsPage'))
const DevicesPage = lazy(() => import('@/pages/DevicesPage'))
const AuditLogsPage = lazy(() => import('@/pages/AuditLogsPage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
const SimulatorPage = lazy(() => import('@/pages/SimulatorPage'))

// Page loading fallback spinner
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] w-full">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-brand animate-spin" />
        <span className="text-xs font-mono text-text-muted">Loading module...</span>
      </div>
    </div>
  )
}

// Protected Route Guard
function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-brand animate-spin" />
          <span className="text-xs font-mono text-text-muted">Validating session...</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />
  }

  return children
}

// Public Route Guard (prevents logged in users from seeing login)
function PublicRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand animate-spin" />
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to={ROUTES.DASHBOARD} replace />
  }

  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
          {/* Public Login Route */}
          <Route
            path={ROUTES.LOGIN}
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />

          {/* Authenticated Application Shell */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path={ROUTES.LOGIN_ACTIVITY} element={<LoginActivityPage />} />
            <Route path={ROUTES.THREAT_DETECTION} element={<ThreatDetectionPage />} />
            <Route path={ROUTES.RISK_ANALYTICS} element={<RiskAnalyticsPage />} />
            <Route path={ROUTES.USERS} element={<UsersPage />} />
            <Route path={ROUTES.ALERTS} element={<AlertsPage />} />
            <Route path={ROUTES.DEVICES} element={<DevicesPage />} />
            <Route path={ROUTES.AUDIT_LOGS} element={<AuditLogsPage />} />
            <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
            <Route path={ROUTES.SIMULATOR} element={<SimulatorPage />} />
          </Route>

          {/* Fallback Catch-all Route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
