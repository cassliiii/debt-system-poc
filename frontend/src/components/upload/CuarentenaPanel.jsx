import { useEffect, useState } from 'react'
import { Alert } from '../ui/Alert.jsx'
import { Button } from '../ui/Button.jsx'
import { Chip } from '../ui/Chip.jsx'
import { DataTable } from '../ui/DataTable.jsx'
import { ApiError } from '../../services/errors.js'
import { fetchCuarentena } from '../../services/ingestaService.js'
import { parseCsv } from '../../utils/csv.js'
import { mapCuarentena } from '../../utils/cuarentena.js'
import { saveBlob } from '../../utils/download.js'
import { humanizeMotivo } from '../../utils/motivos.js'
import './CuarentenaPanel.css'

const MAX_PREVIEW_BYTES = 20 * 1024 * 1024
const LARGE_FILE_MESSAGE =
  'El detalle es muy extenso para mostrarlo en pantalla. Descargue el archivo para revisarlo.'
const ERROR_TITLE = 'No se pudieron cargar los registros rechazados'

/**
 * @param {string} value
 * @returns {{ label: string, variant: 'porVencer' | 'vencida' | 'base' }}
 */
function getOrigin(value) {
  const text = String(value ?? '').trim()
  const normalized = text.toLowerCase()

  if (normalized.includes('valid')) {
    return { label: 'Validación', variant: 'porVencer' }
  }

  if (
    normalized.includes('base') ||
    normalized.includes('database') ||
    normalized.includes('datos') ||
    normalized === 'db'
  ) {
    return { label: 'Base de datos', variant: 'vencida' }
  }

  return { label: text || 'Sin origen', variant: 'base' }
}

function OriginChip({ value }) {
  const origin = getOrigin(value)
  return <Chip variant={origin.variant}>{origin.label}</Chip>
}

function MotivoCell({ value }) {
  const original = String(value ?? '')
  const humanized = humanizeMotivo(original)

  return (
    <span className="cuarentena-panel__motivo">
      <span>{humanized}</span>
      {humanized !== original ? (
        <span className="cuarentena-panel__motivo-tecnico">{original}</span>
      ) : null}
    </span>
  )
}

/**
 * @param {string[]} recognized
 * @returns {Array<{
 *   key: string,
 *   header: string,
 *   render?: (row: object) => import('react').ReactNode
 * }>}
 */
function buildColumns(recognized) {
  const fields = new Set(recognized)
  const columns = []

  if (fields.has('fila')) {
    columns.push({ key: 'fila', header: 'Fila' })
  }

  if (fields.has('documento')) {
    columns.push({ key: 'documento', header: 'Documento' })
  }

  if (fields.has('papeleta')) {
    columns.push({ key: 'papeleta', header: 'N.º de papeleta' })
  }

  if (fields.has('origen')) {
    columns.push({
      key: 'origen',
      header: 'Origen',
      render: (row) => <OriginChip value={row.origen} />,
    })
  }

  if (fields.has('motivo')) {
    columns.push({
      key: 'motivo',
      header: 'Motivo',
      render: (row) => <MotivoCell value={row.motivo} />,
    })
  }

  return columns
}

/**
 * Muestra el detalle de las filas rechazadas de una ingesta terminada.
 * @param {object} props
 * @param {string} props.jobId
 * @param {string} props.areaCode
 */
export function CuarentenaPanel({ jobId, areaCode }) {
  const [status, setStatus] = useState('loading')
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [retryToken, setRetryToken] = useState(0)

  useEffect(() => {
    if (!jobId) return undefined

    let cancelled = false

    fetchCuarentena(jobId)
      .then(async ({ blob, size }) => {
        if (cancelled) return

        if (size > MAX_PREVIEW_BYTES) {
          setData({ blob, rows: [], recognized: [] })
          setStatus('too-large')
          return
        }

        const text = await blob.text()
        if (cancelled) return

        const parsed = parseCsv(text)
        const mapped = mapCuarentena(parsed)

        setData({
          blob,
          rows: mapped.rows,
          recognized: mapped.recognized,
        })
        setStatus(mapped.recognized.length === 0 ? 'unrecognized' : 'ready')
      })
      .catch((requestError) => {
        if (cancelled) return
        setError(requestError)
        setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [jobId, areaCode, retryToken])

  if (!jobId) return null

  const isQuarantineError =
    error instanceof ApiError &&
    (error.status === 404 || error.status === 409)
  const errorMessage =
    error instanceof Error
      ? error.message
      : 'No se pudieron cargar los registros rechazados.'
  const columns = data ? buildColumns(data.recognized) : []

  const handleRetry = () => {
    setStatus('loading')
    setData(null)
    setError(null)
    setRetryToken((token) => token + 1)
  }

  const handleDownload = () => {
    if (!data?.blob) return
    saveBlob(data.blob, `rechazados-${jobId}.csv`)
  }

  return (
    <div className="cuarentena-panel">
      {status === 'loading' ? (
        <p
          className="cuarentena-panel__status"
          role="status"
          aria-live="polite"
        >
          Cargando registros rechazados…
        </p>
      ) : null}

      {status === 'too-large' || status === 'unrecognized' ? (
        <Alert variant="info">{LARGE_FILE_MESSAGE}</Alert>
      ) : null}

      {status === 'error' ? (
        <Alert
          variant={isQuarantineError ? 'warning' : 'error'}
          title={ERROR_TITLE}
          action={
            <Button variant="secondary" onClick={handleRetry}>
              Reintentar
            </Button>
          }
        >
          {errorMessage}
        </Alert>
      ) : null}

      {status === 'ready' ? (
        <DataTable
          caption="Registros rechazados"
          columns={columns}
          rows={data.rows}
          getRowKey={(row, index) =>
            `${row.fila || 'fila'}-${index}`
          }
          emptyMessage="No hay registros rechazados para mostrar."
          pageSize={50}
        />
      ) : null}

      {data?.blob ? (
        <div className="cuarentena-panel__footer">
          <Button variant="secondary" onClick={handleDownload}>
            Descargar registros rechazados
          </Button>
          <p className="cuarentena-panel__help">
            Corrija estos registros y cárguelos de nuevo. Los registros ya
            insertados no se vuelven a cargar.
          </p>
        </div>
      ) : null}
    </div>
  )
}
