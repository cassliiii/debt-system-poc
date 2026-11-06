-- Datos de ejemplo: Área de Tránsito, Sede Central (BD_Area1)
INSERT INTO `project-7af4968a-3e72-490a-be0.ds_sistema_deudas.BD_Area1`
  (dni, nombre, monto_deuda, concepto, fecha_carga)
VALUES
  ('10000001', 'Juan Perez Ramirez',    150.50, 'Papeleta - Exceso de velocidad',        TIMESTAMP '2026-10-20 09:15:00'),
  ('10000002', 'Maria Lopez Quispe',    320.00, 'Papeleta - Estacionamiento indebido',   TIMESTAMP '2026-10-20 09:20:00'),
  ('10000003', 'Carlos Rios Mendoza',    85.00, 'Papeleta - No uso de cinturón',         TIMESTAMP '2026-10-20 09:25:00'),
  ('10000004', 'Ana Torres Salazar',    210.75, 'Papeleta - Uso de celular al conducir', TIMESTAMP '2026-10-21 11:00:00'),
  ('10000005', 'Luis Fernandez Diaz',    95.00, 'Papeleta - Semáforo en rojo',           TIMESTAMP '2026-10-21 11:05:00'),
  ('10000006', 'Patricia Vega Castro',  180.00, 'Papeleta - Exceso de velocidad',        TIMESTAMP '2026-10-21 11:10:00');

-- Datos de ejemplo: Área de Tránsito, Sede Norte (BD_Area2)
INSERT INTO `project-7af4968a-3e72-490a-be0.ds_sistema_deudas.BD_Area2`
  (dni, nombre, monto_deuda, concepto, fecha_carga)
VALUES
  ('10000001', 'Juan Perez Ramirez',     45.15, 'Interés acumulado',                   TIMESTAMP '2026-10-22 08:00:00'),
  ('10000002', 'Maria Lopez Quispe',     96.00, 'Interés acumulado',                   TIMESTAMP '2026-10-22 08:05:00'),
  ('10000003', 'Carlos Rios Mendoza',    25.50, 'Interés acumulado',                   TIMESTAMP '2026-10-22 08:10:00'),
  ('10000007', 'Jorge Salinas Huaman',  130.00, 'Papeleta - Estacionamiento indebido',  TIMESTAMP '2026-10-22 08:15:00'),
  ('10000008', 'Rosa Campos Ninahuanca', 60.00, 'Papeleta - No uso de cinturón',        TIMESTAMP '2026-10-22 08:20:00'),
  ('10000009', 'Miguel Castillo Rojas', 275.00, 'Papeleta - Exceso de velocidad',       TIMESTAMP '2026-10-22 08:25:00');
