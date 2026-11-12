--------------------------------------------------------
-- CREATE TABLE: area2.deudas
-- Base de datos: PostgreSQL 16 (Area2)
-- Fuentes: BD_Area2.csv (todas las columnas)
-- Propósito: Almacenar los datos de deudas del área 2
-- Nota: Se mantienen TODAS las columnas del CSV sin discriminar
--------------------------------------------------------

CREATE SCHEMA area2;

CREATE TABLE area2.deudas (
  nro_documento                 TEXT,
  nombre                        TEXT,
  tipo_documento                TEXT,
  num_papeleta                  TEXT,
  placa_vehiculo                VARCHAR(20),
  codigo_infraccion             VARCHAR(20),
  calificacion_infraccion       VARCHAR(30),
  puntos_infraccion             INTEGER,
  fecha_infraccion              DATE,
  hora_infraccion               VARCHAR(10),
  codigo_distrito               VARCHAR(20),
  direccion_infraccion          VARCHAR(200),
  sede                          VARCHAR(100),
  modalidad_deteccion           VARCHAR(30),
  tipo_equipo                   VARCHAR(30),
  codigo_equipo                 VARCHAR(30),
  codigo_certificacion          VARCHAR(50),
  fecha_certificacion           DATE,
  fecha_emision                 DATE,
  fecha_notificacion            DATE,
  medio_notificacion            VARCHAR(20),
  fecha_vencimiento             DATE,
  monto_base                    NUMERIC(15,2),
  porcentaje_descuento          NUMERIC(5,2),
  monto_descuento               NUMERIC(15,2),
  monto_interes                 NUMERIC(15,2),
  estado_deuda                  VARCHAR(30),
  numero_resolucion             VARCHAR(50),
  codigo_operador               VARCHAR(30),
  fecha_carga                   TIMESTAMP
);

--------------------------------------------------------
-- CREATE INDEXS (opcionales para POC)
-- --------------------------------------------------------
-- Índice sobre nro_documento para búsquedas por DNI
--------------------------------------------------------
CREATE INDEX idx_area2_deudas_nrodoc ON area2.deudas (nro_documento);

-- Índice sobre num_papeleta para búsquedas de papeleta
--------------------------------------------------------
CREATE INDEX idx_area2_deudas_papeleta ON area2.deudas (num_papeleta);

-- Índice sobre estado_deuda para reportes
--------------------------------------------------------
CREATE INDEX idx_area2_deudas_estado ON area2.deudas (estado_deuda);