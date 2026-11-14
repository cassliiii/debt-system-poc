const PATTERNS = [
  {
    pattern: /ORA-12899|value too long|too large/i,
    message: 'Un valor excede la longitud máxima permitida de la columna.',
  },
  {
    pattern: /ORA-00001|unique constraint|duplicate key/i,
    message: 'Ya existe un registro con la misma llave.',
  },
  {
    pattern:
      /ORA-01722|invalid number|invalid input syntax for (type )?(numeric|integer)/i,
    message: 'Un valor numérico no es válido.',
  },
]

/**
 * Traduce errores técnicos de base de datos a un mensaje comprensible.
 * @param {string} texto
 * @returns {string}
 */
export function humanizeMotivo(texto) {
  const original = String(texto ?? '')

  for (const { pattern, message } of PATTERNS) {
    if (pattern.test(original)) return message
  }

  return original
}
