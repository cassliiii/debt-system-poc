import { useContext } from 'react'
import { AuthContext } from '../context/authContext.js'

/**
 * Acceso al contexto de autenticación.
 * @returns {{ user: object | null, loading: boolean, login: Function, logout: Function }}
 */
export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }

  return context
}
