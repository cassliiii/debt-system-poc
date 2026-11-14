import './ProgressBar.css'

/**
 * Barra de progreso determinada o en espera.
 * @param {object} props
 * @param {number | null} props.value
 * @param {string} [props.label]
 * @param {string} props.ariaLabel
 */
export function ProgressBar({ value, label, ariaLabel }) {
  const hasValue = Number.isFinite(value)
  const percent = hasValue ? Math.min(100, Math.max(0, value)) : 0

  return (
    <div className="progress-bar">
      <div
        className="progress-bar__track"
        role="progressbar"
        aria-label={ariaLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={hasValue ? Math.round(percent) : undefined}
        aria-valuetext={label || undefined}
      >
        <div
          className="progress-bar__fill"
          style={{ width: `${percent}%` }}
        />
      </div>
      {label ? <p className="progress-bar__label">{label}</p> : null}
    </div>
  )
}
