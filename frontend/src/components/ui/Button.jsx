import './Button.css'

/**
 * Botón del sistema.
 * @param {object} props
 * @param {'primary' | 'secondary' | 'danger' | 'link'} [props.variant]
 * @param {'button' | 'submit' | 'reset'} [props.type]
 * @param {boolean} [props.disabled]
 * @param {() => void} [props.onClick]
 * @param {boolean} [props.fullWidth]
 * @param {string} [props.className]
 * @param {import('react').ReactNode} props.children
 */
export function Button({
  variant = 'primary',
  type = 'button',
  disabled = false,
  onClick,
  fullWidth = false,
  className,
  children,
}) {
  const classes = [
    'button',
    `button--${variant}`,
    fullWidth ? 'button--full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
