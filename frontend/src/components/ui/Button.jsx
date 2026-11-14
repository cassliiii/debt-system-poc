import './Button.css'

/**
 * Botón del sistema.
 * @param {object} props
 * @param {'primary' | 'secondary' | 'danger' | 'link'} [props.variant]
 * @param {'button' | 'submit' | 'reset'} [props.type]
 * @param {boolean} [props.disabled]
 * @param {() => void} [props.onClick]
 * @param {boolean} [props.fullWidth]
 * @param {import('react').ReactNode} props.children
 */
export function Button({
  variant = 'primary',
  type = 'button',
  disabled = false,
  onClick,
  fullWidth = false,
  children,
}) {
  const className = [
    'button',
    `button--${variant}`,
    fullWidth ? 'button--full' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      type={type}
      className={className}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
