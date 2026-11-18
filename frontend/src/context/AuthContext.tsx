import { useEffect, useState, useCallback, type ReactNode } from 'react'
import { api, clearSession, getToken, saveSession } from '../lib/api'
import type { User } from '../types'
import { AuthContext } from './AuthContextValue'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(() => !!getToken())

  const refresh = useCallback(async () => {
    const token = getToken()
    if (!token) {
      return
    }

    try {
      const { data } = await api.get('/auth/me')
      if (data?.user) {
        setUser(data.user)
      } else {
        clearSession()
        setUser(null)
      }
    } catch {
      // If token is invalid or expired, clear it safely without throwing
      clearSession()
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Check initial auth state once on mount
    const timer = setTimeout(() => void refresh(), 0)

    // Listen for session expiration events dispatched by API interceptors
    const handleSessionExpired = () => {
      setUser(null)
    }
    window.addEventListener('getplaced:session_expired', handleSessionExpired)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('getplaced:session_expired', handleSessionExpired)
    }
  }, [refresh])

  const login = async (email: string, password: string): Promise<User> => {
    const { data } = await api.post('/auth/login', { email, password })
    if (data?.token) {
      saveSession(data.token)
    }
    const loggedInUser = data.user as User
    setUser(loggedInUser)
    return loggedInUser
  }

  const signup = async (payload: Record<string, unknown>): Promise<User> => {
    const { data } = await api.post('/auth/register', payload)
    if (data?.token) {
      saveSession(data.token)
    }
    const newUser = data.user as User
    setUser(newUser)
    return newUser
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // Ignore network errors during logout
    } finally {
      clearSession()
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
