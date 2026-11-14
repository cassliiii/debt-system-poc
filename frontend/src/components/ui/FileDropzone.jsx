import { useId, useRef, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from './Button.jsx'
import './FileDropzone.css'

const sizeFormatter = new Intl.NumberFormat('es-PE', {
  maximumFractionDigits: 1,
})

/**
 * Zona de carga de archivos con arrastrar y soltar.
 * @param {object} props
 * @param {string} [props.accept]
 * @param {File | null} [props.file]
 * @param {(file: File) => void} props.onFileSelect
 * @param {() => void} [props.onClear]
 * @param {string} [props.error]
 * @param {string} [props.helper]
 * @param {boolean} [props.disabled]
 */
export function FileDropzone({
  accept = '.csv',
  file,
  onFileSelect,
  onClear,
  error,
  helper,
  disabled = false,
}) {
  const inputId = useId()
  const inputRef = useRef(null)
  const [dragActive, setDragActive] = useState(false)

  const helperId = helper ? `${inputId}-helper` : undefined
  const errorId = error ? `${inputId}-error` : undefined
  const describedBy =
    [helperId, errorId].filter(Boolean).join(' ') || undefined

  const formatSize = (bytes) => {
    if (bytes < 1024 * 1024) {
      return `${sizeFormatter.format(bytes / 1024)} KB`
    }
    return `${sizeFormatter.format(bytes / (1024 * 1024))} MB`
  }

  const handleDragOver = (event) => {
    if (disabled) return
    event.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = () => {
    if (disabled) return
    setDragActive(false)
  }

  const handleDrop = (event) => {
    if (disabled) return
    event.preventDefault()
    setDragActive(false)
    const selected = event.dataTransfer.files?.[0]
    if (selected) onFileSelect(selected)
  }

  const className = [
    'file-dropzone',
    dragActive ? 'file-dropzone--active' : '',
    disabled ? 'file-dropzone--disabled' : '',
    error ? 'file-dropzone--error' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="file-dropzone-field">
      <div
        className={className}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          id={inputId}
          className="visually-hidden"
          type="file"
          accept={accept}
          tabIndex={-1}
          disabled={disabled}
          aria-describedby={describedBy}
          onChange={(event) => {
            const selected = event.target.files?.[0]
            if (selected) onFileSelect(selected)
            event.target.value = ''
          }}
        />
        <p className="file-dropzone__text">
          Arrastre el archivo CSV o seleccione uno
        </p>
        <Button
          variant="secondary"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          Seleccionar archivo
        </Button>
        {file ? (
          <div className="file-dropzone__file" aria-live="polite">
            <p className="file-dropzone__file-info">
              <span className="file-dropzone__file-name">{file.name}</span>
              <span className="file-dropzone__file-size num">
                {formatSize(file.size)}
              </span>
            </p>
            <Button
              variant="link"
              disabled={disabled}
              onClick={() => {
                if (onClear) onClear()
              }}
            >
              Quitar archivo
            </Button>
          </div>
        ) : null}
      </div>
      {helper ? (
        <p id={helperId} className="file-dropzone__helper">
          {helper}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="file-dropzone__error">
          <AlertCircle size={20} strokeWidth={1.5} aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  )
}
