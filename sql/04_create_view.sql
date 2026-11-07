-- Vista de consolidación: suma deuda BASE + INTERES por DNI, entre todas las áreas
-- (hoy 2, escalable a 10 agregando un UNION ALL más por cada área nueva).
-- Expone deuda_base_total / interes_total por separado, y el detalle incluye
-- el área de origen de cada fila para trazabilidad ante el ciudadano/operador.

CREATE OR REPLACE VIEW `project-7af4968a-3e72-490a-be0.ds_sistema_deudas.VW_Reporte_Deuda` AS
SELECT
  dni,
  ANY_VALUE(nombre) AS nombre,
  SUM(IF(tipo_monto = 'BASE', monto, 0)) AS deuda_base_total,
  SUM(IF(tipo_monto = 'INTERES', monto, 0)) AS interes_total,
  SUM(monto) AS deuda_total,
  ARRAY_AGG(
    STRUCT(area, num_papeleta, tipo_monto, concepto, monto, fecha_carga)
    ORDER BY num_papeleta, tipo_monto
  ) AS detalle
FROM (
  SELECT 'BD_Area1' AS area, dni, nombre, num_papeleta, tipo_monto, monto, concepto, fecha_carga
  FROM `project-7af4968a-3e72-490a-be0.ds_sistema_deudas.BD_Area1`
  UNION ALL
  SELECT 'BD_Area2' AS area, dni, nombre, num_papeleta, tipo_monto, monto, concepto, fecha_carga
  FROM `project-7af4968a-3e72-490a-be0.ds_sistema_deudas.BD_Area2`
)
GROUP BY dni;
