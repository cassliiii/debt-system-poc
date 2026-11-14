import { useEffect, useRef, useState } from 'react'
import { DebtDetailTable } from '../components/debt/DebtDetailTable.jsx'
import { DebtTotals } from '../components/debt/DebtTotals.jsx'
import { Alert } from '../components/ui/Alert.jsx'
import { Button } from '../components/ui/Button.jsx'
import { ErrorSummary } from '../components/ui/ErrorSummary.jsx'
import { Panel } from '../components/ui/Panel.jsx'
import { TextField } from '../components/ui/TextField.jsx'
import { useDocumentTitle } from '../hooks/useDocumentTitle.js'
import { ApiError } from '../services/errors.js'
import { getDebtByDni } from '../services/debtService.js'
import { formatDateTime } from '../utils/format.js'
import { dniErrorMessage } from '../utils/validators.js'
import './ConsultaPage.css'

const DNI_FIELD = 'consulta-dni'

function formatConsolidado(iso) {
  const formatted = formatDateTime(iso)
  if (!formatted) return ''

  const [datePart, timePart = '00:00'] = formatted.split(' ')
  return `Datos consolidados al ${datePart} a las ${timePart}.`
}

export function ConsultaPage() {
  const [dni, setDni] = useState('')
  const [status, setStatus] = useState('idle')
  const [result, setResult] = useState(null)
  const [apiError, setApiError] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [summaryErrors, setSummaryErrors] = useState([])
  const [errorVersion, setErrorVersion] = useState(0)

  const resultTitleRef = useRef(null)
  const emptyTitleRef = useRef(null)
  const errorRef = useRef(null)

  useDocumentTitle('Consulta de deuda')

  const isLoading = status === 'loading'

  useEffect(() => {
    if (status === 'success') {
      resultTitleRef.current?.focus()
    } else if (status === 'notFound') {
      emptyTitleRef.current?.focus()
    } else if (status === 'error') {
      errorRef.current?.focus()
    }
  }, [status])

  const consultar = async (value) => {
    const dniValue = value.trim()
    const validationMessage = dniErrorMessage(dniValue)

    if (validationMessage) {
      setFieldError(validationMessage)
      setSummaryErrors([
        { fieldId: DNI_FIELD, label: validationMessage },
      ])
      setErrorVersion((version) => version + 1)
      setApiError('')
      setResult(null)
      setStatus('idle')
      return
    }

    setFieldError('')
    setSummaryErrors([])
    setApiError('')
    setResult(null)
    setStatus('loading')

    try {
      const data = await getDebtByDni(dniValue)
      setResult(data)
      setStatus('success')
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) {
        setFieldError(error.message)
        setSummaryErrors([
          { fieldId: DNI_FIELD, label: error.message },
        ])
        setErrorVersion((version) => version + 1)
        setStatus('idle')
      } else if (error instanceof ApiError && error.status === 404) {
        setStatus('notFound')
      } else {
        setApiError(
          error instanceof ApiError
            ? error.message
            : 'No se pudo completar la consulta. Intente nuevamente.',
        )
        setStatus('error')
      }
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (isLoading) return
    consultar(dni)
  }

  const handleDniChange = (event) => {
    const value = event.target.value.replace(/\D/g, '').slice(0, 8)
    setDni(value)
    setFieldError('')
    setSummaryErrors([])
  }

  const handleRetry = () => {
    if (isLoading) return
    consultar(dni)
  }

  const handleNuevaConsulta = () => {
    setDni('')
    setFieldError('')
    setSummaryErrors([])
    setApiError('')
    setResult(null)
    setStatus('idle')
    document.getElementById(DNI_FIELD)?.focus()
  }

  const fechaConsolidada =
    result?.fechaActualizacion
      ? formatConsolidado(result.fechaActualizacion)
      : ''

  return (
    <div className="consulta-page">
      <h1>Consulta de deuda</h1>

      <Panel>
        <form
          className="consulta-page__form"
          onSubmit={handleSubmit}
          noValidate
        >
          {summaryErrors.length > 0 ? (
            <ErrorSummary
              key={`dni-${errorVersion}`}
              errors={summaryErrors}
            />
          ) : null}
          <div className="consulta-page__field">
            <TextField
              id={DNI_FIELD}
              label="DNI del ciudadano"
              value={dni}
              onChange={handleDniChange}
              helper={fieldError ? undefined : '8 dígitos'}
              error={fieldError}
              inputMode="numeric"
              maxLength={8}
            />
            <div className="consulta-page__submit">
              <Button type="submit" variant="primary" disabled={isLoading}>
                {isLoading ? 'Consultando…' : 'Consultar deuda'}
              </Button>
            </div>
          </div>
        </form>
      </Panel>

      <p className="visually-hidden" role="status" aria-live="polite">
        {isLoading ? 'Consultando…' : ''}
      </p>

      {status === 'notFound' ? (
        <Panel>
          <div className="consulta-page__empty">
            <h2
              ref={emptyTitleRef}
              tabIndex={-1}
              className="consulta-page__empty-title"
            >
              No hay deudas registradas para este DNI
            </h2>
            <p>
              Verifique el número ingresado o consulte con el área
              correspondiente.
            </p>
          </div>
        </Panel>
      ) : null}

      {status === 'error' ? (
        <div ref={errorRef} tabIndex={-1} className="consulta-page__alert">
          <Alert
            variant="error"
            title="No se pudo completar la consulta"
            action={
              <Button variant="secondary" onClick={handleRetry}>
                Reintentar
              </Button>
            }
          >
            {apiError}
          </Alert>
        </div>
      ) : null}

      {status === 'success' && result ? (
        <Panel>
          <div className="consulta-page__result">
            <div className="consulta-page__result-header">
              <h2
                ref={resultTitleRef}
                tabIndex={-1}
                className="consulta-page__result-title"
              >
                {result.nombre}
              </h2>
              <p className="consulta-page__result-dni num">
                DNI {result.dni}
              </p>
              <p className="consulta-page__helper">
                Los datos se actualizan una vez al día.
              </p>
              {fechaConsolidada ? (
                <p className="consulta-page__helper">{fechaConsolidada}</p>
              ) : null}
            </div>

            <DebtTotals
              deudaBaseTotal={result.deudaBaseTotal}
              interesTotal={result.interesTotal}
              deudaTotal={result.deudaTotal}
            />

            <DebtDetailTable detalle={result.detalle} />

            <div className="consulta-page__actions no-print">
              <Button
                variant="secondary"
                className="no-print"
                onClick={() => window.print()}
              >
                Imprimir reporte
              </Button>
              <Button
                variant="secondary"
                className="no-print"
                onClick={handleNuevaConsulta}
              >
                Nueva consulta
              </Button>
            </div>
          </div>
        </Panel>
      ) : null}
    </div>
  )
}
