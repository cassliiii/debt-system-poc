export const AREAS = [
  {
    value: 'BD_Area1',
    label: 'Área 1 — Fiscalización presencial (Sede Central)',
  },
  {
    value: 'BD_Area2',
    label: 'Área 2 — Fiscalización electrónica (Sede Norte)',
  },
]

/**
 * Devuelve la etiqueta del área o el propio valor si no existe.
 * @param {string} value
 * @returns {string}
 */
export function getAreaLabel(value) {
  const area = AREAS.find((item) => item.value === value)
  return area ? area.label : value
}
