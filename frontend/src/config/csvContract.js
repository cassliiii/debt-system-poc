import { getAreaByCode } from './areas.js'

const REQUIRED_COLUMNS = [
  'nro_documento',
  'nombre',
  'num_papeleta',
  'tipo_documento',
  'placa_vehiculo',
  'codigo_infraccion',
  'calificacion_infraccion',
  'puntos_infraccion',
  'fecha_infraccion',
  'hora_infraccion',
  'codigo_distrito',
  'direccion_infraccion',
  'modalidad_deteccion',
  'fecha_emision',
  'fecha_notificacion',
  'medio_notificacion',
  'fecha_vencimiento',
  'monto_base',
  'porcentaje_descuento',
  'monto_descuento',
  'monto_interes',
  'estado_deuda',
  'numero_resolucion',
]

const OPTIONAL_COLUMNS = {
  AREA1: [
    'codigo_interno_area',
    'marca_vehiculo',
    'modelo_vehiculo',
    'codigo_fiscalizador',
    'dni_conductor',
    'numero_licencia',
    'fecha_carga',
  ],
  AREA2: [
    'sede',
    'tipo_equipo',
    'codigo_equipo',
    'codigo_certificacion',
    'fecha_certificacion',
    'codigo_operador',
    'fecha_carga',
  ],
}

export const CSV_CONTRACT = {
  AREA1: {
    required: REQUIRED_COLUMNS,
    optional: OPTIONAL_COLUMNS.AREA1,
  },
  AREA2: {
    required: REQUIRED_COLUMNS,
    optional: OPTIONAL_COLUMNS.AREA2,
  },
}

/**
 * Devuelve las columnas obligatorias del área o una lista vacía si no existe.
 * @param {string} areaCode
 * @returns {string[]}
 */
export function getRequiredColumns(areaCode) {
  const area = getAreaByCode(areaCode)
  return area ? CSV_CONTRACT[area.code].required : []
}
