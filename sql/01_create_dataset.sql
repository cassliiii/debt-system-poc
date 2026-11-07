-- Crear el dataset (una sola vez)
CREATE SCHEMA IF NOT EXISTS `{{GCP_PROJECT_ID}}.ds_sistema_deudas`
OPTIONS(location = 'US');
