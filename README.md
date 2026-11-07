# Sistema Integrado de Deudas (PoC)

PoC de un portal para cargar deudas desde archivos CSV y consultar el reporte
consolidado de un ciudadano. El backend usa Node.js, Express y BigQuery; el
frontend se sirve como contenido estático desde el mismo servicio.

## Requisitos

- Node.js 20 o superior.
- Un proyecto de Google Cloud con BigQuery habilitado.
- Credenciales de Google Cloud configuradas.

## Configuración

1. Entra a `backend/` y copia `.env.example` como `.env`.
2. Completa `GCP_PROJECT_ID` con el ID real de tu proyecto de Google Cloud.
3. Mantén o cambia `BQ_DATASET` según el dataset que usarás.
4. No guardes credenciales ni claves de servicio en `.env` ni en el repositorio.

Ejemplo:

```env
GCP_PROJECT_ID=mi-proyecto-gcp
BQ_DATASET=ds_sistema_deudas
PORT=8080
```

En local, configura las credenciales de aplicación:

```bash
gcloud auth application-default login
```

En Cloud Run se utiliza la cuenta de servicio asociada al servicio. Esa cuenta
necesita permisos para ejecutar trabajos de BigQuery y escribir en el dataset.

El backend valida `GCP_PROJECT_ID` y `BQ_DATASET` al iniciar. Si falta alguna
variable, el proceso termina con un mensaje explícito en lugar de conectarse a
un proyecto o dataset incorrecto.

## Preparar BigQuery

Los scripts SQL usan el formato completo `proyecto.dataset.tabla`, pero el
proyecto se mantiene como el marcador `{{GCP_PROJECT_ID}}` para no hardcodear
un entorno. El script `sql/run-sql.ps1` obtiene el valor desde `backend/.env`,
lo sustituye y ejecuta los archivos en orden.

```sql
ds_sistema_deudas.tabla
```

Por eso deben ejecutarse usando como proyecto activo el valor de
`GCP_PROJECT_ID`. El proyecto se configura desde el comando de BigQuery, no se
escribe dentro de los archivos SQL.

Desde PowerShell, ejecuta:

```powershell
.\sql\run-sql.ps1
```

También se pueden ejecutar manualmente desde la consola SQL de BigQuery,
reemplazando `{{GCP_PROJECT_ID}}` por el ID real antes de ejecutar. El orden
recomendado es:

1. Crear dataset.
2. Crear tablas.
3. Insertar datos de ejemplo (opcional).
4. Crear o actualizar la vista.

## Instalar y ejecutar

```powershell
cd backend
npm install
npm start
```

Para desarrollo:

```powershell
npm run dev
```

El servicio queda disponible en `http://localhost:8080`, salvo que se cambie
`PORT`.

## API

### Estado del servicio

```http
GET /api/health
```

Respuesta `200`:

```json
{
  "status": "OK",
  "message": "Debt System API funcionando 🚀"
}
```

### Cargar un CSV

```http
POST /api/debt/upload
Content-Type: multipart/form-data
```

Campos:

- `file`: archivo `.csv`, máximo 5 MB.
- `area`: `BD_Area1` o `BD_Area2`.

La cabecera debe incluir estas columnas, en cualquier orden:

```text
dni,nombre,num_papeleta,tipo_monto,monto,concepto
```

Se permiten columnas adicionales; el backend las ignora. `tipo_monto` debe ser
`BASE` o `INTERES`, y el DNI debe tener ocho dígitos.

Respuesta exitosa `200`:

```json
{
  "success": true,
  "message": "¡Archivo procesado e insertado exitosamente en BD_Area1!",
  "totalRegistros": 2
}
```

Errores habituales:

- `400`: falta el archivo, el área es inválida o el CSV tiene errores.
- `500`: error de BigQuery o del servidor.

### Consultar deuda por DNI

```http
GET /api/debt/consulta/10000001
```

Respuesta exitosa `200`:

```json
{
  "success": true,
  "data": {
    "dni": "10000001",
    "nombre": "Juan Perez Ramirez",
    "deuda_base_total": 280.5,
    "interes_total": 28.05,
    "deuda_total": 308.55,
    "detalle": []
  }
}
```

La respuesta real incluye los elementos del detalle de cada deuda. Si el DNI
no tiene registros, se devuelve `404`. Un DNI que no tenga exactamente ocho
dígitos devuelve `400`.

## Estructura principal

```text
backend/
  src/
    app.js                         Configuración de Express y rutas globales
    server.js                      Arranque del servidor
    config/env.js                  Validación de variables de entorno
    config/bigquery.js             Cliente de BigQuery
    controllers/debtController.js  Ingesta y consulta de deudas
    middlewares/upload.js          Recepción y filtro de CSV
    middlewares/validator.js       Validación de filas
    routes/debtRoutes.js            Rutas de la API
sql/                               Dataset, tablas, datos y vista
frontend/                          Portal web estático
```
