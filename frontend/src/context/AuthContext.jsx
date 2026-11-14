import { useCallback, useMemo, useState } from 'react'
import {
  getSession,
  login as loginService,
  logout as logoutService,
} from '../services/authService.js'
import { AuthContext } from './authContext.js'

/**
 * Proveedor de autenticación de la aplicación.
 * @param {object} props
 * @param {import('react').ReactNode} props.children
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getSession())
  const [loading] = useState(false)

  const login = useCallback(async (credentials) => {
    const session = await loginService(credentials)
    setUser(session)
    return session
  }, [])

  const logout = useCallback(() => {
    logoutService()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, logout }),
    [user, loading, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
