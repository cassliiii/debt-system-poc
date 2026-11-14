-- ============================================================
-- Area1: usuario y tabla de deudas (Oracle Free lite)
-- Conexión: FREEPDB1 como SYSTEM. Ejecutar con Alt+X.
-- ============================================================

-- 1. Usuario/esquema AREA1 (usa los tablespaces por defecto del PDB,
--    porque la imagen lite no trae el tablespace USERS)
CREATE USER AREA1 IDENTIFIED BY Area1Poc2024;

-- 2. Permisos: conectarse, crear tablas y usar espacio sin cuota
GRANT CREATE SESSION, CREATE TABLE, UNLIMITED TABLESPACE TO AREA1;

-- 3. Tabla principal de deudas
CREATE TABLE area1.deudas (

  -- Identificación del deudor y la papeleta
  codigo_interno_area      VARCHAR2(50),
  nro_documento            VARCHAR2(20),
  nombre                   VARCHAR2(150),
  num_papeleta             VARCHAR2(50),
  tipo_documento           VARCHAR2(20),

  -- Datos del vehículo
  placa_vehiculo           VARCHAR2(20),
  marca_vehiculo           VARCHAR2(50),
  modelo_vehiculo          VARCHAR2(20),

  -- Datos de la infracción
  codigo_infraccion        VARCHAR2(20),
  calificacion_infraccion  VARCHAR2(30),
  puntos_infraccion        NUMBER(3),
  fecha_infraccion         DATE,
  hora_infraccion          VARCHAR2(10),   -- texto (ej. '14:30'), DATE no guarda hora sola

  -- Ubicación y fiscalización
  codigo_distrito          VARCHAR2(20),
  direccion_infraccion     VARCHAR2(200),
  modalidad_deteccion      VARCHAR2(30),
  codigo_fiscalizador      VARCHAR2(20),

  -- Datos del conductor
  dni_conductor            VARCHAR2(20),
  numero_licencia          VARCHAR2(30),

  -- Emisión, notificación y vencimiento
  fecha_emision            DATE,
  fecha_notificacion       DATE,
  medio_notificacion       VARCHAR2(20),
  fecha_vencimiento        DATE,

  -- Montos (15 dígitos en total, 2 decimales)
  monto_base               NUMBER(15,2),
  porcentaje_descuento     NUMBER(5,2),
  monto_descuento          NUMBER(15,2),
  monto_interes            NUMBER(15,2),

  -- Estado y resolución
  estado_deuda             VARCHAR2(30),
  numero_resolucion        VARCHAR2(50),

  -- Metadato de carga
  fecha_carga              DATE
);

-- 4. Índice para búsquedas por número de documento
CREATE INDEX idx_deudas_nrodoc ON area1.deudas (nro_documento);

ALTER USER AREA1 ACCOUNT UNLOCK;
ALTER USER AREA1 IDENTIFIED BY Area1Poc2024;
ALTER PROFILE DEFAULT LIMIT FAILED_LOGIN_ATTEMPTS UNLIMITED;