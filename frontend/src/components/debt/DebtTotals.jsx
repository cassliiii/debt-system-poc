import { formatMoney } from '../../utils/format.js'
import './DebtTotals.css'

/**
 * Totales de la deuda consultada.
 * @param {object} props
 * @param {number} props.deudaBaseTotal
 * @param {number} props.interesTotal
 * @param {number} props.deudaTotal
 */
export function DebtTotals({
  deudaBaseTotal,
  interesTotal,
  deudaTotal,
}) {
  return (
    <dl className="debt-totals">
      <div className="debt-totals__row">
        <dt>Deuda base</dt>
        <dd className="num">{formatMoney(deudaBaseTotal)}</dd>
      </div>
      <div className="debt-totals__row">
        <dt>Intereses</dt>
        <dd className="num">{formatMoney(interesTotal)}</dd>
      </div>
      <div className="debt-totals__row debt-totals__row--total">
        <dt>Total a pagar</dt>
        <dd className="num">{formatMoney(deudaTotal)}</dd>
      </div>
    </dl>
  )
}
