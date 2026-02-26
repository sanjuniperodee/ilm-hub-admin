import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { login as apiLogin } from '../api/adminApi'

interface AuthContextType {
  isAuthenticated: boolean
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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    setIsAuthenticated(!!token)
    setLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    try {
      await apiLogin(email, password)
      setIsAuthenticated(true)
    } catch (error) {
      throw error
    }
  }

  const logout = () => {
    localStorage.removeItem('admin_token')
    setIsAuthenticated(false)
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
