import { useContext } from 'react'
import { AuthContext } from '../context/authContext.js'

/**
 * Acceso al contexto de autenticación.
 * @returns {{ user: { usuario: string, nombre: string, rol: string, area: string | null, expiraEn: number } | null, loading: boolean, login: Function, logout: Function }}
 */
export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }

  return context
}
