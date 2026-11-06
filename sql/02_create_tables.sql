-- 1. Tabla que emula la BD del Área 1
CREATE TABLE IF NOT EXISTS `project-7af4968a-3e72-490a-be0.ds_sistema_deudas.BD_Area1` (
  dni STRING OPTIONS(description="DNI del ciudadano de 8 dígitos"),
  nombre STRING OPTIONS(description="Nombre completo del ciudadano"),
  monto_deuda NUMERIC OPTIONS(description="Monto adeudado"),
  concepto STRING OPTIONS(description="Concepto de la deuda"),
  fecha_carga TIMESTAMP OPTIONS(description="Fecha y hora de ingesta del registro")
);

-- 2. Tabla que emula la BD del Área 2
CREATE TABLE IF NOT EXISTS `project-7af4968a-3e72-490a-be0.ds_sistema_deudas.BD_Area2` (
  dni STRING OPTIONS(description="DNI del ciudadano de 8 dígitos"),
  nombre STRING OPTIONS(description="Nombre completo del ciudadano"),
  monto_deuda NUMERIC OPTIONS(description="Monto adeudado"),
  concepto STRING OPTIONS(description="Concepto de la deuda"),
  fecha_carga TIMESTAMP OPTIONS(description="Fecha y hora de ingesta del registro")
);
