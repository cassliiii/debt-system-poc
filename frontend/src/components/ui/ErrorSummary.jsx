import { useEffect, useId, useRef } from 'react'
import { XCircle } from 'lucide-react'
import './ErrorSummary.css'

/**
 * Resumen de errores de un formulario.
 * @param {object} props
 * @param {Array<{ fieldId: string, label?: string, message?: string }>} props.errors
 */
export function ErrorSummary({ errors }) {
  const titleId = useId()
  const summaryRef = useRef(null)
  const count = errors.length

  useEffect(() => {
    if (count > 0) summaryRef.current?.focus()
  }, [count])

  if (count === 0) return null

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
          Hay {count} problemas
        </p>
        <ul className="error-summary__list">
          {errors.map((error) => (
            <li key={error.fieldId}>
              <a
                href={`#${error.fieldId}`}
                onClick={(event) => handleFieldClick(event, error.fieldId)}
              >
                {error.label ?? error.message ?? error.fieldId}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
