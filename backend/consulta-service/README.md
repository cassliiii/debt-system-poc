# consulta-service

Backend de **consulta de deudas** (Java + Quarkus). Expone la API que consume
la pantalla "Consulta de deuda" del frontend. No incluye nada de ingesta de
CSV: eso vive en otro backend, separado a propósito dentro de `backend/`.

## Qué hace

`GET /api/debt/consulta/{dni}` consulta **las dos bases de datos que levanta
`docker-compose.yml`** por `nro_documento`:

- `area1.deudas` en Oracle (`oracle-area1`, puerto `1521`)
- `area2.deudas` en PostgreSQL (`postgresql-area2`, puerto host `5429`)

Une los resultados de ambas, arma un detalle por papeleta (un ítem `BASE` y
uno `INTERES` por cada una) y calcula los totales (`deuda_base_total`,
`interes_total`, `deuda_total`). Esa es la "query que une las 2 BDs": hoy se
hace en la capa de aplicación (dos SELECT, uno por motor, porque Oracle y
PostgreSQL no se pueden unir con una sola sentencia SQL), no vía servicios de
GCP/BigQuery como antes.

Contrato de respuesta (igual al que ya esperaba el frontend):

- `200` → `{ "success": true, "data": { dni, nombre, deuda_base_total, interes_total, deuda_total, fecha_actualizacion, detalle: [...] } }`
- `400` → DNI con formato inválido (debe tener 8 dígitos)
- `404` → no hay registros en ninguna de las dos BDs
- `500` → error de conexión/consulta a alguna BD

`GET /api/debt/health` → chequeo simple de que el servicio está arriba.

## Requisitos

- Java 21+ (se probó con JDK 24)
- Docker (para levantar Oracle y PostgreSQL)
- No hace falta tener Maven instalado: el proyecto trae `mvnw` / `mvnw.cmd`

## Cómo probarlo

1. Levantar las bases de datos desde la raíz del repo:

   ```powershell
   docker compose up -d
   ```

   Oracle tarda unos minutos en quedar listo la primera vez. Se puede
   verificar con `docker logs oracle-area1 -f` (busca la línea
   `DATABASE IS READY TO USE`).

2. Crear esquema y datos de ejemplo (solo la primera vez que se crea cada
   contenedor / volumen):

   - Oracle (`sql/area1_create_tables.sql` y `sql/area1_insert.sql`): conectar
     como `SYSTEM` (password `DbArea12024!`) a `//localhost:1521/FREEPDB1` y
     ejecutarlos.
   - PostgreSQL (`sql/area2_create_tables.sql` y `sql/area2_insert.sql`):
     conectar a `localhost:5429`, db `db_area2`, user `area2_user` / password
     `PgArea2Secure!2024`.

   Si ya veniste corriendo las pruebas de ingesta de `pruebas-ingesta/`, lo
   más probable es que ambas tablas ya tengan datos (los volúmenes de Docker
   persisten entre reinicios).

3. Levantar el servicio de consulta:

   ```powershell
   cd backend/consulta-service
   ./mvnw quarkus:dev
   ```

   (o `./mvnw -DskipTests package` seguido de
   `java -jar target/quarkus-app/quarkus-run.jar` para correrlo empaquetado).

   Por defecto escucha en `http://localhost:8080`, el mismo puerto al que el
   frontend ya apunta por proxy (`frontend/vite.config.js`).

4. Probar directo con curl / Postman, usando un DNI que exista en alguna de
   las dos tablas (`nro_documento`):

   ```bash
   curl http://localhost:8080/api/debt/consulta/90164974
   curl -i http://localhost:8080/api/debt/consulta/abc        # 400
   curl -i http://localhost:8080/api/debt/consulta/00000000   # 404
   ```

5. Probar desde el frontend:

   - En `frontend/.env` (crear a partir de `.env.example`) poner
     `VITE_USE_MOCK=false` y dejar `VITE_API_URL` vacío (usa el proxy).
   - `cd frontend && npm run dev`
   - Entrar a la pantalla "Consulta de deuda" y buscar un DNI real de
     cualquiera de las dos tablas.

## Configuración de conexión

Todo vive en `src/main/resources/application.properties`, con valores por
defecto que coinciden con `docker-compose.yml` y `sql/*.sql`. Se pueden
sobrescribir por variable de entorno sin tocar el archivo:

| Variable | Default | Para qué |
|---|---|---|
| `PORT` | `8080` | Puerto HTTP del servicio |
| `ORA_URL` | `jdbc:oracle:thin:@//localhost:1521/FREEPDB1` | JDBC URL de Oracle |
| `ORA_USER` / `ORA_PASSWORD` | `AREA1` / `Area1Poc2024` | Credenciales del esquema `area1.deudas` |
| `PG_URL` | `jdbc:postgresql://localhost:5429/db_area2?currentSchema=area2` | JDBC URL de PostgreSQL |
| `PG_USER` / `PG_PASSWORD` | `area2_user` / `PgArea2Secure!2024` | Credenciales de `area2.deudas` |

## Qué falta / fuera de alcance de esta tarea

- La ingesta de CSV hacia ambas BDs vive en otra carpeta/servicio (no se tocó
  acá a propósito).
- No hay autenticación en este servicio: la pantalla de login/sesión del
  frontend es simulada (`authMock.js`); si se agrega auth real más adelante,
  este endpoint debería protegerse igual que el resto de `/api`.
- Las bases ya traían datos de pruebas de carga anteriores (`pruebas-ingesta/`),
  incluyendo papeletas duplicadas para algunos DNIs (de corridas de benchmark
  repetidas sin `TRUNCATE`). El servicio reporta fielmente lo que hay en la
  BD; si se quiere una demo "limpia" conviene truncar `area1.deudas` /
  `area2.deudas` y volver a cargar.
