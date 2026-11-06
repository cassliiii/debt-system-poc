-- Creación del Dataset (Asegúrate de reemplazar con el nombre de tu proyecto y dataset real)
-- CREATE SCHEMA IF NOT EXISTS `tu-proyecto-gcp.ds_sistema_deudas` OPTIONS(location='US');

-- Tabla Base del Área 1
CREATE TABLE IF NOT EXISTS `ds_sistema_deudas.BD_Area1` (
  dni STRING OPTIONS(description="DNI del ciudadano de 8 dígitos"),
  nombre STRING OPTIONS(description="Nombre completo del ciudadano"),
  monto_deuda NUMERIC OPTIONS(description="Monto adeudado"),
  concepto STRING OPTIONS(description="Concepto de la deuda"),
  fecha_carga TIMESTAMP OPTIONS(description="Fecha y hora de ingesta del registro")
);

-- Tabla Base del Área 2
CREATE TABLE IF NOT EXISTS `ds_sistema_deudas.BD_Area2` (
  dni STRING OPTIONS(description="DNI del ciudadano de 8 dígitos"),
  nombre STRING OPTIONS(description="Nombre completo del ciudadano"),
  monto_deuda NUMERIC OPTIONS(description="Monto adeudado"),
  concepto STRING OPTIONS(description="Concepto de la deuda"),
  fecha_carga TIMESTAMP OPTIONS(description="Fecha y hora de ingesta del registro")
);