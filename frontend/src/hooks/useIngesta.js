import { useCallback, useEffect, useRef, useState } from 'react'
import { POLL_INTERVAL_MS } from '../config/app.js'
import { INGESTA_ESTADOS, isFinalEstado } from '../config/ingesta.js'
import { ApiError } from '../services/errors.js'
import { getIngestaStatus, startIngesta } from '../services/ingestaService.js'

const UPLOAD_WARNING = 'Si cierra la página, la subida se cancelará.'
const MAX_CONSECUTIVE_RETRIES = 3
const POLL_ERROR_MESSAGE = 'No se pudo consultar el estado de la carga.'
const START_ERROR_MESSAGE = 'No se pudo iniciar la carga.'
const NO_AREA_MESSAGE = 'No se pudo identificar el área del operador.'

const PHASE_BY_ESTADO = {
  [INGESTA_ESTADOS.EN_COLA]: 'queued',
  [INGESTA_ESTADOS.EN_PROCESO]: 'processing',
  [INGESTA_ESTADOS.COMPLETADO]: 'completed',
  [INGESTA_ESTADOS.FALLIDO]: 'failed',
}

/**
 * @returns {{
 *   phase: 'idle',
 *   uploadPercent: number,
 *   uploadedBytes: number,
 *   totalBytes: number,
 *   job: null,
 *   error: null
 * }}
 */
function createIdleState() {
  return {
    phase: 'idle',
    uploadPercent: 0,
    uploadedBytes: 0,
    totalBytes: 0,
    job: null,
    error: null,
  }
}

/**
 * @returns {Storage | null}
 */
function getStorage() {
  if (typeof sessionStorage === 'undefined') return null
  return sessionStorage
}

/**
 * @param {string | null} storageKey
 * @returns {{
 *   jobId: string,
 *   nombreArchivo: string,
 *   tamano: number
 * } | null}
 */
function readSavedJob(storageKey) {
  if (!storageKey) return null

  const storage = getStorage()
  if (!storage) return null

  try {
    const raw = storage.getItem(storageKey)
    if (!raw) return null

    const saved = JSON.parse(raw)
    if (!saved || typeof saved.jobId !== 'string' || !saved.jobId) {
      return null
    }

    return saved
  } catch {
    return null
  }
}

/**
 * @param {string | null} storageKey
 * @param {{ jobId: string, nombreArchivo: string, tamano: number }} job
 */
function saveJob(storageKey, job) {
  if (!storageKey) return

  const storage = getStorage()
  if (!storage) return

  try {
    storage.setItem(storageKey, JSON.stringify(job))
  } catch {
    return
  }
}

/**
 * @param {string | null} storageKey
 */
function removeSavedJob(storageKey) {
  if (!storageKey) return

  const storage = getStorage()
  if (!storage) return

  try {
    storage.removeItem(storageKey)
  } catch {
    return
  }
}

/**
 * @param {unknown} error
 * @returns {boolean}
 */
function isNotFoundError(error) {
  return error instanceof ApiError && error.status === 404
}

/**
 * @param {unknown} error
 * @returns {boolean}
 */
function isRetryableError(error) {
  return (
    error instanceof ApiError &&
    (error.status === 0 || error.status >= 500)
  )
}

/**
 * @param {unknown} error
 * @param {string} fallback
 * @returns {string}
 */
function getErrorMessage(error, fallback) {
  if (
    error instanceof ApiError &&
    typeof error.message === 'string' &&
    error.message.trim() !== ''
  ) {
    return error.message
  }

  return fallback
}

/**
 * @param {string} estado
 * @returns {'queued' | 'processing' | 'completed' | 'failed'}
 */
function getPhaseFromEstado(estado) {
  return PHASE_BY_ESTADO[estado] ?? 'queued'
}

/**
 * Gestiona una carga CSV y el seguimiento de su estado.
 * @param {string} areaCode
 * @returns {{
 *   phase: 'idle' | 'uploading' | 'queued' | 'processing' | 'completed' | 'failed' | 'unavailable' | 'error',
 *   uploadPercent: number,
 *   uploadedBytes: number,
 *   totalBytes: number,
 *   job: {
 *     jobId: string,
 *     estado: string,
 *     totalRegistros: number,
 *     insertados: number,
 *     rechazados: number,
 *     procesados: number,
 *     porcentaje: number
 *   } | null,
 *   error: string | null,
 *   jobId: string | null,
 *   start: (file: File) => Promise<void>,
 *   cancelUpload: () => void,
 *   reset: () => void,
 *   retryPolling: () => void
 * }}
 */
export function useIngesta(areaCode) {
  const [state, setState] = useState(createIdleState)
  const [jobId, setJobId] = useState(null)
  const [retryToken, setRetryToken] = useState(0)
  const operationRef = useRef(0)
  const uploadAbortRef = useRef(null)
  const storageKey = areaCode ? `sird.ingesta.${areaCode}` : null

  useEffect(() => {
    operationRef.current += 1
    uploadAbortRef.current?.abort()
    uploadAbortRef.current = null

    const saved = readSavedJob(storageKey)

    if (saved) {
      const savedSize = Number(saved.tamano) || 0

      setJobId(saved.jobId)
      setState({
        phase: 'queued',
        uploadPercent: 100,
        uploadedBytes: savedSize,
        totalBytes: savedSize,
        job: null,
        error: null,
      })
    } else {
      setJobId(null)
      setState(createIdleState())
    }

    return () => {
      operationRef.current += 1
      uploadAbortRef.current?.abort()
      uploadAbortRef.current = null
    }
  }, [storageKey])

  useEffect(() => {
    if (!jobId) return undefined

    const operation = operationRef.current
    let cancelled = false
    let timerId = null
    let retries = 0
    const controller = new AbortController()

    function schedule(delay) {
      timerId = window.setTimeout(() => {
        timerId = null
        void run()
      }, delay)
    }

    async function run() {
      try {
        const snapshot = await getIngestaStatus(jobId, {
          signal: controller.signal,
        })

        if (cancelled || operationRef.current !== operation) return

        retries = 0
        setState((current) => ({
          ...current,
          phase: getPhaseFromEstado(snapshot.estado),
          job: snapshot,
          error: null,
        }))

        if (isFinalEstado(snapshot.estado)) return

        schedule(POLL_INTERVAL_MS)
      } catch (error) {
        if (cancelled || operationRef.current !== operation) return

        if (isNotFoundError(error)) {
          removeSavedJob(storageKey)
          setJobId(null)
          setState((current) => ({
            ...current,
            phase: 'unavailable',
            job: null,
            error: null,
          }))
          return
        }

        if (isRetryableError(error)) {
          retries += 1

          if (retries <= MAX_CONSECUTIVE_RETRIES) {
            schedule(POLL_INTERVAL_MS)
            return
          }
        }

        setState((current) => ({
          ...current,
          phase: 'error',
          error: getErrorMessage(error, POLL_ERROR_MESSAGE),
        }))
      }
    }

    schedule(POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      if (timerId !== null) window.clearTimeout(timerId)
      controller.abort()
    }
  }, [jobId, retryToken, storageKey])

  useEffect(() => {
    if (state.phase !== 'uploading') return undefined

    const handleBeforeUnload = (event) => {
      event.preventDefault()
      event.returnValue = UPLOAD_WARNING
      return UPLOAD_WARNING
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [state.phase])

  const start = useCallback(
    async (file) => {
      if (!areaCode) {
        setState({
          ...createIdleState(),
          phase: 'error',
          error: NO_AREA_MESSAGE,
        })
        return
      }

      const operation = operationRef.current + 1
      operationRef.current = operation
      const controller = new AbortController()
      uploadAbortRef.current?.abort()
      uploadAbortRef.current = controller

      setJobId(null)
      setState({
        phase: 'uploading',
        uploadPercent: 0,
        uploadedBytes: 0,
        totalBytes: file?.size ?? 0,
        job: null,
        error: null,
      })

      try {
        const result = await startIngesta({
          area: areaCode,
          file,
          signal: controller.signal,
          onUploadProgress: ({ loaded, total, percent }) => {
            if (operationRef.current !== operation) return

            setState((current) => ({
              ...current,
              uploadPercent: percent,
              uploadedBytes: loaded,
              totalBytes: total,
            }))
          },
        })

        if (operationRef.current !== operation) return

        uploadAbortRef.current = null
        saveJob(storageKey, {
          jobId: result.jobId,
          nombreArchivo: file?.name ?? '',
          tamano: file?.size ?? 0,
        })

        setState((current) => ({
          ...current,
          phase: getPhaseFromEstado(result.snapshot.estado),
          uploadPercent: 100,
          uploadedBytes: file?.size ?? current.totalBytes,
          totalBytes: file?.size ?? current.totalBytes,
          job: result.snapshot,
          error: null,
        }))
        setJobId(result.jobId)
      } catch (error) {
        if (operationRef.current !== operation) return

        uploadAbortRef.current = null

        if (error?.name === 'AbortError') {
          setState(createIdleState())
          return
        }

        setState((current) => ({
          ...current,
          phase: 'error',
          job: null,
          error: getErrorMessage(error, START_ERROR_MESSAGE),
        }))
      }
    },
    [areaCode, storageKey],
  )

  const cancelUpload = useCallback(() => {
    const controller = uploadAbortRef.current
    if (!controller) return

    operationRef.current += 1
    uploadAbortRef.current = null
    controller.abort()
    setState(createIdleState())
  }, [])

  const reset = useCallback(() => {
    operationRef.current += 1
    uploadAbortRef.current?.abort()
    uploadAbortRef.current = null
    removeSavedJob(storageKey)
    setJobId(null)
    setState(createIdleState())
  }, [storageKey])

  const retryPolling = useCallback(() => {
    if (!jobId) return

    operationRef.current += 1
    setState((current) => ({
      ...current,
      phase: 'queued',
      error: null,
    }))
    setRetryToken((token) => token + 1)
  }, [jobId])

  return {
    phase: state.phase,
    uploadPercent: state.uploadPercent,
    uploadedBytes: state.uploadedBytes,
    totalBytes: state.totalBytes,
    job: state.job,
    error: state.error,
    jobId,
    start,
    cancelUpload,
    reset,
    retryPolling,
  }
}
