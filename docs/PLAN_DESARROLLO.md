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
* Los **CSV que hoy están en `samples/` son solo de referencia/formato** (muestran el esquema esperado: `dni, nombre, monto_deuda, concepto`), no son el dataset final de la demo. Para la presentación se preparará un set de CSV de ejemplo más realista (con DNIs repetidos entre áreas para que la consolidación se note).
* El punto de entrada real de esos CSV en la demo **no es `curl`/Postman**, sino la **vista de carga (Data Entry) que construye Freddy** — es decir, el camino completo del dato en la demo es: *CSV → formulario web (Freddy) → API backend (Lisseth) → ingesta/validación (Rai) → BigQuery*.

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
- [x] Diseñar el esquema de datos (`dni`, `nombre`, `monto_deuda`, `concepto`, `fecha_carga`).
- [x] Crear el dataset `ds_sistema_deudas` en BigQuery (entorno GCP real, no local).
- [x] Crear las tablas que emulan las BD de las 2 áreas de prueba: `BD_Area1`, `BD_Area2` (`sql/01_create_tables.sql`).
- [x] Crear la vista de consolidación `VW_Reporte_Deuda` (`sql/02_create_views_sp.sql`): `UNION ALL` entre áreas + `SUM(monto_deuda)` por DNI.
- [x] Definir reglas de calidad de datos de ingesta: DNI de 8 dígitos numéricos, `monto_deuda` numérico (`middlewares/validator.js`).
- [ ] Preparar los **CSV de ejemplo definitivos para la demo** (reemplazando/complementando los de referencia en `samples/`), con DNIs compartidos entre `area1` y `area2` para que la suma consolidada sea visible.
- [ ] Decidir y documentar si se incorpora la distinción "deuda base / interés" (columna `tipo_monto`) o si la demo se queda en consolidación simple entre áreas (ver 1.4 y 4.5).
- [ ] Aprovisionar el entorno GCP: dataset, permisos IAM de la cuenta de servicio de Cloud Run (`roles/bigquery.dataEditor`, `roles/bigquery.jobUser`), y desplegar el servicio en Cloud Run dentro del free tier.
- [ ] Validar en el entorno real (no local) que la ingesta vía API efectivamente llega a las tablas de BigQuery.

### 3.2. Lisseth — Lógica de Backend
- [x] Definir y construir los endpoints REST (`backend/src/routes/debtRoutes.js`):
  * `GET /api/health`
  * `POST /api/debt/upload` (`multipart/form-data`: `file`, `area`)
  * `GET /api/debt/consulta/:dni`
- [x] Middleware de carga de archivos (`multer`, memoria, límite 5 MB, solo `.csv`).
- [x] Conexión a BigQuery desde el backend (`config/bigquery.js`) e inserción de filas validadas.
- [x] Manejo de errores HTTP (400 por validación, 404 sin resultados, 500 error interno) con mensajes claros para que el frontend de Freddy los pueda mostrar.
- [ ] Documentar el contrato de cada endpoint (request/response de ejemplo) para que Freddy pueda integrarlo sin depender de leer el controller.
- [ ] Revisar junto con Rai la separación de responsabilidades dentro de `debtController.js` (hoy mezcla parseo de CSV + reglas de negocio + acceso a BigQuery).
- [ ] Agregar manejo explícito de errores de `multer` (archivo no-CSV, archivo > 5 MB) con mensajes consistentes con el resto de la API.

### 3.3. Freddy — Vistas (Frontend)
- [ ] Construir el **Portal Web Unificado** con dos vistas, dentro de la misma app:
  1. **Data Entry:** formulario para seleccionar área (`BD_Area1` / `BD_Area2`), adjuntar CSV y enviarlo a `POST /api/debt/upload`. Debe mostrar éxito (`totalRegistros`) o el detalle de errores de validación fila por fila si el backend responde 400.
  2. **Atención al Ciudadano:** campo de DNI que consulta `GET /api/debt/consulta/:dni` y muestra `deuda_total` y el desglose (`detalle_deudas`) de forma legible para el operador.
- [ ] Definir cómo se sirve el frontend: opción recomendada, una carpeta `backend/public/` servida por `express.static` desde el mismo Cloud Run (sin infraestructura ni costo adicional).
- [ ] Manejar estados de carga/error/éxito en ambas vistas (spinner, mensajes de alerta, mensajes de "ciudadano sin registros").
- [ ] Coordinar con Lisseth el contrato exacto de cada endpoint antes de integrar.
- [ ] Dejar el flujo de **Caso 1 (CSV inválido)**, **Caso 2 (ingesta exitosa)** y **Caso 3 (consulta unificada)** operables de punta a punta desde la UI, ya que la demo en vivo se hará **desde esta vista**, no desde Postman/curl.

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
1. **API REST (`backend/`, Express 5, Cloud Run)** — Lisseth.
2. **Validación de filas (`middlewares/validator.js`)** — Lisseth/Rai.
3. **Dataset y tablas BigQuery (`sql/01_create_tables.sql`)** — Rai.
4. **Vista de consolidación `VW_Reporte_Deuda` (`sql/02_create_views_sp.sql`)** — Rai.
5. **Infraestructura (`Dockerfile`, Cloud Run)** — Rai.
6. **CI (`.github/workflows/backend-ci.yml`)** — valida que el backend cargue en cada push/PR.
7. **Frontend (`backend/public/`)** — pendiente, a cargo de Freddy (ver 3.3).

### 4.4. Despliegue en Free Tier (a cargo de Rai)

```bash
# 1. Crear dataset y tablas/vista (una sola vez, en el proyecto GCP real)
bq mk --location=US ds_sistema_deudas
bq query --use_legacy_sql=false < sql/01_create_tables.sql
bq query --use_legacy_sql=false < sql/02_create_views_sp.sql

# 2. Desplegar a Cloud Run desde el código fuente
gcloud run deploy debt-system-poc \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --min-instances=0 --max-instances=2 \
  --memory=512Mi --cpu=1 \
  --set-env-vars GCP_PROJECT_ID=<tu-proyecto>,BQ_DATASET=ds_sistema_deudas
```

Condiciones para quedarse en el free tier: región `us-central1`/`us-east1`/`us-west1`, `min-instances=0` (escala a cero), y permisos IAM (`roles/bigquery.dataEditor`, `roles/bigquery.jobUser`) sobre la cuenta de servicio por defecto de Cloud Run — no se necesita archivo de credenciales.

### 4.5. Mejora opcional: distinguir "deuda base" de "intereses"
Si el equipo decide reflejar literalmente el punto 1.2 (y no solo la suma entre áreas), Rai puede agregar una columna `tipo_monto` (`BASE`/`INTERES`) a las tablas y a la vista (`SUM(IF(tipo_monto='BASE', ...))`, `SUM(IF(tipo_monto='INTERES', ...))`). Es un cambio de esquema, no de arquitectura, y no bloquea el resto del plan.

---

## 5. Guía para la Demo

### 5.1. Estructura de la Demostración en Vivo (desde la vista de Freddy)
* **Caso 1 — Validación (rechazo de datos basura):** en la vista Data Entry, subir un CSV con DNI de 7 dígitos o monto alfanumérico (formato de `samples/invalid_format.csv`). La vista debe mostrar el error de validación devuelto por el backend, sin insertar nada en BigQuery.
* **Caso 2 — Ingesta exitosa:** subir, desde la misma vista, los CSV de ejemplo definitivos (preparados por Rai) para `BD_Area1` y `BD_Area2`. Mostrar confirmación en pantalla y, opcionalmente, las filas nuevas en la consola de BigQuery.
* **Caso 3 — Consulta unificada por DNI:** cambiar a la vista Atención al Ciudadano, ingresar un DNI presente en ambas áreas y mostrar `deuda_total` + desglose por concepto.

### 5.2. Puntos clave para la sustentación técnica
1. **Pragmatismo:** *serverless* (Cloud Run + BigQuery) permite una API funcional en días, sin tocar los sistemas on-premise de las 10 áreas.
2. **Costo cero:** toda la demo corre en el Free Tier de GCP.
3. **Simplificación consciente:** las BD de las 2 áreas se emulan como tablas BigQuery (creadas por Rai) en vez de conectarse a los motores reales; los CSV de muestra son representativos, no datos de producción.
4. **Responsabilidades claras:** Freddy (vistas) → Lisseth (API/lógica) → Rai (ingesta, calidad de datos y pipeline) — el mismo corte que tendría un equipo real al escalar de 2 a 10 áreas.
5. **Escalabilidad (de 2 a 10 áreas):** agregar un área nueva implica que Rai cree su tabla y sume un `UNION ALL` en la vista; Lisseth acepte el nuevo valor de `area` en el contrato; Freddy lo agregue como opción en el combo de la vista. El patrón es modular por diseño.
6. **Evolución hacia la arquitectura corporativa:** en producción se sumarían **Cloud Storage** (copia inmutable de cada CSV para auditoría) y **Cloud Composer/Airflow** (orquestación batch), y eventualmente conectores reales (Federated Queries/CDC) hacia las BD on-premise en lugar de carga manual por CSV.

---

## 6. Checklist de pendientes antes de la demo

- [ ] Rai: aprovisionar el entorno GCP real (dataset, tablas, vista, IAM, despliegue Cloud Run).
- [ ] Rai: preparar los CSV de ejemplo definitivos (no los de `samples/`, que son solo de referencia).
- [ ] Lisseth: documentar el contrato de los 3 endpoints para Freddy.
- [ ] Freddy: construir y desplegar las vistas Data Entry y Atención al Ciudadano.
- [ ] Los tres: ensayo completo de los 3 casos de la sección 5.1 desde la URL pública de Cloud Run.
