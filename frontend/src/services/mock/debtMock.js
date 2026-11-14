import { AREAS } from '../../config/areas.js'
import { REQUIRED_COLUMNS } from '../../config/csvContract.js'
import { isValidDni } from '../../utils/validators.js'
import { adaptConsulta } from '../debtService.js'
import { ApiError } from '../errors.js'
import { DEBTS } from './mockData.js'

const wait = (milliseconds) =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })

const randomDelay = () => 600 + Math.floor(Math.random() * 301)

/**
 * Consulta simulada de deudas.
 * @param {string} dni
 * @returns {Promise<{ success: boolean, data: import('../debtService.js').DebtConsultation }>}
 */
export async function getDebtByDni(dni) {
  await wait(randomDelay())

  if (!isValidDni(dni)) {
    throw new ApiError(400, 'El DNI debe tener 8 dígitos')
  }

  if (dni === '99999999') {
    throw new ApiError(
      500,
      'Ocurrió un error al consultar la deuda. Intente nuevamente.',
    )
  }

  const deuda = DEBTS[dni]
  if (!deuda) {
    throw new ApiError(404, 'No se encontraron deudas para el DNI ingresado.')
  }

  const deudaBaseTotal = deuda.detalle
    .filter((item) => item.tipo_monto === 'BASE')
    .reduce((total, item) => total + item.monto, 0)

  const interesTotal = deuda.detalle
    .filter((item) => item.tipo_monto === 'INTERES')
    .reduce((total, item) => total + item.monto, 0)

  const data = {
    dni: deuda.dni,
    nombre: deuda.nombre,
    deuda_base_total: deudaBaseTotal,
    interes_total: interesTotal,
    deuda_total: deudaBaseTotal + interesTotal,
    detalle: deuda.detalle,
  }

  return { success: true, data: adaptConsulta(data) }
}

/**
 * Carga simulada de un archivo CSV.
 * @param {{ area: string, file: File }} params
 * @returns {Promise<{ success: boolean, message: string, totalRegistros: number }>}
 */
export async function uploadCsv({ area, file }) {
  if (!AREAS.some((item) => item.value === area)) {
    throw new ApiError(400, 'El área seleccionada no es válida.')
  }

  if (!file || typeof file.text !== 'function') {
    throw new ApiError(400, 'Seleccione un archivo CSV.')
  }

  const text = await file.text()
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '')

  if (lines.length === 0) {
    throw new ApiError(400, 'El archivo está vacío.')
  }

  const headers = lines[0]
    .split(',')
    .map((header) => header.trim().replace(/^"|"$/g, ''))
  const normalizedHeaders = headers.map((header) => header.toLowerCase())

  const missingColumns = REQUIRED_COLUMNS.filter(
    (column) => !normalizedHeaders.includes(column),
  )

  if (missingColumns.length > 0) {
    throw new ApiError(
      400,
      `El archivo no contiene las columnas obligatorias: ${missingColumns.join(', ')}.`,
      {
        errors: missingColumns.map(
          (column) => `Falta la columna obligatoria "${column}".`,
        ),
        details: { columnasEncontradas: headers },
      },
    )
  }

  const dataRows = lines.slice(1)
  if (dataRows.length === 0) {
    throw new ApiError(400, 'El archivo solo contiene la cabecera.')
  }

  if ((file.name ?? '').toLowerCase().includes('errores')) {
    throw new ApiError(
      400,
      'El archivo contiene filas con errores de validación.',
      {
        errors: [
          'Fila 3: el DNI debe tener 8 dígitos',
          'Fila 7: el monto no es numérico',
          'Fila 9: tipo_monto debe ser BASE o INTERES',
        ],
      },
    )
  }

  const totalRegistros = dataRows.length

  return {
    success: true,
    message: `Se procesaron ${totalRegistros} registros correctamente.`,
    totalRegistros,
  }
}
