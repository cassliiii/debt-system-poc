import './IngestaSummary.css'

const numberFormatter = new Intl.NumberFormat('es-PE')

function formatNumber(value) {
  const number = Number(value)
  return numberFormatter.format(Number.isFinite(number) ? number : 0)
}

/**
 * Resumen de contadores de una ingesta.
 * @param {object} props
 * @param {{
 *   totalRegistros: number,
 *   insertados: number,
 *   rechazados: number
 * } | null} props.job
 */
export function IngestaSummary({ job }) {
  return (
    <dl className="ingesta-summary">
      <div>
        <dt>Registros en el archivo</dt>
        <dd className="num">{formatNumber(job?.totalRegistros)}</dd>
      </div>
      <div>
        <dt>Insertados</dt>
        <dd className="num">{formatNumber(job?.insertados)}</dd>
      </div>
      <div>
        <dt>Rechazados</dt>
        <dd className="num">{formatNumber(job?.rechazados)}</dd>
      </div>
    </dl>
  )
}
