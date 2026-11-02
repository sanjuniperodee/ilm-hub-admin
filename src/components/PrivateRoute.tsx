import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ReactNode } from 'react'
import { LoadingState } from './ui'

export const PrivateRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return <LoadingState variant="spinner" label="Проверяем вход…" minHeight="100vh" />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export const RoleRoute = ({
  children,
  requiredRoles,
}: {
  children: ReactNode
  requiredRoles: string[]
}) => {
  const { isAuthenticated, userRole, loading } = useAuth()

  if (loading) {
    return <LoadingState variant="spinner" label="Проверяем вход…" minHeight="100vh" />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!userRole || !requiredRoles.includes(userRole)) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
