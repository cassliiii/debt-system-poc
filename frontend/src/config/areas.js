export const AREAS = [
  {
    code: 'AREA1',
    dbName: 'BD_Area1',
    label: 'Área 1 — Fiscalización presencial (Sede Central)',
    shortLabel: 'Área 1',
  },
  {
    code: 'AREA2',
    dbName: 'BD_Area2',
    label: 'Área 2 — Fiscalización electrónica (Sede Norte)',
    shortLabel: 'Área 2',
  },
]

/**
 * Normaliza un código de área quitando el prefijo "BD_" y las mayúsculas.
 * @param {string} value
 * @returns {string}
 */
function normalizeAreaCode(value) {
  if (typeof value !== 'string') return ''
  return value.trim().replace(/^BD_/i, '').toUpperCase()
}

/**
 * Devuelve el área cuyo código coincide con el valor recibido.
 * Acepta "AREA1", "BD_Area1" o "area1" sin distinguir mayúsculas.
 * @param {string} value
 * @returns {{ code: string, dbName: string, label: string, shortLabel: string } | null}
 */
export function getAreaByCode(value) {
  const code = normalizeAreaCode(value)
  if (!code) return null
  return AREAS.find((area) => area.code === code) ?? null
}

/**
 * Devuelve la etiqueta del área o el propio valor si no existe.
 * @param {string} value
 * @returns {string}
 */
export function getAreaLabel(value) {
  const area = getAreaByCode(value)
  return area ? area.label : value
}
