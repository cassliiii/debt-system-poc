export const INGESTA_ESTADOS = {
  EN_COLA: 'EN_COLA',
  EN_PROCESO: 'EN_PROCESO',
  COMPLETADO: 'COMPLETADO',
  FALLIDO: 'FALLIDO',
}

export const ESTADO_LABELS = {
  [INGESTA_ESTADOS.EN_COLA]: 'En cola',
  [INGESTA_ESTADOS.EN_PROCESO]: 'Procesando',
  [INGESTA_ESTADOS.COMPLETADO]: 'Completada',
  [INGESTA_ESTADOS.FALLIDO]: 'Fallida',
}

/**
 * Indica si el estado corresponde a una carga terminada.
 * @param {string} estado
 * @returns {boolean}
 */
export function isFinalEstado(estado) {
  return (
    estado === INGESTA_ESTADOS.COMPLETADO ||
    estado === INGESTA_ESTADOS.FALLIDO
  )
}
