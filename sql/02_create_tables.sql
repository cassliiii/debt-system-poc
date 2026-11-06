-- Esquema v2: separa deuda BASE de INTERES por fila (fiel al problema de negocio)
-- y agrega num_papeleta para trazabilidad y evitar doble conteo por re-carga.
-- Usamos CREATE OR REPLACE porque cambia el esquema respecto a la versión anterior.

-- 1. Tabla que emula la BD del Área 1 (Sede Central)
CREATE OR REPLACE TABLE `project-7af4968a-3e72-490a-be0.ds_sistema_deudas.BD_Area1` (
  dni          STRING    OPTIONS(description="DNI del ciudadano de 8 dígitos"),
  nombre       STRING    OPTIONS(description="Nombre completo del ciudadano"),
  num_papeleta STRING    OPTIONS(description="Identificador único de la infracción/deuda (trazabilidad, evita doble conteo)"),
  tipo_monto   STRING    OPTIONS(description="Tipo de monto: BASE (deuda original) o INTERES (recargo acumulado)"),
  monto        NUMERIC   OPTIONS(description="Monto correspondiente al tipo_monto indicado"),
  concepto     STRING    OPTIONS(description="Concepto de la deuda"),
  fecha_carga  TIMESTAMP OPTIONS(description="Fecha y hora de ingesta del registro")
)
PARTITION BY DATE(fecha_carga);

-- 2. Tabla que emula la BD del Área 2 (Sede Norte)
CREATE OR REPLACE TABLE `project-7af4968a-3e72-490a-be0.ds_sistema_deudas.BD_Area2` (
  dni          STRING    OPTIONS(description="DNI del ciudadano de 8 dígitos"),
  nombre       STRING    OPTIONS(description="Nombre completo del ciudadano"),
  num_papeleta STRING    OPTIONS(description="Identificador único de la infracción/deuda (trazabilidad, evita doble conteo)"),
  tipo_monto   STRING    OPTIONS(description="Tipo de monto: BASE (deuda original) o INTERES (recargo acumulado)"),
  monto        NUMERIC   OPTIONS(description="Monto correspondiente al tipo_monto indicado"),
  concepto     STRING    OPTIONS(description="Concepto de la deuda"),
  fecha_carga  TIMESTAMP OPTIONS(description="Fecha y hora de ingesta del registro")
)
PARTITION BY DATE(fecha_carga);
