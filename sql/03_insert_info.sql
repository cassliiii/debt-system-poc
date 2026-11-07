-- Datos de ejemplo v2: cada papeleta (num_papeleta) puede tener una fila BASE
-- y, si ya acumuló recargo, una fila INTERES adicional con el mismo num_papeleta.
-- DNIs 10000001 y 10000002 tienen papeletas en AMBAS áreas (para el Caso 3 de la demo:
-- consolidación cruzada). El resto tiene papeletas en una sola área.

-- Área de Tránsito, Sede Central (BD_Area1)
INSERT INTO `{{GCP_PROJECT_ID}}.ds_sistema_deudas.BD_Area1`
  (dni, nombre, num_papeleta, tipo_monto, monto, concepto, fecha_carga)
VALUES
  ('10000001', 'Juan Perez Ramirez',     'P1-001', 'BASE',    150.50, 'Exceso de velocidad',        TIMESTAMP '2026-10-20 09:15:00'),
  ('10000001', 'Juan Perez Ramirez',     'P1-001', 'INTERES',  15.05, 'Interés acumulado',          TIMESTAMP '2026-10-20 09:15:00'),
  ('10000002', 'Maria Lopez Quispe',     'P1-002', 'BASE',    320.00, 'Estacionamiento indebido',   TIMESTAMP '2026-10-20 09:20:00'),
  ('10000002', 'Maria Lopez Quispe',     'P1-002', 'INTERES',  32.00, 'Interés acumulado',          TIMESTAMP '2026-10-20 09:20:00'),
  ('10000003', 'Carlos Rios Mendoza',    'P1-003', 'BASE',     85.00, 'No uso de cinturón',         TIMESTAMP '2026-10-20 09:25:00'),
  ('10000004', 'Ana Torres Salazar',     'P1-004', 'BASE',    210.75, 'Uso de celular al conducir', TIMESTAMP '2026-10-21 11:00:00'),
  ('10000005', 'Luis Fernandez Diaz',    'P1-005', 'BASE',     95.00, 'Semáforo en rojo',           TIMESTAMP '2026-10-21 11:05:00'),
  ('10000006', 'Patricia Vega Castro',   'P1-006', 'BASE',    180.00, 'Exceso de velocidad',        TIMESTAMP '2026-10-21 11:10:00');

-- Área de Tránsito, Sede Norte (BD_Area2)
INSERT INTO `{{GCP_PROJECT_ID}}.ds_sistema_deudas.BD_Area2`
  (dni, nombre, num_papeleta, tipo_monto, monto, concepto, fecha_carga)
VALUES
  ('10000001', 'Juan Perez Ramirez',     'P2-001', 'BASE',    130.00, 'Estacionamiento indebido',   TIMESTAMP '2026-10-22 08:00:00'),
  ('10000001', 'Juan Perez Ramirez',     'P2-001', 'INTERES',  13.00, 'Interés acumulado',          TIMESTAMP '2026-10-22 08:00:00'),
  ('10000002', 'Maria Lopez Quispe',     'P2-002', 'BASE',     60.00, 'No uso de cinturón',         TIMESTAMP '2026-10-22 08:05:00'),
  ('10000007', 'Jorge Salinas Huaman',   'P2-003', 'BASE',    275.00, 'Exceso de velocidad',        TIMESTAMP '2026-10-22 08:15:00'),
  ('10000007', 'Jorge Salinas Huaman',   'P2-003', 'INTERES',  27.50, 'Interés acumulado',          TIMESTAMP '2026-10-22 08:15:00'),
  ('10000008', 'Rosa Campos Ninahuanca', 'P2-004', 'BASE',     95.00, 'Semáforo en rojo',           TIMESTAMP '2026-10-22 08:20:00'),
  ('10000009', 'Miguel Castillo Rojas',  'P2-005', 'BASE',    150.00, 'Uso de celular al conducir', TIMESTAMP '2026-10-22 08:25:00'),
  ('10000009', 'Miguel Castillo Rojas',  'P2-005', 'INTERES',  15.00, 'Interés acumulado',          TIMESTAMP '2026-10-22 08:25:00');
