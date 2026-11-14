import { INGESTA_ESTADOS, isFinalEstado } from '../../config/ingesta.js'
import { ApiError } from '../errors.js'
import { adaptSnapshot } from '../ingestaApi.js'

const QUEUE_DURATION_MS = 1500
const PROCESS_DURATION_MS = 12000
const FAILURE_PROGRESS = 0.4
const UPLOAD_STEPS = 10
const UPLOAD_MIN_MS = 2000
const UPLOAD_MAX_MS = 4000
const INITIAL_UPLOAD_DELAY_MS = 200
const REJECTION_RATE = 0.04
const MAX_QUARANTINE_ROWS = 20000

const NOT_FOUND_MESSAGE =
  'La carga ya no está disponible. Los resultados se conservan unos 30 minutos.'
const NOT_FINISHED_MESSAGE = 'La carga aún no terminó.'
const TOO_MANY_MESSAGE =
  'Hay demasiadas cargas en curso. Espere a que termine una e intente nuevamente.'

const VALIDATION_REASONS = [
  'El DNI debe tener 8 dígitos',
  'monto_base no es un número válido',
  'fecha_vencimiento no tiene el formato AAAA-MM-DD',
]

const DATABASE_REASONS = {
  AREA1:
    'ORA-12899: value too large for column "AREA1"."DEUDAS"."DIRECCION_INFRACCION" (actual: 230, maximum: 200)',
  AREA2: 'ERROR: value too long for type character varying(200)',
}

const JOBS = new Map()
let jobSequence = 0

/**
 * @typedef {Object} IngestaJob
 * @property {string} jobId
 * @property {string} area
 * @property {number} filasTotales
 * @property {'normal' | 'fallo' | 'expirado'} scenario
 * @property {boolean} hasRejections
 * @property {number} createdAt
 * @property {number} consultas
 */

/**
 * @returns {Error}
 */
function createAbortError() {
  const error = new Error('La carga fue cancelada.')
  error.name = 'AbortError'
  return error
}

/**
 * @param {number} milliseconds
 * @param {AbortSignal | undefined} signal
 * @returns {Promise<void>}
 */
function wait(milliseconds, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(createAbortError())
      return
    }

    const handleAbort = () => {
      clearTimeout(timer)
      reject(createAbortError())
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', handleAbort)
      resolve()
    }, milliseconds)

    signal?.addEventListener('abort', handleAbort, { once: true })
  })
}

/**
 * @returns {string}
 */
function createJobId() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let jobId = ''

  for (let index = 0; index < 8; index += 1) {
    jobId += characters[Math.floor(Math.random() * characters.length)]
  }

  if (!JOBS.has(jobId)) return jobId

  do {
    jobSequence += 1
    jobId = `J${jobSequence.toString(36).toUpperCase().padStart(7, '0')}`
  } while (JOBS.has(jobId))

  return jobId
}

/**
 * @param {string} filename
 * @returns {'normal' | 'fallo' | 'expirado'}
 */
function getScenario(filename) {
  if (filename.includes('fallo')) return 'fallo'
  if (filename.includes('expirado')) return 'expirado'
  return 'normal'
}

/**
 * @param {number} total
 * @param {number} progress
 * @returns {number}
 */
function getProcessedRows(total, progress) {
  if (total <= 0) return 0
  if (progress >= 1) return total

  const batchRows = Math.floor((progress * total) / 1000) * 1000
  return Math.min(total, batchRows)
}

/**
 * @param {IngestaJob} job
 * @param {number} [now]
 * @returns {{
 *   jobId: string,
 *   estado: string,
 *   filasTotales: number,
 *   insertadas: number,
 *   rechazadas: number,
 *   porcentaje: number
 * }}
 */
function buildRawSnapshot(job, now = Date.now()) {
  const elapsed = now - job.createdAt
  let estado = INGESTA_ESTADOS.EN_COLA
  let procesados = 0

  if (elapsed >= QUEUE_DURATION_MS) {
    const progress = Math.min(
      (elapsed - QUEUE_DURATION_MS) / PROCESS_DURATION_MS,
      1,
    )

    if (job.scenario === 'fallo' && progress >= FAILURE_PROGRESS) {
      estado = INGESTA_ESTADOS.FALLIDO
      procesados = getProcessedRows(job.filasTotales, FAILURE_PROGRESS)
    } else if (progress >= 1) {
      estado = INGESTA_ESTADOS.COMPLETADO
      procesados = job.filasTotales
    } else {
      estado = INGESTA_ESTADOS.EN_PROCESO
      procesados = getProcessedRows(job.filasTotales, progress)
    }
  }

  const rechazadas = job.hasRejections
    ? Math.round(procesados * REJECTION_RATE)
    : 0
  const insertadas = procesados - rechazadas
  const porcentaje =
    job.filasTotales > 0
      ? (procesados / job.filasTotales) * 100
      : 0

  return {
    jobId: job.jobId,
    estado,
    filasTotales: job.filasTotales,
    insertadas,
    rechazadas,
    porcentaje,
  }
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function escapeCsv(value) {
  const text = String(value ?? '')

  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }

  return text
}

/**
 * @param {IngestaJob} job
 * @param {number} rejectedRows
 * @returns {string}
 */
function buildQuarantineCsv(job, rejectedRows) {
  const lines = ['fila,nro_documento,num_papeleta,origen,motivo']
  const databaseReason =
    DATABASE_REASONS[job.area] ?? DATABASE_REASONS.AREA1

  for (let index = 0; index < rejectedRows; index += 1) {
    const isValidation = index % 10 < 7
    const origin = isValidation ? 'VALIDACION' : 'BASE_DE_DATOS'
    const reason = isValidation
      ? VALIDATION_REASONS[index % VALIDATION_REASONS.length]
      : databaseReason

    const values = [
      index + 1,
      10000000 + (index % 90000000),
      `PAP-${String(index + 1).padStart(6, '0')}`,
      origin,
      reason,
    ]

    lines.push(values.map(escapeCsv).join(','))
  }

  return lines.join('\n')
}

/**
 * Inicia una ingesta simulada.
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
 * @returns {Promise<{
 *   jobId: string,
 *   snapshot: import('../ingestaApi.js').IngestaSnapshot
 * }>}
 */
export async function startIngesta({
  area,
  file,
  onUploadProgress,
  signal,
}) {
  if (signal?.aborted) {
    throw createAbortError()
  }

  const filename = String(file?.name ?? '').toLowerCase()

  if (filename.includes('saturado')) {
    throw new ApiError(429, TOO_MANY_MESSAGE)
  }

  const fileSize = file?.size ?? 0
  const uploadDuration =
    UPLOAD_MIN_MS + Math.random() * (UPLOAD_MAX_MS - UPLOAD_MIN_MS)
  const stepDuration =
    (uploadDuration - INITIAL_UPLOAD_DELAY_MS) / UPLOAD_STEPS

  await wait(INITIAL_UPLOAD_DELAY_MS, signal)

  for (let step = 1; step <= UPLOAD_STEPS; step += 1) {
    await wait(stepDuration, signal)

    onUploadProgress?.({
      loaded: Math.round((fileSize * step) / UPLOAD_STEPS),
      total: fileSize,
      percent: step * 10,
    })
  }

  if (signal?.aborted) {
    throw createAbortError()
  }

  const filasTotales = Math.max(2000, Math.round(fileSize / 400))
  const jobId = createJobId()
  const job = {
    jobId,
    area,
    filasTotales,
    scenario: getScenario(filename),
    hasRejections: filename.includes('rechazos'),
    createdAt: Date.now(),
    consultas: 0,
  }

  JOBS.set(jobId, job)

  return {
    jobId,
    snapshot: adaptSnapshot(buildRawSnapshot(job)),
  }
}

/**
 * Consulta el estado simulado de una ingesta.
 * @param {string} jobId
 * @returns {Promise<import('../ingestaApi.js').IngestaSnapshot>}
 */
export async function getIngestaStatus(jobId) {
  const job = JOBS.get(jobId)

  if (!job) {
    throw new ApiError(404, NOT_FOUND_MESSAGE)
  }

  if (job.scenario === 'expirado') {
    job.consultas += 1

    if (job.consultas >= 3) {
      JOBS.delete(jobId)
      throw new ApiError(404, NOT_FOUND_MESSAGE)
    }
  }

  return adaptSnapshot(buildRawSnapshot(job))
}

/**
 * Descarga la cuarentena simulada de una ingesta terminada.
 * @param {string} jobId
 * @returns {Promise<{ blob: Blob, size: number }>}
 */
export async function fetchCuarentena(jobId) {
  const job = JOBS.get(jobId)

  if (!job) {
    throw new ApiError(404, NOT_FOUND_MESSAGE)
  }

  const snapshot = buildRawSnapshot(job)

  if (!isFinalEstado(snapshot.estado)) {
    throw new ApiError(409, NOT_FINISHED_MESSAGE)
  }

  const rejectedRows = Math.min(
    snapshot.rechazadas,
    MAX_QUARANTINE_ROWS,
  )
  const csv = buildQuarantineCsv(job, rejectedRows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })

  return { blob, size: blob.size }
}
