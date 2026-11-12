INSERT INTO area1.deudas (
  codigo_interno_area, nro_documento, nombre, num_papeleta, tipo_documento,
  placa_vehiculo, marca_vehiculo, modelo_vehiculo,
  codigo_infraccion, calificacion_infraccion, puntos_infraccion,
  fecha_infraccion, hora_infraccion,
  codigo_distrito, direccion_infraccion, modalidad_deteccion, codigo_fiscalizador,
  dni_conductor, numero_licencia,
  fecha_emision, fecha_notificacion, medio_notificacion, fecha_vencimiento,
  monto_base, porcentaje_descuento, monto_descuento, monto_interes,
  estado_deuda, numero_resolucion, fecha_carga
) VALUES
(
  'A1-000499999', '10299998', 'GABRIELA NAVARRO SOTO', 'A1-000499999', 'DNI',
  'MMX-822', 'NISSAN', 'MARCH',
  'SIM-004', 'GRAVE', 30,
  DATE '2018-05-14', '18:04:00',
  'DIST-002', 'AV. AREQUIPA, CUADRA 1929', 'PRESENCIAL', 'FISC-0195',
  '10299998', 'Q10499998',
  DATE '2018-05-14', DATE '2018-05-26', 'ELECTRONICA', DATE '2018-06-25',
  350.0, 0.0, 0.0, 175.0,
  'PENDIENTE', 'RES-A1-000499999', TIMESTAMP '2026-11-08 22:00:00'
),
(
  'A1-000500000', '10299999', 'PABLO CASTRO AGUILAR', 'A1-000500000', 'DNI',
  'FBN-263', 'SUZUKI', 'ALTO',
  'SIM-001', 'LEVE', 5,
  DATE '2020-04-04', '22:31:00',
  'DIST-042', 'AV. BRASIL, CUADRA 2056', 'PRESENCIAL', 'FISC-0036',
  '10299999', 'Q10499999',
  DATE '2020-04-05', DATE '2020-04-16', 'ELECTRONICA', DATE '2020-05-16',
  100.0, 0.0, 0.0, 0.0,
  'PAGADA', 'RES-A1-000500000', TIMESTAMP '2026-11-08 22:00:00'
);

COMMIT;