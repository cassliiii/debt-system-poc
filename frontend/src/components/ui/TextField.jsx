import { useId, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import './TextField.css'

/**
 * Campo de texto con etiqueta, ayuda y error.
 * @param {object} props
 * @param {string} [props.id]
 * @param {string} props.label
 * @param {string} props.value
 * @param {(event: import('react').ChangeEvent<HTMLInputElement>) => void} props.onChange
 * @param {string} [props.helper]
 * @param {string} [props.error]
 * @param {'text' | 'numeric' | 'decimal' | 'tel' | 'email' | 'search' | 'url'} [props.inputMode]
 * @param {number} [props.maxLength]
 * @param {string} [props.autoComplete]
 * @param {'text' | 'password' | 'email' | 'tel' | 'search' | 'url' | 'number'} [props.type]
 * @param {boolean} [props.required]
 * @param {string} [props.width]
 */
export function TextField({
  id,
  label,
  value,
  onChange,
  helper,
  error,
  inputMode,
  maxLength,
  autoComplete,
  type = 'text',
  required = false,
  width,
}) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const [passwordVisible, setPasswordVisible] = useState(false)

  const helperId = helper ? `${fieldId}-helper` : undefined
  const errorId = error ? `${fieldId}-error` : undefined
  const describedBy =
    [helperId, errorId].filter(Boolean).join(' ') || undefined

  const isPassword = type === 'password'
  const inputType = isPassword && passwordVisible ? 'text' : type

  return (
    <div className="text-field" style={width ? { width } : undefined}>
      <label className="text-field__label" htmlFor={fieldId}>
        {label}
        {required ? (
          <span className="text-field__required" aria-hidden="true">
            {' '}
            *
          </span>
        ) : null}
      </label>
      <div
        className={`text-field__control${
          error ? ' text-field__control--error' : ''
        }`}
      >
        <input
          id={fieldId}
          className="text-field__input"
          type={inputType}
          value={value}
          onChange={onChange}
          inputMode={inputMode}
          maxLength={maxLength}
          autoComplete={autoComplete}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
        />
        {isPassword ? (
          <button
            type="button"
            className="text-field__toggle"
            aria-pressed={passwordVisible}
            onClick={() => setPasswordVisible((visible) => !visible)}
          >
            {passwordVisible ? 'Ocultar' : 'Mostrar'}
          </button>
        ) : null}
      </div>
      {helper ? (
        <p id={helperId} className="text-field__helper">
          {helper}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-field__error">
          <AlertCircle size={20} strokeWidth={1.5} aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  )
}
