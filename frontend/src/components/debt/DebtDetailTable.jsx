import { DataTable } from '../ui/DataTable.jsx'
import { Chip } from '../ui/Chip.jsx'
import { getAreaLabel } from '../../config/areas.js'
import { formatDate, formatMoney } from '../../utils/format.js'
import './DebtDetailTable.css'

const ESTADO_VARIANTS = {
  vigente: 'vigente',
  por_vencer: 'porVencer',
  porvencer: 'porVencer',
  vencida: 'vencida',
  coactiva: 'coactiva',
  en_cobranza_coactiva: 'coactiva',
}

const getEstadoVariant = (estado) => {
  const normalized = String(estado ?? '')
    .toLowerCase()
    .replace(/\s+/g, '_')
  return ESTADO_VARIANTS[normalized] ?? 'base'
}

/**
 * Detalle de deuda por papeleta.
 * @param {object} props
 * @param {import('../../services/debtService.js').DebtDetailItem[]} [props.detalle]
 */
export function DebtDetailTable({ detalle = [] }) {
  const hasEstado = detalle.some((item) => Boolean(item.estado))
  const hasFechaVencimiento = detalle.some((item) =>
    Boolean(item.fechaVencimiento),
  )

  const columns = [
    {
      key: 'area',
      header: 'Área',
      render: (row) => getAreaLabel(row.area),
    },
    { key: 'numPapeleta', header: 'N.º de papeleta' },
    {
      key: 'tipoMonto',
      header: 'Tipo',
      render: (row) => {
        const isInteres =
          String(row.tipoMonto ?? '').toUpperCase() === 'INTERES'
        return (
          <Chip variant={isInteres ? 'interes' : 'base'}>
            {isInteres ? 'Interés' : 'Base'}
          </Chip>
        )
      },
    },
    { key: 'concepto', header: 'Concepto' },
    ...(hasEstado
      ? [
          {
            key: 'estado',
            header: 'Estado',
            render: (row) => (
              <Chip variant={getEstadoVariant(row.estado)}>
                {row.estado}
              </Chip>
            ),
          },
        ]
      : []),
    ...(hasFechaVencimiento
      ? [
          {
            key: 'fechaVencimiento',
            header: 'Vence',
            render: (row) => formatDate(row.fechaVencimiento),
          },
        ]
      : []),
    {
      key: 'monto',
      header: 'Monto',
      align: 'right',
      render: (row) => formatMoney(row.monto),
    },
  ]

  return (
    <div className="debt-detail">
      <DataTable
        caption="Detalle de deuda por papeleta"
        columns={columns}
        rows={detalle}
        getRowKey={(row, index) =>
          `${row.area}-${row.numPapeleta}-${row.tipoMonto}-${index}`
        }
        emptyMessage="No hay deudas registradas para este DNI."
      />
    </div>
  )
}
