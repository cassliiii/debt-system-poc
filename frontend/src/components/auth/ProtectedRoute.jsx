import { Navigate } from 'react-router-dom'
import { ROLE_HOME } from '../../config/navigation.js'
import { useAuth } from '../../hooks/useAuth.js'

/**
 * Restringe el acceso a una ruta según el rol del usuario.
 * @param {object} props
 * @param {string[]} [props.allowedRoles]
 * @param {import('react').ReactNode} props.children
 */
export function ProtectedRoute({ allowedRoles = [], children }) {
  const { user, loading } = useAuth()

  if (loading) return null

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.rol)) {
    return <Navigate to={ROLE_HOME[user.rol] ?? '/login'} replace />
  }

  return children
}
