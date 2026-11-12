-- ============================================================
-- Inserts de ejemplo para area2.deudas (PostgreSQL 16)
-- Antes, crea el esquema y la tabla con el script anterior.
-- ============================================================

INSERT INTO area2.deudas (
  nro_documento, nombre, tipo_documento, num_papeleta, placa_vehiculo,
  codigo_infraccion, calificacion_infraccion, puntos_infraccion,
  fecha_infraccion, hora_infraccion,
  codigo_distrito, direccion_infraccion, sede,
  modalidad_deteccion, tipo_equipo, codigo_equipo,
  codigo_certificacion, fecha_certificacion,
  fecha_emision, fecha_notificacion, medio_notificacion, fecha_vencimiento,
  monto_base, porcentaje_descuento, monto_descuento, monto_interes,
  estado_deuda, numero_resolucion, codigo_operador, fecha_carga
) VALUES
(
  '90164974', 'EMILIA PONCE MORALES', 'DNI', 'A2-NOR-000000039', 'PZF-281',
  'SIM-003', 'GRAVE', 20,
  '2026-06-06', '06:15:17',
  'DIST-025', 'AV. PANAMERICANA NORTE, CUADRA 56', 'SEDE NORTE',
  'ELECTRONICA', 'CAMARA_FISCALIZACION', 'EQ-NOR-0060',
  'CERT-SIM-NOR-0060-2023', '2023-12-15',
  '2026-06-06', '2026-06-17', 'FISICA', '2026-07-17',
  250.00, 0.00, 0.00, 0.00,
  'PAGADA', 'RES-A2-000000039', 'OPER-NOR-005', '2026-11-08 22:00:00'
),
(
  '90194506', 'LUCIA MANUEL RAMIREZ CUEVA', 'DNI', 'A2-NOR-000000040', 'CXM-838',
  'SIM-001', 'LEVE', 5,
  '2026-08-25', '00:05:07',
  'DIST-016', 'AV. TOMAS VALLE, CUADRA 38', 'SEDE NORTE',
  'ELECTRONICA', 'CAMARA_SEMAFORO', 'EQ-NOR-0068',
  'CERT-SIM-NOR-0068-2023', '2023-12-15',
  '2026-08-26', '2026-08-29', 'ELECTRONICA', '2026-09-28',
  100.00, 0.00, 0.00, 0.00,
  'PAGADA', 'RES-A2-000000040', 'OPER-NOR-007', '2026-11-08 22:00:00'
);