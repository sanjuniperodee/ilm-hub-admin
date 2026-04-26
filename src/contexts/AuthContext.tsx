import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { login as apiLogin } from '../api/adminApi'

interface AuthContextType {
  isAuthenticated: boolean
  userRole: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

function getRoleFromToken(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.role != null ? String(payload.role) : null
  } catch {
    return null
  }
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const token = localStorage.getItem('admin_token')
      if (!token) {
        if (!cancelled) setLoading(false)
        return
      }
      let role = getRoleFromToken(token)
      const refreshToken = localStorage.getItem('admin_refresh_token')
      if (!role && refreshToken) {
        try {
          const res = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          })
          if (res.ok) {
            const data = await res.json()
            if (data.accessToken) {
              localStorage.setItem('admin_token', data.accessToken)
              if (data.refreshToken) {
                localStorage.setItem('admin_refresh_token', data.refreshToken)
              }
              role = getRoleFromToken(data.accessToken)
            }
          }
        } catch {
          /* оставляем role как есть */
        }
      }
      if (!cancelled) {
        setIsAuthenticated(true)
        setUserRole(role)
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const onRefreshed = (e: Event) => {
      const ce = e as CustomEvent<{ accessToken?: string }>
      const t = ce.detail?.accessToken
      if (t) setUserRole(getRoleFromToken(t))
    }
    window.addEventListener('ilm-admin-token-refreshed', onRefreshed)
    return () => window.removeEventListener('ilm-admin-token-refreshed', onRefreshed)
  }, [])

  const login = async (email: string, password: string) => {
    const data = await apiLogin(email, password)
    setIsAuthenticated(true)
    if (data.accessToken) {
      const roleFromJwt = getRoleFromToken(data.accessToken)
      const roleFromUser = data.user?.role != null ? String(data.user.role) : null
      setUserRole(roleFromJwt ?? roleFromUser)
    }
  }

  const logout = () => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_refresh_token')
    setIsAuthenticated(false)
    setUserRole(null)
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, userRole, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
