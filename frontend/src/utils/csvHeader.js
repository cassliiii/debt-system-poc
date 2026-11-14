import { getRequiredColumns } from '../config/csvContract.js'

const HEADER_BYTES = 64 * 1024
const HEADER_ERROR = 'No se pudo leer la cabecera del archivo.'

/**
 * Separa una línea CSV por comas respetando comillas y comillas escapadas.
 * @param {string} line
 * @returns {string[]}
 */
function splitCsvLine(line) {
  const values = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current)
      current = ''
    } else {
      current += char
    }
  }

  values.push(current)
  return values
}

/**
 * Lee únicamente la cabecera del archivo, sin cargar su contenido completo.
 * @param {File} file
 * @returns {Promise<string[]>}
 */
export async function readCsvHeader(file) {
  const text = await file.slice(0, HEADER_BYTES).text()
  const newlineIndex = text.indexOf('\n')

  if (newlineIndex === -1) {
    throw new Error(HEADER_ERROR)
  }

  const firstLine = text
    .slice(0, newlineIndex)
    .replace(/^\uFEFF/, '')
    .replace(/\r$/, '')

  return splitCsvLine(firstLine).map((column) =>
    column.trim().toLowerCase(),
  )
}

/**
 * Devuelve las columnas obligatorias que faltan en la cabecera.
 * @param {string[]} header
 * @param {string} areaCode
 * @returns {string[]}
 */
export function findMissingColumns(header, areaCode) {
  const normalizedHeader = new Set(
    (header ?? []).map((column) => String(column).trim().toLowerCase()),
  )

  return getRequiredColumns(areaCode).filter(
    (column) => !normalizedHeader.has(column),
  )
}
