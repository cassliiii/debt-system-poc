import { API_URL } from '../config/app.js'
import { ApiError } from './errors.js'

const GENERIC_MESSAGE = 'No se pudo procesar la solicitud.'
const CONNECTION_MESSAGE =
  'No se pudo conectar con el servidor. Verifique su conexión e intente nuevamente.'

/**
 * Lee el cuerpo de la respuesta sin suponer que siempre es JSON.
 * @param {Response} response
 * @returns {Promise<any>}
 */
async function parseBody(response) {
  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

/**
 * Realiza una solicitud HTTP a la API.
 * @param {string} path
 * @param {RequestInit} [options]
 * @returns {Promise<any>}
 */
export async function request(path, options = {}) {
  const baseUrl = API_URL.replace(/\/$/, '')
  let response

  try {
    response = await fetch(`${baseUrl}${path}`, options)
  } catch {
    throw new ApiError(0, CONNECTION_MESSAGE)
  }

  const body = await parseBody(response)

  if (!response.ok) {
    const message =
      body?.message ??
      body?.error ??
      (Array.isArray(body?.errors) ? body.errors[0] : undefined) ??
      GENERIC_MESSAGE

    throw new ApiError(response.status, message, {
      errors: body?.errors,
      details: body?.details,
    })
  }

  return body
}
