import { useEffect, useRef, useState } from 'react'
import { Alert } from '../components/ui/Alert.jsx'
import { Button } from '../components/ui/Button.jsx'
import { ErrorSummary } from '../components/ui/ErrorSummary.jsx'
import { FileDropzone } from '../components/ui/FileDropzone.jsx'
import { Panel } from '../components/ui/Panel.jsx'
import { SelectField } from '../components/ui/SelectField.jsx'
import { AREAS } from '../config/areas.js'
import { MAX_UPLOAD_MB } from '../config/app.js'
import { REQUIRED_COLUMNS } from '../config/csvContract.js'
import { useDocumentTitle } from '../hooks/useDocumentTitle.js'
import { uploadCsv } from '../services/debtService.js'
import { ApiError } from '../services/errors.js'
import { validateCsvFile } from '../utils/validators.js'
import './CargaPage.css'

const AREA_FIELD = 'carga-area'
const FILE_FIELD = 'carga-archivo'

const numberFormatter = new Intl.NumberFormat('es-PE')

export function CargaPage() {
  const [area, setArea] = useState('')
  const [file, setFile] = useState(null)
  const [fieldErrors, setFieldErrors] = useState([])
  const [feedback, setFeedback] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [errorVersion, setErrorVersion] = useState(0)

  const feedbackRef = useRef(null)

  useDocumentTitle('Carga de datos')

  useEffect(() => {
    if (feedback && feedback.kind !== 'rejected') {
      feedbackRef.current?.focus()
    }
  }, [feedback])

  const areaError = fieldErrors.find(
    (error) => error.fieldId === AREA_FIELD,
  )?.label

  const fileError = fieldErrors.find(
    (error) => error.fieldId === FILE_FIELD,
  )?.label

  const handleAreaChange = (event) => {
    setArea(event.target.value)
    setFieldErrors((current) =>
      current.filter((error) => error.fieldId !== AREA_FIELD),
    )
    setFeedback(null)
  }

  const handleFileSelect = (selected) => {
    setFile(selected)
    setFieldErrors((current) =>
      current.filter((error) => error.fieldId !== FILE_FIELD),
    )
    setFeedback(null)
  }

  const handleFileClear = () => {
    setFile(null)
    setFieldErrors((current) =>
      current.filter((error) => error.fieldId !== FILE_FIELD),
    )
    setFeedback(null)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (submitting) return

    const nextErrors = []

    if (area === '') {
      nextErrors.push({
        fieldId: AREA_FIELD,
        label: 'Seleccione un área.',
      })
    }

    validateCsvFile(file).forEach((message) => {
      nextErrors.push({ fieldId: FILE_FIELD, label: message })
    })

    setFeedback(null)

    if (nextErrors.length > 0) {
      setFieldErrors(nextErrors)
      setErrorVersion((version) => version + 1)
      return
    }

    setFieldErrors([])
    setSubmitting(true)

    try {
      const result = await uploadCsv({ area, file })
      setFeedback({
        kind: 'success',
        title: 'Carga completada',
        message: result.message,
        totalRegistros: result.totalRegistros,
      })
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) {
        setErrorVersion((version) => version + 1)
        setFeedback({
          kind: 'rejected',
          title: error.message,
          errors: Array.isArray(error.errors)
            ? error.errors.map((message) => ({ label: message }))
            : [],
        })
      } else {
        setFeedback({
          kind: 'error',
          title: 'No se pudo completar la carga',
          message:
            error instanceof ApiError
              ? error.message
              : 'No se pudo completar la carga. Intente nuevamente.',
        })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="carga-page">
      <h1>Carga de datos</h1>
      <p className="carga-page__intro">
        Seleccione el área de destino y el archivo CSV que desea cargar.
      </p>

      <Panel>
        <form className="carga-page__form" onSubmit={handleSubmit} noValidate>
          {fieldErrors.length > 0 ? (
            <ErrorSummary
              key={`campos-${errorVersion}`}
              errors={fieldErrors}
            />
          ) : null}

          <SelectField
            id={AREA_FIELD}
            label="Área"
            value={area}
            onChange={handleAreaChange}
            options={[
              { value: '', label: 'Seleccione un área' },
              ...AREAS,
            ]}
            helper="El padrón se cargará en el área seleccionada."
            error={areaError}
            required
            disabled={submitting}
          />

          <FileDropzone
            id={FILE_FIELD}
            file={file}
            onFileSelect={handleFileSelect}
            onClear={handleFileClear}
            error={fileError}
            helper={`Formato CSV, máximo ${MAX_UPLOAD_MB} MB. Cabeceras: ${REQUIRED_COLUMNS.join(', ')}.`}
            disabled={submitting}
          />

          <div className="carga-page__actions">
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Subiendo…' : 'Subir archivo'}
            </Button>
          </div>
        </form>
      </Panel>

      <p className="visually-hidden" role="status" aria-live="polite">
        {submitting ? 'Subiendo archivo…' : ''}
      </p>

      {feedback?.kind === 'success' ? (
        <div
          ref={feedbackRef}
          tabIndex={-1}
          className="carga-page__feedback"
        >
          <Alert variant="success" title={feedback.title}>
            {feedback.message}
            {Number.isFinite(feedback.totalRegistros) ? (
              <p className="carga-page__total">
                Registros procesados:{' '}
                <span className="num">
                  {numberFormatter.format(feedback.totalRegistros)}
                </span>
                .
              </p>
            ) : null}
          </Alert>
        </div>
      ) : null}

      {feedback?.kind === 'rejected' ? (
        <ErrorSummary
          key={`servidor-${errorVersion}`}
          title={feedback.title}
          errors={feedback.errors}
        />
      ) : null}

      {feedback?.kind === 'error' ? (
        <div
          ref={feedbackRef}
          tabIndex={-1}
          className="carga-page__feedback"
        >
          <Alert variant="error" title={feedback.title}>
            {feedback.message}
          </Alert>
        </div>
      ) : null}
    </div>
  )
}
