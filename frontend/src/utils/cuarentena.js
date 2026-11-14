export const COLUMN_ALIASES = {
  fila: ['fila', 'linea', 'numero_fila', 'fila_origen'],
  documento: ['nro_documento', 'documento', 'dni'],
  papeleta: ['num_papeleta', 'papeleta'],
  origen: ['origen', 'tipo_error'],
  motivo: ['motivo', 'motivo_rechazo', 'error', 'detalle'],
}

const FIELDS = Object.keys(COLUMN_ALIASES)

/**
 * @param {unknown} value
 * @returns {string}
 */
function normalizeHeader(value) {
  return String(value ?? '')
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
}

/**
 * @param {{ header?: string[], rows?: string[][] } | null | undefined} parsed
 * @returns {{
 *   rows: Array<{
 *     fila: string,
 *     documento: string,
 *     papeleta: string,
 *     origen: string,
 *     motivo: string
 *   }>,
 *   recognized: string[]
 * }}
 */
export function mapCuarentena(parsed) {
  const header = parsed?.header ?? []
  const sourceRows = parsed?.rows ?? []
  const indexes = {}
  const recognized = []

  for (const field of FIELDS) {
    const aliases = COLUMN_ALIASES[field].map(normalizeHeader)
    const index = header.findIndex((column) =>
      aliases.includes(normalizeHeader(column)),
    )

    if (index !== -1) {
      indexes[field] = index
      recognized.push(field)
    }
  }

  if (recognized.length === 0) {
    return { rows: [], recognized: [] }
  }

  const rows = sourceRows.map((row) => {
    const mapped = {}

    for (const field of FIELDS) {
      const index = indexes[field]
      mapped[field] = index === undefined ? '' : (row[index] ?? '')
    }

    return mapped
  })

  return { rows, recognized }
}
