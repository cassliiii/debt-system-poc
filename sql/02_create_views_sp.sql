-- Vista para consolidar y sumar las deudas de ambas áreas por ciudadano
CREATE OR REPLACE VIEW `ds_sistema_deudas.VW_Reporte_Deuda` AS
SELECT 
  dni,
  ANY_VALUE(nombre) AS nombre,
  SUM(monto_deuda) AS deuda_total,
  ARRAY_AGG(STRUCT(concepto, monto_deuda, fecha_carga)) AS detalle_deudas
FROM (
  SELECT dni, nombre, monto_deuda, concepto, fecha_carga FROM `ds_sistema_deudas.BD_Area1`
  UNION ALL
  SELECT dni, nombre, monto_deuda, concepto, fecha_carga FROM `ds_sistema_deudas.BD_Area2`
)
GROUP BY dni;