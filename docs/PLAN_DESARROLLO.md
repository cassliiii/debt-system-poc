# Plan de Desarrollo: Sistema Integrado de Reporte de Deudas

Este documento consolida el contexto operativo del problema, el **reparto de responsabilidades del equipo**, el **plan de actividades** y la arquitectura técnica real del prototipo (`backend/`, `sql/`, `Dockerfile`), para la demostración académica.

---

## 1. Contexto del Caso y Problemática

### 1.1. Situación Actual
* **Operación Fragmentada:** La organización cuenta con **10 áreas operativas** que trabajan de manera aislada (islas de información).
* **Heterogeneidad Tecnológica:** Cada área utiliza diferentes lenguajes de programación y bases de datos:
  * Lenguajes principales: **C#** (mayoría) y **Java**.
  * Gestores de BD principales: **Oracle** (mayoría) y **PostgreSQL**.
  * Entorno: Infraestructura **On-Premise**, salvo un sistema en **AWS**.
* **Vacíos de Información (Uso de CSVs/Excels):** A pesar de contar con sistemas de información formalizados, gran parte de los datos operativos (como intereses acumulados por deudas de papeletas) no están contemplados en sus esquemas de bases de datos. Las áreas gestionan estos datos manualmente en archivos CSV/Excel, usándolos como "bases de datos informales".

### 1.2. El Dolor del Negocio y del Ciudadano
1. Un ciudadano acude a la ventanilla de atención para solicitar un **reporte unificado de deudas de papeletas**.
2. La deuda se encuentra dividida en dos fuentes:
   * **Deuda base:** Almacenada en la base de datos del sistema formal del área.
   * **Intereses / Recargos:** Almacenados en los archivos CSV locales de cada área.
3. El personal de atención al ciudadano actualmente debe revisar el sistema principal y luego buscar manualmente en múltiples archivos Excel para calcular el monto final.
4. **Resultado:** Demoras críticas en el tiempo de atención, insatisfacción del ciudadano y alto riesgo de error humano en la consolidación de montos.

### 1.3. Marco de Referencia (TOGAF)
$$\text{Procesos de Negocio} \longrightarrow \text{Sistemas de Información (SI)} \longrightarrow \text{Bases de Datos (BD)} \longrightarrow \text{Infraestructura (Servidores/Nube)}$$

### 1.4. Qué simplifica el PoC (y por qué)
Para una demo gratuita y de pocos días, **no nos conectamos a los Oracle/PostgreSQL on-premise reales de las áreas**. En su lugar:

* Las **bases de datos de 2 áreas se emulan con tablas en BigQuery** (`BD_Area1`, `BD_Area2`), creadas y administradas por **Rai** directamente en el entorno de GCP.
* Los **CSV que hoy están en `samples/` son solo de referencia/formato** (muestran el esquema esperado: `dni, nombre, num_papeleta, tipo_monto, monto, concepto`), no son el dataset final de la demo. Para la presentación se preparará un set de CSV de ejemplo más realista (con DNIs repetidos entre áreas para que la consolidación se note).
* El punto de entrada real de esos CSV en la demo **no es `curl`/Postman**, sino la **vista de carga (Data Entry) que construye Freddy** — es decir, el camino completo del dato en la demo es: *CSV → formulario web (Freddy) → API backend (Lisseth) → ingesta/validación (Rai) → BigQuery*.
* **Cada área puede enviar columnas adicionales propias** (información interna que ellas manejan, ej. `codigo_interno_area`, `observaciones`, `sede`, `fecha_infraccion`), en cualquier orden. La ingesta solo toma las columnas que necesita por **nombre de cabecera**, nunca por posición, y descarta el resto — ver 4.3.1.

---

## 2. Equipo y Responsabilidades

| Responsable | Rol | Alcance |
|---|---|---|
| **Freddy** | Frontend | Todas las **vistas** del Portal Web Unificado: pantalla de carga de CSV (Data Entry) y pantalla de consulta de deuda (Atención al Ciudadano). Consume la API expuesta por Lisseth. |
| **Lisseth** | Backend (lógica de aplicación) | Endpoints REST, validaciones de entrada a nivel de API, contratos de request/response, manejo de errores, integración del backend con el pipeline de datos de Rai. |
| **Rai** | Data Engineering | Diseño del dataset en BigQuery, creación de las tablas que emulan las BD de las 2 áreas, vista(s) de consolidación, reglas de calidad/validación de datos de ingesta, y despliegue/infra del entorno GCP (Cloud Run + BigQuery, free tier). |

La frontera entre Lisseth y Rai: **Lisseth es dueña del endpoint y su contrato** (qué recibe, qué responde, qué status codes); **Rai es dueño de qué pasa con el dato una vez que entra** (parseo del CSV, reglas de validación de negocio, inserción en BigQuery, diseño de la vista consolidada). Hoy ambas cosas conviven en `debtController.js` — parte del trabajo pendiente (ver backlog) es separarlas con claridad.

---

## 3. Plan de Actividades

### 3.1. Rai — Ingesta y Pipeline de Datos (Data Engineering)
- [x] Diseñar el esquema de datos: `dni`, `nombre`, `num_papeleta`, `tipo_monto` (`BASE`/`INTERES`), `monto`, `concepto`, `fecha_carga` — revisado y corregido para reflejar el punto 1.2 (deuda base vs. intereses), no solo suma entre áreas.
- [x] Crear el dataset `ds_sistema_deudas` en BigQuery (entorno GCP real, no local).
- [x] Crear las tablas que emulan las BD de las 2 áreas de prueba: `BD_Area1`, `BD_Area2`, particionadas por `DATE(fecha_carga)` (`sql/02_create_tables.sql`).
- [x] Sembrar datos base de ejemplo (`sql/03_insert_info.sql`) que simulan lo que ya estaría cargado en el sistema formal de cada área antes de la demo.
- [x] Crear la vista de consolidación `VW_Reporte_Deuda` (`sql/04_create_view.sql`): `UNION ALL` entre áreas + `deuda_base_total`, `interes_total`, `deuda_total` por DNI, con el área de origen en el detalle.
- [x] Definir reglas de calidad de datos de ingesta: DNI de 8 dígitos, `num_papeleta` no vacío, `tipo_monto` en (`BASE`,`INTERES`), `monto` numérico (`middlewares/validator.js`).
- [x] Hacer la ingesta tolerante a **columnas adicionales propias de cada área**: se leen por nombre de cabecera, no por posición, y las no requeridas se descartan (`debtController.js`).
- [ ] Preparar los **CSV de ejemplo definitivos para la demo** (reemplazando/complementando los de referencia en `samples/`), con DNIs compartidos entre `area1` y `area2` para que la suma consolidada sea visible.
- [ ] Dar los roles IAM (`roles/bigquery.dataEditor`, `roles/bigquery.jobUser`) a la cuenta de servicio por defecto de Cloud Run (`<PROJECT_NUMBER>-compute@developer.gserviceaccount.com`) — necesario antes de que el deploy funcione en producción.
- [ ] Desplegar el servicio en Cloud Run dentro del free tier y validar que la ingesta vía API, ya en la nube, llega a las tablas de BigQuery.

### 3.2. Lisseth — Lógica de Backend
- [x] Definir y construir los endpoints REST (`backend/src/routes/debtRoutes.js`):
  * `GET /api/health`
  * `POST /api/debt/upload` (`multipart/form-data`: `file`, `area`)
  * `GET /api/debt/consulta/:dni`
- [x] Middleware de carga de archivos (`multer`, memoria, límite 5 MB, solo `.csv`).
- [x] Conexión a BigQuery desde el backend (`config/bigquery.js`) e inserción de filas validadas.
- [x] Manejo de errores HTTP (400 por validación, 404 sin resultados, 500 error interno) con mensajes claros para que el frontend de Freddy los pueda mostrar.
- [x] Manejador de errores central en `app.js` para que un error de `multer` (archivo no-CSV, > 5 MB) devuelva JSON y no un stack trace HTML.
- [x] Parseo de CSV por nombre de columna (no por posición), tolerante a columnas extra y a comas dentro de valores entre comillas.
- [ ] Documentar el contrato de cada endpoint (request/response de ejemplo) para que Freddy pueda integrarlo sin depender de leer el controller.
- [ ] Revisar junto con Rai la separación de responsabilidades dentro de `debtController.js` (hoy mezcla parseo de CSV + reglas de negocio + acceso a BigQuery).

### 3.3. Freddy — Vistas (Frontend)
- [x] Construir el **Portal Web Unificado** con tres pantallas: landing con navegación (`index.html`), **Data Entry** (`data-entry.html`) y **Atención al Ciudadano** (`consulta.html`), en `frontend/` (carpeta a nivel de raíz, separada de `backend/`).
- [x] Data Entry: formulario de área + CSV contra `POST /api/debt/upload`, con mensaje de éxito (`totalRegistros`) o errores de validación fila por fila, y protección contra doble envío.
- [x] Atención al Ciudadano: consulta por DNI contra `GET /api/debt/consulta/:dni`, con desglose `deuda_base_total` / `interes_total` / `deuda_total` y tabla de detalle con badges `BASE`/`INTERES`.
- [x] Diseño visual corporativo (topbar institucional, paleta consistente) en `frontend/styles.css`.
- [ ] Coordinar con Lisseth el contrato exacto de cada endpoint antes de futuros cambios.
- [x] Flujo de **Caso 1 (CSV inválido)**, **Caso 2 (ingesta exitosa)** y **Caso 3 (consulta unificada)** operable de punta a punta desde la UI, probado localmente contra BigQuery real.

### 3.4. Transversal (los tres)
- [ ] Ensayo completo de la demo contra la URL pública de Cloud Run (no en local) antes de la presentación.
- [ ] Alinear los CSV de ejemplo finales entre Rai (quién los genera/valida) y Freddy (quién los sube en vivo durante la demo).

---

## 4. Arquitectura Técnica

### 4.1. Alcance de la demo
* **2 áreas de prueba**, sus BD emuladas como tablas de BigQuery (`BD_Area1`, `BD_Area2`) creadas por Rai en GCP.
* Los CSV en `samples/` (`area1_valid.csv`, `invalid_format.csv`) son **de referencia de formato**; el set de datos usado en la demo en vivo lo define Rai y se carga **a través de la vista de Freddy**.

### 4.2. Flujo end-to-end
```
CSV de ejemplo (Rai)
   → Vista "Data Entry" (Freddy)
      → POST /api/debt/upload (Lisseth)
         → Validación de fila (DNI 8 dígitos, monto numérico)
            → Inserción en BD_Area1 / BD_Area2 (BigQuery, Rai)

Operador en Vista "Atención al Ciudadano" (Freddy)
   → GET /api/debt/consulta/:dni (Lisseth)
      → Consulta a VW_Reporte_Deuda (BigQuery, Rai)
         → deuda_total + detalle_deudas renderizados en pantalla
```

### 4.3. Componentes implementados hoy
1. **API REST (`backend/`, Express 5)** — Lisseth.
2. **Validación de filas (`middlewares/validator.js`)** — Lisseth/Rai.
3. **Dataset y tablas BigQuery** (`sql/01_create_dataset.sql`, `sql/02_create_tables.sql`), particionadas por `fecha_carga` — Rai.
4. **Datos sembrados** (`sql/03_insert_info.sql`) — Rai.
5. **Vista de consolidación `VW_Reporte_Deuda`** (`sql/04_create_view.sql`) — Rai.
6. **Infraestructura (`Dockerfile`, Cloud Run)** — Rai.
7. **CI (`.github/workflows/backend-ci.yml`)** — valida que el backend cargue en cada push/PR.
8. **Frontend (`frontend/`)** — Freddy. Servido como estáticos por el mismo Express (`backend/src/app.js`), sin build step ni framework.

#### 4.3.1. Contrato del CSV de ingesta
El backend requiere **estas columnas por nombre** (sin importar su posición ni mayúsculas/minúsculas):

| Columna | Descripción |
|---|---|
| `dni` | 8 dígitos numéricos |
| `nombre` | Nombre completo del ciudadano |
| `num_papeleta` | Identificador de la infracción/deuda (trazabilidad, evita doble conteo) |
| `tipo_monto` | `BASE` o `INTERES` |
| `monto` | Numérico |
| `concepto` | Texto libre |

Cada área puede agregar **cualquier columna adicional propia** (ej. `codigo_interno_area`, `observaciones`, `sede`, `fecha_infraccion`) en cualquier posición — se ignoran automáticamente. Si falta alguna columna requerida, el backend rechaza el archivo completo con `400` y el detalle de cuáles faltan, antes de insertar nada.

### 4.4. Despliegue en Free Tier (a cargo de Rai)

```bash
# 1. Crear dataset, tablas, datos de ejemplo y vista (una sola vez, en el proyecto GCP real)
bq query --use_legacy_sql=false < sql/01_create_dataset.sql
bq query --use_legacy_sql=false < sql/02_create_tables.sql
bq query --use_legacy_sql=false < sql/03_insert_info.sql
bq query --use_legacy_sql=false < sql/04_create_view.sql

# 2. Dar permisos a la cuenta de servicio de Cloud Run (una sola vez)
gcloud projects add-iam-policy-binding <GCP_PROJECT_ID> \
  --member="serviceAccount:<PROJECT_NUMBER>-compute@developer.gserviceaccount.com" \
  --role="roles/bigquery.dataEditor"
gcloud projects add-iam-policy-binding <GCP_PROJECT_ID> \
  --member="serviceAccount:<PROJECT_NUMBER>-compute@developer.gserviceaccount.com" \
  --role="roles/bigquery.jobUser"

# 3. Desplegar a Cloud Run desde el código fuente
gcloud run deploy debt-system-poc \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --min-instances=0 --max-instances=2 \
  --memory=512Mi --cpu=1 \
  --set-env-vars GCP_PROJECT_ID=<GCP_PROJECT_ID>,BQ_DATASET=ds_sistema_deudas
```

Condiciones para quedarse en el free tier: región `us-central1`/`us-east1`/`us-west1`, `min-instances=0` (escala a cero), y los permisos IAM del paso 2 — no se necesita archivo de credenciales, Cloud Run usa la cuenta de servicio por defecto.

### 4.5. Distinción "deuda base" vs. "intereses" (ya implementado)
El esquema original solo sumaba `monto_deuda` entre áreas, sin reflejar el punto 1.2. Se corrigió agregando `tipo_monto` (`BASE`/`INTERES`) a las tablas y la vista expone `deuda_base_total` e `interes_total` por separado además del `deuda_total`. Ver 4.3.1 para el contrato de columnas.

---

## 5. Guía para la Demo

### 5.1. Estructura de la Demostración en Vivo (desde la vista de Freddy)
* **Caso 1 — Validación (rechazo de datos basura):** en la vista Data Entry, subir un CSV con DNI de 7 dígitos, `tipo_monto` inválido o monto alfanumérico (formato de `samples/invalid_format.csv` / `invalid_format_area2.csv`). La vista debe mostrar el error de validación devuelto por el backend, sin insertar nada en BigQuery.
* **Caso 2 — Ingesta exitosa:** subir, desde la misma vista, los CSV de ejemplo definitivos (preparados por Rai) para `BD_Area1` y `BD_Area2`. Mostrar confirmación en pantalla y, opcionalmente, las filas nuevas en la consola de BigQuery.
* **Caso 3 — Consulta unificada por DNI:** cambiar a la vista Atención al Ciudadano y consultar un DNI **sembrado desde antes de la demo** (ej. `10000001`), no uno recién subido en el Caso 2 — BigQuery puede tardar unos segundos en reflejar un `insert` reciente (streaming buffer), y usar un DNI ya consolidado evita ese riesgo en vivo. Mostrar `deuda_base_total`, `interes_total`, `deuda_total` y el detalle por área/concepto.

### 5.2. Puntos clave para la sustentación técnica
1. **Pragmatismo:** *serverless* (Cloud Run + BigQuery) permite una API funcional en días, sin tocar los sistemas on-premise de las 10 áreas.
2. **Costo cero:** toda la demo corre en el Free Tier de GCP.
3. **Simplificación consciente:** las BD de las 2 áreas se emulan como tablas BigQuery (creadas por Rai) en vez de conectarse a los motores reales; los CSV de muestra son representativos, no datos de producción.
4. **Responsabilidades claras:** Freddy (vistas) → Lisseth (API/lógica) → Rai (ingesta, calidad de datos y pipeline) — el mismo corte que tendría un equipo real al escalar de 2 a 10 áreas.
5. **Escalabilidad (de 2 a 10 áreas):** agregar un área nueva implica que Rai cree su tabla y sume un `UNION ALL` en la vista; Lisseth acepte el nuevo valor de `area` en el contrato; Freddy lo agregue como opción en el combo de la vista. El patrón es modular por diseño.
6. **Evolución hacia la arquitectura corporativa:** en producción se sumarían **Cloud Storage** (copia inmutable de cada CSV para auditoría) y **Cloud Composer/Airflow** (orquestación batch), y eventualmente conectores reales (Federated Queries/CDC) hacia las BD on-premise en lugar de carga manual por CSV.

---

## 6. Checklist de pendientes antes de la demo

- [x] Rai: dataset, tablas particionadas, datos sembrados y vista creados en el proyecto GCP real.
- [x] Freddy: vistas Data Entry y Atención al Ciudadano construidas (`frontend/`), probadas localmente contra BigQuery real.
- [x] Lisseth/Rai: ingesta robusta a columnas extra por área y a errores de archivo (multer).
- [ ] Rai: dar permisos IAM a la cuenta de servicio de Cloud Run y desplegar (`gcloud run deploy`, ver 4.4).
- [ ] Rai: preparar los CSV de ejemplo definitivos para la demo en vivo (no los de `samples/`, que son solo de referencia).
- [ ] Lisseth: documentar el contrato de los 3 endpoints para Freddy.
- [ ] Los tres: ensayo completo de los 3 casos de la sección 5.1 desde la URL pública de Cloud Run.
