import { MAX_UPLOAD_MB } from '../config/app.js'

/**
 * Valida que el DNI tenga exactamente 8 dígitos.
 * @param {string} value
 * @returns {boolean}
 */
export function isValidDni(value) {
  return /^\d{8}$/.test(String(value ?? ''))
}

/**
 * Devuelve el mensaje de error del DNI o una cadena vacía si es válido.
 * @param {string} value
 * @returns {string}
 */
export function dniErrorMessage(value) {
  return isValidDni(value) ? '' : 'El DNI debe tener 8 dígitos'
}

/**
 * Valida un archivo CSV antes de enviarlo.
 * @param {File | null | undefined} file
 * @returns {string[]}
 */
export function validateCsvFile(file) {
  if (!file) return ['Seleccione un archivo CSV.']

  const errors = []
  const name = file.name ?? ''

  if (!name.toLowerCase().endsWith('.csv')) {
    errors.push('El archivo debe tener extensión .csv.')
  }

  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
    errors.push(`El archivo no debe superar los ${MAX_UPLOAD_MB} MB.`)
  }

  if (file.size === 0) {
    errors.push('El archivo está vacío.')
  }

  return errors
}
