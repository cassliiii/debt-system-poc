import { useEffect, useId, useRef } from 'react'
import { XCircle } from 'lucide-react'
import './ErrorSummary.css'

/**
 * Resumen de errores de un formulario.
 * @param {object} props
 * @param {Array<{ fieldId?: string, label?: string, message?: string }>} [props.errors]
 * @param {string} [props.title]
 */
export function ErrorSummary({ errors = [], title }) {
  const titleId = useId()
  const summaryRef = useRef(null)
  const count = errors.length
  const hasContent = count > 0 || Boolean(title)

  useEffect(() => {
    summaryRef.current?.focus()
  }, [])

  if (!hasContent) return null

  const handleFieldClick = (event, fieldId) => {
    event.preventDefault()
    const field = document.getElementById(fieldId)
    if (field) {
      field.focus()
      field.scrollIntoView({ block: 'center' })
    }
  }

  return (
    <div
      ref={summaryRef}
      className="error-summary"
      role="alert"
      tabIndex={-1}
      aria-labelledby={titleId}
    >
      <XCircle
        className="error-summary__icon"
        size={20}
        strokeWidth={1.5}
        aria-hidden="true"
      />
      <div className="error-summary__content">
        <p id={titleId} className="error-summary__title">
          {title ?? `Hay ${count} problemas`}
        </p>
        {count > 0 ? (
          <ul className="error-summary__list">
            {errors.map((error, index) => {
              const label = error.label ?? error.message ?? error.fieldId

              return (
                <li key={error.fieldId ?? `error-${index}`}>
                  {error.fieldId ? (
                    <a
                      href={`#${error.fieldId}`}
                      onClick={(event) =>
                        handleFieldClick(event, error.fieldId)
                      }
                    >
                      {label}
                    </a>
                  ) : (
                    <span>{label}</span>
                  )}
                </li>
              )
            })}
          </ul>
        ) : null}
      </div>
    </div>
  )
}
