import { SESSION_MINUTES } from '../config/app.js'
import { login as loginMock } from './mock/authMock.js'

const SESSION_KEY = 'sird.session'

function getStorage() {
  if (typeof sessionStorage === 'undefined') return null
  return sessionStorage
}

/**
 * Inicia sesión y guarda la sesión en sessionStorage.
 * @param {{ usuario: string, password: string }} credentials
 * @returns {Promise<{ usuario: string, nombre: string, rol: string, area: string | null, expiraEn: number }>}
 */
export async function login({ usuario, password }) {
  const user = await loginMock({ usuario, password })

  const session = {
    usuario: user.usuario,
    nombre: user.nombre,
    rol: user.rol,
    area: user.area ?? null,
    expiraEn: Date.now() + SESSION_MINUTES * 60 * 1000,
  }

  const storage = getStorage()
  if (storage) {
    storage.setItem(SESSION_KEY, JSON.stringify(session))
  }

  return session
}

export function logout() {
  const storage = getStorage()
  if (storage) {
    storage.removeItem(SESSION_KEY)
  }
}

/**
 * Devuelve la sesión vigente o null si no existe o expiró.
 * @returns {{ usuario: string, nombre: string, rol: string, area: string | null, expiraEn: number } | null}
 */
export function getSession() {
  const storage = getStorage()
  if (!storage) return null

  const raw = storage.getItem(SESSION_KEY)
  if (!raw) return null

  try {
    const session = JSON.parse(raw)
    if (
      !session ||
      typeof session.expiraEn !== 'number' ||
      session.expiraEn <= Date.now()
    ) {
      storage.removeItem(SESSION_KEY)
      return null
    }
    return { ...session, area: session.area ?? null }
  } catch {
    storage.removeItem(SESSION_KEY)
    return null
  }
}
