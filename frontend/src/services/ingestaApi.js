import { INGESTA_BASE_URL } from '../config/app.js'
import { CONNECTION_MESSAGE, request } from './apiClient.js'
import { ApiError } from './errors.js'

const STATUS_NOT_FOUND_MESSAGE =
  'La carga ya no está disponible. Los resultados se conservan unos 30 minutos.'
const QUARANTINE_NOT_FINISHED_MESSAGE = 'La carga aún no terminó.'
const START_GENERIC_MESSAGE = 'No se pudo iniciar la carga.'

const START_STATUS_MESSAGES = {
  413: 'El archivo supera el tamaño máximo permitido por el servidor.',
  429: 'Hay demasiadas cargas en curso. Espere a que termine una e intente nuevamente.',
  500: 'No se pudo guardar el archivo en el servidor. Intente nuevamente.',
}

/**
 * @typedef {Object} IngestaSnapshot
 * @property {string} jobId
 * @property {string} estado
 * @property {number} totalRegistros
 * @property {number} insertados
 * @property {number} rechazados
 * @property {number} procesados
 * @property {number} porcentaje
 */

/**
 * @param {unknown} value
 * @returns {number}
 */
function toNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

/**
 * @param {number} value
 * @returns {number}
 */
function clampPercentage(value) {
  return Math.min(100, Math.max(0, value))
}

/**
 * @param {unknown} body
 * @returns {string}
 */
function getBodyMessage(body) {
  if (!body || typeof body !== 'object') return ''

  const candidate =
    body.message ??
    body.error ??
    (Array.isArray(body.errors) ? body.errors[0] : undefined)

  return typeof candidate === 'string' ? candidate : ''
}

/**
 * @param {string} text
 * @returns {Record<string, unknown> | null}
 */
function parseJson(text) {
  if (!text) return null

  try {
    const body = JSON.parse(text)
    return body && typeof body === 'object' ? body : null
  } catch {
    return null
  }
}

/**
 * @param {string | null} location
 * @returns {string}
 */
function getJobIdFromLocation(location) {
  if (!location) return ''

  const path = location.split(/[?#]/)[0].replace(/\/+$/, '')
  const segments = path.split('/')
  return segments[segments.length - 1] ?? ''
}

/**
 * @returns {Error}
 */
function createAbortError() {
  const error = new Error('La carga fue cancelada.')
  error.name = 'AbortError'
  return error
}

/**
 * @param {string} path
 * @returns {string}
 */
function getIngestaUrl(path) {
  return `${INGESTA_BASE_URL.replace(/\/$/, '')}${path}`
}

/**
 * @param {number} status
 * @param {Record<string, unknown> | null} body
 * @returns {ApiError}
 */
function buildStartError(status, body) {
  if (status === 0) {
    return new ApiError(0, CONNECTION_MESSAGE)
  }

  let message = START_STATUS_MESSAGES[status]

  if (status === 400) {
    message =
      getBodyMessage(body) ||
      'El servidor rechazó el archivo o el área indicada.'
  } else if (!message) {
    message = getBodyMessage(body) || START_GENERIC_MESSAGE
  }

  return new ApiError(status, message, {
    errors: body?.errors,
    details: body?.details,
  })
}

/**
 * Convierte la respuesta del backend al modelo de UI.
 * @param {Record<string, unknown> | null | undefined} raw
 * @returns {IngestaSnapshot}
 */
export function adaptSnapshot(raw) {
  const totalRegistros = toNumber(raw?.filasTotales)
  const insertados = toNumber(raw?.insertadas)
  const rechazados = toNumber(raw?.rechazadas)
  const procesados = insertados + rechazados

  const rawPercentage = raw?.porcentaje
  const hasNumericPercentage =
    (typeof rawPercentage === 'number' &&
      Number.isFinite(rawPercentage)) ||
    (typeof rawPercentage === 'string' &&
      rawPercentage.trim() !== '' &&
      Number.isFinite(Number(rawPercentage)))

  const calculatedPercentage =
    totalRegistros > 0 ? (procesados / totalRegistros) * 100 : 0

  const porcentaje = clampPercentage(
    hasNumericPercentage ? Number(rawPercentage) : calculatedPercentage,
  )

  return {
    jobId: raw?.jobId !== null && raw?.jobId !== undefined
      ? String(raw.jobId)
      : '',
    estado:
      raw?.estado !== null && raw?.estado !== undefined
        ? String(raw.estado)
        : '',
    totalRegistros,
    insertados,
    rechazados,
    procesados,
    porcentaje,
  }
}

/**
 * Inicia una carga CSV y reporta el avance de subida.
 * @param {{
 *   area: string,
 *   file: File,
 *   onUploadProgress?: (progress: {
 *     loaded: number,
 *     total: number,
 *     percent: number
 *   }) => void,
 *   signal?: AbortSignal
 * }} params
 * @returns {Promise<{ jobId: string, snapshot: IngestaSnapshot }>}
 */
export function startIngesta({
  area,
  file,
  onUploadProgress,
  signal,
}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(createAbortError())
      return
    }

    const xhr = new XMLHttpRequest()
    let settled = false

    const cleanup = () => {
      signal?.removeEventListener('abort', handleAbort)
    }

    const settle = (callback, value) => {
      if (settled) return
      settled = true
      cleanup()
      callback(value)
    }

    const handleAbort = () => {
      xhr.abort()
      settle(reject, createAbortError())
    }

    xhr.upload.onprogress = (event) => {
      if (!onUploadProgress) return

      const loaded = event.loaded ?? 0
      const total = event.total ?? 0
      const percent =
        total > 0
          ? Math.min(100, Math.max(0, (loaded / total) * 100))
          : 0

      onUploadProgress({ loaded, total, percent })
    }

    xhr.onload = () => {
      const body = parseJson(xhr.responseText)

      if (xhr.status >= 200 && xhr.status < 300) {
        const snapshot = adaptSnapshot(body)
        const jobId =
          snapshot.jobId ||
          getJobIdFromLocation(xhr.getResponseHeader('Location'))

        settle(resolve, { jobId, snapshot: { ...snapshot, jobId } })
        return
      }

      settle(reject, buildStartError(xhr.status, body))
    }

    xhr.onerror = () => {
      settle(reject, new ApiError(0, CONNECTION_MESSAGE))
    }

    xhr.onabort = () => {
      settle(reject, createAbortError())
    }

    signal?.addEventListener('abort', handleAbort, { once: true })

    xhr.open('POST', getIngestaUrl('/ingestas'))

    const formData = new FormData()
    formData.append('archivo', file)
    formData.append('area', area)
    xhr.send(formData)
  })
}

/**
 * Consulta el estado actual de una carga.
 * @param {string} jobId
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<IngestaSnapshot>}
 */
export async function getIngestaStatus(jobId, { signal } = {}) {
  try {
    const body = await request(
      `/ingestas/${encodeURIComponent(jobId)}`,
      { baseUrl: INGESTA_BASE_URL, signal },
    )

    return adaptSnapshot(body)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      throw new ApiError(404, STATUS_NOT_FOUND_MESSAGE, {
        errors: error.errors,
        details: error.details,
      })
    }

    throw error
  }
}

/**
 * Descarga el CSV de filas rechazadas de una carga terminada.
 * @param {string} jobId
 * @returns {Promise<{ blob: Blob, size: number }>}
 */
export async function fetchCuarentena(jobId) {
  let response

  try {
    response = await fetch(
      getIngestaUrl(`/ingestas/${encodeURIComponent(jobId)}/cuarentena`),
    )
  } catch {
    throw new ApiError(0, CONNECTION_MESSAGE)
  }

  if (!response.ok) {
    const body = await response
      .text()
      .then(parseJson)
      .catch(() => null)

    let message = getBodyMessage(body) || 'No se pudo descargar la cuarentena.'

    if (response.status === 404) {
      message = STATUS_NOT_FOUND_MESSAGE
    } else if (response.status === 409) {
      message = QUARANTINE_NOT_FINISHED_MESSAGE
    }

    throw new ApiError(response.status, message, {
      errors: body?.errors,
      details: body?.details,
    })
  }

  const blob = await response.blob()
  return { blob, size: blob.size }
}
