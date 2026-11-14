const moneyFormatter = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
})

const fileSizeFormatter = new Intl.NumberFormat('es-PE', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

/**
 * Formatea un importe en soles.
 * @param {number} value
 * @returns {string}
 */
export function formatMoney(value) {
  const amount = Number(value)
  return moneyFormatter.format(Number.isFinite(amount) ? amount : 0)
}

const pad = (value) => String(value).padStart(2, '0')

/**
 * Formatea una fecha ISO como dd/mm/aaaa.
 * @param {string} iso
 * @returns {string}
 */
export function formatDate(iso) {
  if (!iso) return ''

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (dateOnly) {
    return `${dateOnly[3]}/${dateOnly[2]}/${dateOnly[1]}`
  }

  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''

  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`
}

/**
 * Formatea una fecha ISO como dd/mm/aaaa HH:mm.
 * @param {string} iso
 * @returns {string}
 */
export function formatDateTime(iso) {
  if (!iso) return ''

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (dateOnly) {
    return `${dateOnly[3]}/${dateOnly[2]}/${dateOnly[1]} 00:00`
  }

  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''

  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/**
 * Formatea un tamaño en bytes como 'X KB' o 'X,X MB'.
 * @param {number} bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
  const size = Number(bytes)
  if (!Number.isFinite(size) || size <= 0) return '0 KB'

  const kilobytes = size / 1024
  if (kilobytes < 1024) {
    return `${Math.round(kilobytes)} KB`
  }

  return `${fileSizeFormatter.format(size / (1024 * 1024))} MB`
}
