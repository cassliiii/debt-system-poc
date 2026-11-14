import {
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
} from 'lucide-react'
import './Alert.css'

const ICONS = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
}

const ROLES = {
  info: 'status',
  success: 'status',
  warning: 'alert',
  error: 'alert',
}

/**
 * Alerta con icono, título, texto y acción opcional.
 * @param {object} props
 * @param {'info' | 'success' | 'warning' | 'error'} [props.variant]
 * @param {string} [props.title]
 * @param {import('react').Ref<HTMLParagraphElement>} [props.titleRef]
 * @param {import('react').ReactNode} [props.children]
 * @param {import('react').ReactNode} [props.action]
 */
export function Alert({
  variant = 'info',
  title,
  titleRef,
  children,
  action,
}) {
  const Icon = ICONS[variant] ?? ICONS.info

  return (
    <div className={`alert alert--${variant}`} role={ROLES[variant]}>
      <Icon
        className="alert__icon"
        size={20}
        strokeWidth={1.5}
        aria-hidden="true"
      />
      <div className="alert__content">
        {title ? (
          <p
            ref={titleRef}
            className="alert__title"
            tabIndex={titleRef ? -1 : undefined}
          >
            {title}
          </p>
        ) : null}
        {children ? <div className="alert__text">{children}</div> : null}
        {action ? <div className="alert__action">{action}</div> : null}
      </div>
    </div>
  )
}
