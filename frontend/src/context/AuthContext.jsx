import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { login as apiLogin, logout as apiLogout, getMe } from '@/services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('ato_token'))
  const [isLoading, setIsLoading] = useState(true)

  const isAuthenticated = !!user && !!token

  // On mount: validate existing token by calling /auth/me
  useEffect(() => {
    const validateSession = async () => {
      const storedToken = localStorage.getItem('ato_token')
      if (!storedToken) {
        setIsLoading(false)
        return
      }
      try {
        const { data } = await getMe()
        setUser(data)
      } catch {
        // Token invalid — clear it
        localStorage.removeItem('ato_token')
        localStorage.removeItem('ato_user')
        setToken(null)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }
    validateSession()
  }, [])

  const login = useCallback(async (credentials) => {
    const { data } = await apiLogin(credentials)
    // If login returns a token directly (ALLOW)
    if (data.access_token) {
      localStorage.setItem('ato_token', data.access_token)
      setToken(data.access_token)
      const u = data.user || { id: data.user_id, email: data.email, role: data.role }
      setUser(u)
      localStorage.setItem('ato_user', JSON.stringify(u))
    }
    return data
  }, [])

  const setTokenAndUser = useCallback((accessToken, userData) => {
    localStorage.setItem('ato_token', accessToken)
    setToken(accessToken)
    const u = userData || { email: 'authenticated-user' }
    setUser(u)
    localStorage.setItem('ato_user', JSON.stringify(u))
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiLogout()
    } catch {
      // ignore
    } finally {
      localStorage.removeItem('ato_token')
      localStorage.removeItem('ato_user')
      setToken(null)
      setUser(null)
    }
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await getMe()
      setUser(data)
      return data
    } catch {
      return null
    }
  }, [])

  const value = {
    user,
    token,
    isLoading,
    isAuthenticated,
    login,
    logout,
    refreshUser,
    setTokenAndUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export default AuthContext
