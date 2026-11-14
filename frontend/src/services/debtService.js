import { USE_MOCK } from '../config/app.js'
import { request } from './apiClient.js'
import {
  getDebtByDni as getDebtByDniMock,
  uploadCsv as uploadCsvMock,
} from './mock/debtMock.js'

/**
 * @typedef {object} DebtDetailItem
 * @property {string} area
 * @property {string} numPapeleta
 * @property {string} tipoMonto
 * @property {string} concepto
 * @property {number} monto
 * @property {string} [estado]
 * @property {string} [fechaVencimiento]
 */

/**
 * @typedef {object} DebtConsultation
 * @property {string} dni
 * @property {string} nombre
 * @property {number} deudaBaseTotal
 * @property {number} interesTotal
 * @property {number} deudaTotal
 * @property {string} [fechaActualizacion]
 * @property {DebtDetailItem[]} detalle
 */

/**
 * Transforma la respuesta del backend al modelo de la interfaz.
 * @param {object} apiData
 * @param {string} apiData.dni
 * @param {string} apiData.nombre
 * @param {number} apiData.deuda_base_total
 * @param {number} apiData.interes_total
 * @param {number} apiData.deuda_total
 * @param {string} [apiData.fecha_actualizacion]
 * @param {Array<object>} [apiData.detalle]
 * @returns {DebtConsultation}
 */
export function adaptConsulta(apiData) {
  const detalle = Array.isArray(apiData?.detalle) ? apiData.detalle : []

  return {
    dni: apiData?.dni,
    nombre: apiData?.nombre,
    deudaBaseTotal: apiData?.deuda_base_total,
    interesTotal: apiData?.interes_total,
    deudaTotal: apiData?.deuda_total,
    fechaActualizacion: apiData?.fecha_actualizacion,
    detalle: detalle.map((item) => ({
      area: item.area,
      numPapeleta: item.num_papeleta,
      tipoMonto: item.tipo_monto,
      concepto: item.concepto,
      monto: item.monto,
      estado: item.estado,
      fechaVencimiento: item.fecha_vencimiento,
    })),
  }
}

/**
 * Consulta las deudas de un DNI.
 * @param {string} dni
 * @returns {Promise<DebtConsultation>}
 */
export async function getDebtByDni(dni) {
  if (USE_MOCK) {
    const result = await getDebtByDniMock(dni)
    return result.data
  }

  const response = await request(`/api/debt/consulta/${encodeURIComponent(dni)}`)
  return adaptConsulta(response.data)
}

/**
 * Sube un archivo CSV para un área.
 * @param {{ area: string, file: File }} params
 * @returns {Promise<{ success: boolean, message: string, totalRegistros: number }>}
 */
export async function uploadCsv({ area, file }) {
  if (USE_MOCK) {
    return uploadCsvMock({ area, file })
  }

  const formData = new FormData()
  formData.append('area', area)
  formData.append('file', file)

  return request('/api/debt/upload', {
    method: 'POST',
    body: formData,
  })
}
