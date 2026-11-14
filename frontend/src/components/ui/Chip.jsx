import './Chip.css'

const VARIANT_CLASS = {
  base: 'base',
  interes: 'interes',
  vigente: 'vigente',
  porVencer: 'por-vencer',
  vencida: 'vencida',
  coactiva: 'coactiva',
}

/**
 * Etiqueta de estado o tipo de monto.
 * @param {object} props
 * @param {'base' | 'interes' | 'vigente' | 'porVencer' | 'vencida' | 'coactiva'} [props.variant]
 * @param {import('react').ReactNode} [props.icon]
 * @param {import('react').ReactNode} props.children
 */
export function Chip({ variant = 'base', icon, children }) {
  const variantClass = VARIANT_CLASS[variant] ?? VARIANT_CLASS.base

  return (
    <span className={`chip chip--${variantClass}`}>
      {icon ? (
        <span className="chip__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {children}
    </span>
  )
}
