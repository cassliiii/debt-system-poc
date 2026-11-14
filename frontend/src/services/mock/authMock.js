import { AuthError } from '../errors.js'
import { USERS } from './mockData.js'

const MAX_ATTEMPTS = 5
const LOCKED_MESSAGE =
  'Demasiados intentos. Intente de nuevo en 10 minutos o comuníquese con TI.'

const attempts = new Map()

const wait = (milliseconds) =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })

/**
 * Inicio de sesión simulado.
 * @param {{ usuario: string, password: string }} credentials
 * @returns {Promise<{ usuario: string, nombre: string, rol: string }>}
 */
export async function login({ usuario, password }) {
  await wait(600)

  const key = usuario ?? ''
  const failures = attempts.get(key) ?? 0

  if (failures >= MAX_ATTEMPTS) {
    throw new AuthError('LOCKED', LOCKED_MESSAGE)
  }

  const user = USERS.find(
    (item) => item.usuario === usuario && item.password === password,
  )

  if (!user) {
    const nextFailures = failures + 1
    attempts.set(key, nextFailures)

    if (nextFailures >= MAX_ATTEMPTS) {
      throw new AuthError('LOCKED', LOCKED_MESSAGE)
    }

    throw new AuthError('INVALID', 'Usuario o contraseña incorrectos')
  }

  attempts.delete(key)

  return {
    usuario: user.usuario,
    nombre: user.nombre,
    rol: user.rol,
  }
}
