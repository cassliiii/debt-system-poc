import { useId } from 'react'
import { AlertCircle, ChevronDown } from 'lucide-react'
import './SelectField.css'

/**
 * Selector con el mismo aspecto que el campo de texto.
 * @param {object} props
 * @param {string} [props.id]
 * @param {string} props.label
 * @param {string} props.value
 * @param {(event: import('react').ChangeEvent<HTMLSelectElement>) => void} props.onChange
 * @param {Array<{ value: string, label: string }>} props.options
 * @param {string} [props.helper]
 * @param {string} [props.error]
 * @param {boolean} [props.required]
 * @param {boolean} [props.disabled]
 * @param {string} [props.width]
 */
export function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  helper,
  error,
  required = false,
  disabled = false,
  width,
}) {
  const generatedId = useId()
  const fieldId = id ?? generatedId

  const helperId = helper ? `${fieldId}-helper` : undefined
  const errorId = error ? `${fieldId}-error` : undefined
  const describedBy =
    [helperId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className="select-field" style={width ? { width } : undefined}>
      <label className="select-field__label" htmlFor={fieldId}>
        {label}
        {required ? (
          <span className="select-field__required" aria-hidden="true">
            {' '}
            *
          </span>
        ) : null}
      </label>
      <div
        className={`select-field__control${
          error ? ' select-field__control--error' : ''
        }`}
      >
        <select
          id={fieldId}
          className="select-field__select"
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="select-field__arrow"
          size={20}
          strokeWidth={1.5}
          aria-hidden="true"
        />
      </div>
      {helper ? (
        <p id={helperId} className="select-field__helper">
          {helper}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="select-field__error">
          <AlertCircle size={20} strokeWidth={1.5} aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  )
}
