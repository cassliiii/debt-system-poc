## Áreas y roles

- Roles: atencion (consulta de deuda, sin área) y operador (carga de CSV de UNA sola área, asignada a su usuario).
- Un operador NUNCA elige el área: se toma de la sesión (user.area). El frontend envía a la ingesta el código de su área.
- Códigos de área: AREA1 (Oracle, area1.deudas, Fiscalización presencial, Sede Central) y AREA2 (PostgreSQL, area2.deudas, Fiscalización electrónica, Sede Norte). La consulta devuelve el área como BD_Area1 o BD_Area2: ambas formas se normalizan en src/config/areas.js.
- Usuarios demo (mock): atencion, operador1 (AREA1), operador2 (AREA2), todos con clave demo1234.

## Backends vigentes (se ignoran el backend Node/BigQuery y el OpenAPI de ingesta)

### consulta-service (puerto 8080, proxy /api)

- GET /api/debt/consulta/{dni} (8 dígitos). 200: { success, data: { dni, nombre, deuda_base_total, interes_total, deuda_total, fecha_actualizacion, detalle: [{ area, num_papeleta, tipo_monto, concepto, monto, estado, fecha_vencimiento }] } }. 400 DNI inválido; 404 sin registros; 500 error con error y details.
- GET /api/debt/health

### ingesta-demo (host 8081, contenedor 8080, proxy /ingestas)

- POST /ingestas: multipart con archivo (CSV) y area (AREA1 | AREA2). 202 con cabecera Location y cuerpo con el estado. 400 sin archivo o área inválida; 429 con 2 cargas activas; 500 si no se puede guardar el archivo.
- GET /ingestas/{jobId}: { jobId, estado, filasTotales, insertadas, rechazadas, porcentaje }. Estados: EN_COLA, EN_PROCESO, COMPLETADO, FALLIDO. 404 si el job no existe o expiró (los jobs viven en memoria y expiran 30 minutos después del último acceso).
- GET /ingestas/{jobId}/cuarentena: CSV con las filas rechazadas (por validación o por la base de datos). 404 si no existe; 409 si el job no terminó.
- Si faltan columnas obligatorias, el POST responde 202 y el job termina en FALLIDO sin mensaje: el frontend valida la cabecera antes de subir.
- 23 columnas obligatorias por área, mapeadas por nombre de cabecera; las columnas extra se ignoran. Límite del backend: 500 MB.
- No deduplica ni trunca: subir el mismo archivo dos veces duplica las deudas.
- procesados = insertadas + rechazadas.

## Variables de entorno

- VITE_USE_MOCK: servicios de consulta (false = real).
- VITE_USE_MOCK_INGESTA: servicio de ingesta (true = mock, false = real). Por defecto true hasta integrar.
- VITE_INGESTA_BASE_URL (vacío = mismo origen con proxy) y VITE_MAX_UPLOAD_MB (500).
- La autenticación es siempre mock (el backend no tiene login).
