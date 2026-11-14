import { useEffect, useRef, useState } from 'react'
import { Alert } from '../components/ui/Alert.jsx'
import { Button } from '../components/ui/Button.jsx'
import { ErrorSummary } from '../components/ui/ErrorSummary.jsx'
import { FileDropzone } from '../components/ui/FileDropzone.jsx'
import { Modal } from '../components/ui/Modal.jsx'
import { Panel } from '../components/ui/Panel.jsx'
import { ProgressBar } from '../components/ui/ProgressBar.jsx'
import { CuarentenaPanel } from '../components/upload/CuarentenaPanel.jsx'
import { IngestaSummary } from '../components/upload/IngestaSummary.jsx'
import { getAreaByCode } from '../config/areas.js'
import { MAX_UPLOAD_MB } from '../config/app.js'
import { getRequiredColumns } from '../config/csvContract.js'
import { useAuth } from '../hooks/useAuth.js'
import { useDocumentTitle } from '../hooks/useDocumentTitle.js'
import { useIngesta } from '../hooks/useIngesta.js'
import { formatFileSize } from '../utils/format.js'
import { validateCsvForArea } from '../utils/validators.js'
import './CargaPage.css'

const FILE_FIELD = 'carga-archivo'
const FINAL_PHASES = new Set([
  'completed',
  'failed',
  'unavailable',
  'error',
])

const numberFormatter = new Intl.NumberFormat('es-PE')

function formatNumber(value) {
  const number = Number(value)
  return numberFormatter.format(Number.isFinite(number) ? number : 0)
}

function progressBucket(value) {
  const percent = Number(value)
  if (!Number.isFinite(percent)) return 0
  return Math.floor(Math.max(0, Math.min(100, percent)) / 10) * 10
}

function getLiveMessage(phase, uploadPercent, job) {
  switch (phase) {
    case 'uploading':
      return `Subiendo archivo: ${progressBucket(uploadPercent)} %.`
    case 'queued':
      return 'La carga está en cola.'
    case 'processing':
      return `Procesando ${progressBucket(job?.porcentaje)} % de los registros.`
    case 'completed':
      return job?.rechazados > 0
        ? 'Carga completada con registros rechazados.'
        : 'Carga completada.'
    case 'failed':
      return 'La carga falló.'
    case 'unavailable':
      return 'La carga ya no está disponible.'
    case 'error':
      return 'No se pudo completar la carga.'
    default:
      return ''
  }
}

function CargaEnCurso({
  phase,
  uploadPercent,
  uploadedBytes,
  totalBytes,
  job,
  onCancelUpload,
}) {
  if (phase === 'uploading') {
    return (
      <Panel title="Progreso de la carga">
        <ProgressBar
          value={uploadPercent}
          label={`Subiendo archivo: ${uploadPercent} % (${formatFileSize(uploadedBytes)} de ${formatFileSize(totalBytes)})`}
          ariaLabel="Progreso de la subida"
        />
        <div className="carga-page__actions">
          <Button variant="secondary" onClick={onCancelUpload}>
            Cancelar subida
          </Button>
        </div>
      </Panel>
    )
  }

  if (phase === 'queued') {
    return (
      <Panel title="Progreso de la carga">
        <ProgressBar
          value={null}
          label="La carga está en cola. Comenzará en unos instantes."
          ariaLabel="Progreso de la carga"
        />
      </Panel>
    )
  }

  if (phase === 'processing') {
    const procesados = job?.procesados ?? 0
    const total = job?.totalRegistros ?? 0

    return (
      <Panel title="Progreso de la carga">
        <div className="carga-page__progress">
          <ProgressBar
            value={job?.porcentaje ?? 0}
            label={`Procesando ${formatNumber(procesados)} de ${formatNumber(total)} registros`}
            ariaLabel="Progreso del procesamiento"
          />
          <dl className="carga-page__stats">
            <div>
              <dt>Insertados</dt>
              <dd className="num">{formatNumber(job?.insertados)}</dd>
            </div>
            <div>
              <dt>Rechazados</dt>
              <dd className="num">{formatNumber(job?.rechazados)}</dd>
            </div>
          </dl>
        </div>
      </Panel>
    )
  }

  return null
}

export function CargaPage() {
  const { user } = useAuth()
  const assignedArea = user?.area ? getAreaByCode(user.area) : null
  const hasArea = Boolean(assignedArea)
  const requiredColumns = getRequiredColumns(user?.area)
  const {
    phase,
    uploadPercent,
    uploadedBytes,
    totalBytes,
    job,
    error,
    jobId,
    start,
    cancelUpload,
    reset,
    retryPolling,
  } = useIngesta(user?.area)

  const [file, setFile] = useState(null)
  const [validationState, setValidationState] = useState('empty')
  const [validationErrors, setValidationErrors] = useState([])
  const [validationVersion, setValidationVersion] = useState(0)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const validationRunRef = useRef(0)
  const finalFeedbackRef = useRef(null)

  useDocumentTitle('Carga de datos')

  useEffect(() => {
    if (FINAL_PHASES.has(phase)) {
      finalFeedbackRef.current?.focus()
    }
  }, [phase])

  const isValidating = validationState === 'validating'
  const isInvalid = validationState === 'invalid'
  const isFinal = FINAL_PHASES.has(phase)
  const canSubmit =
    hasArea && phase === 'idle' && Boolean(file) && validationState === 'valid'
  const formDisabled = !hasArea || phase !== 'idle' || isValidating
  const fileError = isInvalid ? validationErrors[0] : undefined
  const liveMessage = getLiveMessage(phase, uploadPercent, job)

  let actionNote = ''

  if (!hasArea) {
    actionNote = 'Su usuario no tiene un área asignada.'
  } else if (!file) {
    actionNote = 'Seleccione un archivo para continuar.'
  } else if (isValidating) {
    actionNote = 'Validando archivo…'
  } else if (isInvalid) {
    actionNote = 'Corrija los errores del archivo para continuar.'
  } else if (isFinal) {
    actionNote = 'La carga terminó. Use “Cargar otro archivo” para comenzar una nueva.'
  } else if (phase !== 'idle') {
    actionNote = 'La carga está en curso.'
  }

  const handleFileSelect = async (selected) => {
    const runId = validationRunRef.current + 1
    validationRunRef.current = runId
    setFile(selected)
    setValidationState('validating')
    setValidationErrors([])
    setConfirmOpen(false)

    const errors = await validateCsvForArea(selected, user.area)

    if (validationRunRef.current !== runId) return

    if (errors.length > 0) {
      setValidationState('invalid')
      setValidationErrors(errors)
      setValidationVersion((version) => version + 1)
      return
    }

    setValidationState('valid')
  }

  const handleFileClear = () => {
    validationRunRef.current += 1
    setFile(null)
    setValidationState('empty')
    setValidationErrors([])
    setConfirmOpen(false)
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!canSubmit) return
    setConfirmOpen(true)
  }

  const handleConfirm = () => {
    if (!file || phase !== 'idle') return
    setConfirmOpen(false)
    void start(file)
  }

  const handleRetry = () => {
    if (jobId) {
      retryPolling()
      return
    }

    reset()
  }

  const handleLoadAnother = () => {
    validationRunRef.current += 1
    reset()
    setFile(null)
    setValidationState('empty')
    setValidationErrors([])
    setConfirmOpen(false)
  }

  const jobInsertados = job?.insertados ?? 0
  const jobRechazados = job?.rechazados ?? 0
  const hasRejectedRows = jobRechazados > 0

  return (
    <div className="carga-page">
      <h1>Carga de datos</h1>
      <p className="carga-page__intro">
        Cargue el archivo CSV de su área. El procesamiento continúa en el
        servidor aunque cierre esta página.
      </p>

      {hasArea ? (
        <Panel title="Área de carga">
          <dl className="carga-page__area">
            <div>
              <dt>Área de destino</dt>
              <dd>{assignedArea.label}</dd>
            </div>
          </dl>
        </Panel>
      ) : (
        <Alert
          variant="error"
          title="Su usuario no tiene un área asignada. Comuníquese con TI."
        />
      )}

      {hasArea ? (
        <Panel title="Archivo CSV">
          <form className="carga-page__form" onSubmit={handleSubmit} noValidate>
            {isValidating ? (
              <p className="carga-page__validation" role="status">
                Validando archivo…
              </p>
            ) : null}

            {validationErrors.length > 0 ? (
              <ErrorSummary
                key={`validacion-${validationVersion}`}
                errors={validationErrors.map((message) => ({
                  fieldId: FILE_FIELD,
                  label: message,
                }))}
              />
            ) : null}

            <FileDropzone
              id={FILE_FIELD}
              file={file}
              onFileSelect={handleFileSelect}
              onClear={handleFileClear}
              error={fileError}
              helper={`Formato CSV, máximo ${MAX_UPLOAD_MB} MB. Las columnas adicionales se ignoran.`}
              disabled={formDisabled}
            />

            {requiredColumns.length > 0 ? (
              <details className="carga-page__columns">
                <summary>
                  Ver columnas obligatorias del {assignedArea.shortLabel}
                </summary>
                <ul>
                  {requiredColumns.map((column) => (
                    <li key={column}>{column}</li>
                  ))}
                </ul>
              </details>
            ) : null}

            <div className="carga-page__actions">
              <Button
                type="submit"
                variant="primary"
                disabled={!canSubmit}
              >
                Subir archivo
              </Button>
            </div>

            {actionNote ? (
              <p className="carga-page__note">{actionNote}</p>
            ) : null}
          </form>
        </Panel>
      ) : null}

      <CargaEnCurso
        phase={phase}
        uploadPercent={uploadPercent}
        uploadedBytes={uploadedBytes}
        totalBytes={totalBytes}
        job={job}
        onCancelUpload={cancelUpload}
      />

      {phase === 'completed' ? (
        <div className="carga-page__feedback">
          {hasRejectedRows ? (
            <Alert
              variant="warning"
              title="Carga completada con registros rechazados"
              titleRef={finalFeedbackRef}
            >
              Se insertaron{' '}
              <span className="num">{formatNumber(jobInsertados)}</span>{' '}
              registros.{' '}
              <span className="num">{formatNumber(jobRechazados)}</span>{' '}
              registros no se cargaron y quedaron en cuarentena.
            </Alert>
          ) : (
            <Alert
              variant="success"
              title="Carga completada"
              titleRef={finalFeedbackRef}
            >
              Se insertaron{' '}
              <span className="num">{formatNumber(jobInsertados)}</span>{' '}
              registros en {assignedArea?.label}.
            </Alert>
          )}
          <IngestaSummary job={job} />
        </div>
      ) : null}

      {phase === 'completed' && hasRejectedRows && jobId ? (
        <Panel title="Registros rechazados">
          <CuarentenaPanel
            key={`${jobId}-${assignedArea?.code}`}
            jobId={jobId}
            areaCode={assignedArea?.code}
          />
        </Panel>
      ) : null}

      {phase === 'failed' ? (
        <div className="carga-page__feedback">
          <Alert
            variant="error"
            title="La carga falló"
            titleRef={finalFeedbackRef}
          >
            <p>
              El proceso se detuvo. Revise que el archivo tenga todas las
              columnas obligatorias indicadas arriba.
            </p>
            <p>
              Si vuelve a cargar el mismo archivo, los registros que ya se
              insertaron podrían duplicarse.
            </p>
          </Alert>
          <IngestaSummary job={job} />
          {jobInsertados > 0 ? (
            <Alert variant="warning" title="Carga parcial">
              Se insertaron{' '}
              <span className="num">{formatNumber(jobInsertados)}</span>{' '}
              registros antes del fallo.
            </Alert>
          ) : null}
        </div>
      ) : null}

      {phase === 'unavailable' ? (
        <div className="carga-page__feedback">
          <Alert
            variant="warning"
            title="La carga ya no está disponible"
            titleRef={finalFeedbackRef}
          >
            Los resultados se conservan unos 30 minutos después del último
            acceso.
          </Alert>
        </div>
      ) : null}

      {phase === 'error' ? (
        <div className="carga-page__feedback">
          <Alert
            variant="error"
            title="No se pudo completar la carga"
            titleRef={finalFeedbackRef}
          >
            {error ?? 'No se pudo completar la carga. Intente nuevamente.'}
          </Alert>
        </div>
      ) : null}

      {phase === 'completed' ||
      phase === 'failed' ||
      phase === 'unavailable' ? (
        <div className="carga-page__actions">
          <Button variant="secondary" onClick={handleLoadAnother}>
            Cargar otro archivo
          </Button>
        </div>
      ) : null}

      {phase === 'error' ? (
        <div className="carga-page__actions">
          <Button variant="secondary" onClick={handleRetry}>
            Reintentar
          </Button>
          <Button variant="secondary" onClick={handleLoadAnother}>
            Cargar otro archivo
          </Button>
        </div>
      ) : null}

      <p className="visually-hidden" role="status" aria-live="polite">
        {liveMessage}
      </p>

      <Modal
        open={confirmOpen}
        title="Confirmar carga"
        onClose={() => setConfirmOpen(false)}
        secondaryAction={
          <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
            Cancelar
          </Button>
        }
        primaryAction={
          <Button variant="primary" onClick={handleConfirm}>
            Confirmar carga
          </Button>
        }
      >
        {file ? (
          <p>
            Se cargará el archivo {file.name} ({formatFileSize(file.size)}) en{' '}
            {assignedArea?.label}. Si ya cargó este archivo antes, los
            registros se duplicarán. El procesamiento continúa en el servidor
            aunque cierre esta página.
          </p>
        ) : null}
      </Modal>
    </div>
  )
}
