import axios from 'axios'

// Axios instance
const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor — attach auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ato_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor — handle 401, normalize errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('ato_token')
      localStorage.removeItem('ato_user')
      // Redirect to login only if not already there
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
    }
    // Normalize error message
    const message =
      error.response?.data?.error?.message ||
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred'
    error.normalizedMessage = message
    return Promise.reject(error)
  }
)

// ─── Auth ──────────────────────────────────────────────────────────────────
export const login = (data) => api.post('/auth/login', data)
export const verifyOTP = (data) => {
  // Support both /auth/mfa/verify and fallback /auth/verify-otp
  const payload = {
    otp: data.otp,
    login_event_id: data.login_event_id,
    temp_token: data.temp_token,
    user_id: data.user_id,
    email: data.email,
  }
  return api.post('/auth/mfa/verify', payload).catch((err) => {
    if (err.response?.status === 404) {
      return api.post('/auth/verify-otp', payload)
    }
    throw err
  })
}
export const resendOTP = (data) => {
  const payload = {
    login_event_id: data.login_event_id,
    email: data.email,
    temp_token: data.temp_token,
  }
  return api.post('/auth/mfa/resend', payload).catch((err) => {
    if (err.response?.status === 404) {
      return api.post('/auth/resend-otp', payload)
    }
    throw err
  })
}
export const logout = () => api.post('/auth/logout')
export const getMe = () => api.get('/auth/me')

// ─── Dashboard ─────────────────────────────────────────────────────────────
export const getDashboardOverview = () => {
  // Try /dashboard/overview first, fallback to /dashboard/summary
  return api.get('/dashboard/overview').catch((err) => {
    if (err.response?.status === 404) {
      return api.get('/dashboard/summary')
    }
    throw err
  })
}
export const getDashboardActivity = (range = '24h') => {
  return api.get(`/dashboard/hourly-activity?range=${range}`).catch((err) => {
    if (err.response?.status === 404) {
      return api.get(`/dashboard/activity?range=${range}`)
    }
    throw err
  })
}
export const getRiskDistribution = () => api.get('/dashboard/risk-distribution')
export const getSystemHealth = () => {
  return api.get('/system/health').catch((err) => {
    if (err.response?.status === 404) {
      return api.get('/dashboard/health')
    }
    throw err
  })
}

// ─── Logins ────────────────────────────────────────────────────────────────
export const getLogins = (params) => api.get('/logins', { params })
export const getLoginDetail = (id) => api.get(`/logins/${id}`)
export const simulateLogin = (data) => api.post('/logins/simulate', data)

// ─── Risk ──────────────────────────────────────────────────────────────────
export const getRiskOverview = () => api.get('/risk/overview')
export const getRiskTrend = (range = '7d') =>
  api.get(`/risk/trend?range=${range}`)
export const getRiskTopAccounts = () => api.get('/risk/top-accounts')
export const getRiskHeatmap = () => api.get('/risk/heatmap')
export const getRiskFactors = () => api.get('/risk/factors')

// ─── Users ─────────────────────────────────────────────────────────────────
export const getUsers = (params) => api.get('/users', { params })
export const getUserDetail = (id) => api.get(`/users/${id}`)
export const createUser = (data) => api.post('/users', data)
export const updateUser = (id, data) => api.put(`/users/${id}`, data)
export const deactivateUser = (id) => api.post(`/users/${id}/deactivate`)
export const getUserLogins = (id, params) =>
  api.get(`/users/${id}/logins`, { params })
export const getUserDevices = (id) => api.get(`/users/${id}/devices`)

// ─── Alerts ────────────────────────────────────────────────────────────────
export const getAlerts = (params) => api.get('/alerts', { params })
export const getAlertDetail = (id) => api.get(`/alerts/${id}`)
export const updateAlertStatus = (id, data) =>
  api.patch(`/alerts/${id}/status`, data)
export const getUnresolvedAlertCount = () => api.get('/alerts/count/unresolved')

// ─── Devices ───────────────────────────────────────────────────────────────
export const getDevices = (params) => api.get('/devices', { params })
export const getDeviceDetail = (id) => api.get(`/devices/${id}`)

// ─── Settings ──────────────────────────────────────────────────────────────
export const getSettings = () => api.get('/settings')
export const updateSettings = (data) => api.put('/settings', data)

// ─── Audit Logs ────────────────────────────────────────────────────────────
export const getAuditLogs = (params) => api.get('/audit', { params })
export const getAuditLogDetail = (id) => api.get(`/audit/${id}`)
export const exportAuditLogs = (params) =>
  api.get('/audit/export', { params, responseType: 'blob' })

// ─── System / ML ───────────────────────────────────────────────────────────
export const getModelInfo = () => {
  return api.get('/system/ml/status').catch((err) => {
    if (err.response?.status === 404) {
      return api.get('/system/model')
    }
    throw err
  })
}
export const getSystemStatus = () => api.get('/system/health')
export const resetDemoData = () => api.post('/system/reset-demo')

export default api
