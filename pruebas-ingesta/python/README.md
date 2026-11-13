# Ingesta CSV -> BD (Python)

Puerto a Python de `pruebas-ingesta/java-quarkus/ingesta-demo`: ingesta de CSV
hacia Oracle (`AREA1`) o PostgreSQL (`AREA2`), corriendo contra las BD locales
levantadas con `docker-compose.yml` (raiz del repo).

Mismo diseno que la version Java: lector en streaming que mapea columnas por
NOMBRE de cabecera (no por posicion), validacion local (obligatorios,
formatos, regla DNI de 8 digitos), cola productor-consumidor hacia N hilos
de insercion (cada uno con su propia conexion), modos de commit
(`normal` / `nowait`) y de insercion (fila a fila / por lotes), cuarentena de
filas rechazadas, y metricas de latencia/throughput al final de cada corrida.

## 1. Instalar dependencias

```powershell
cd pruebas-ingesta\python
pip install -r requirements.txt
```

## 2. Prerrequisito: BD locales levantadas y con tablas creadas

Ver `docker-compose.yml` y `sql/area1_create_tables.sql` / `sql/area2_create_tables.sql`
en la raiz del repo. Las credenciales por defecto de `ingesta_demo/core.py`
ya coinciden con esos archivos.

## 3. CSV de entrada

En `ingesta_demo/data/` estan los CSV reales de prueba:

- `BD_Area1.csv` / `BD_Area2.csv` — 500 000 filas validas cada uno.
- `BD_Area1_DATOS_ERRONEOS.csv` / `BD_Area2_DATOS_ERRONEOS.csv` — 500 filas
  con errores (DNI vacio/corto, montos invalidos, fechas no-ISO, etc.) para
  probar el camino de cuarentena.

## 4. Correr la ingesta

Fila a fila, 1 hilo, commit normal (linea base, igual que la corrida 1 de Java):

```powershell
python -m ingesta_demo.main --csv ingesta_demo\data\BD_Area1.csv --area AREA1 --latencias
```

Con varios hilos y commit sin esperar a disco:

```powershell
python -m ingesta_demo.main --csv ingesta_demo\data\BD_Area1.csv --area AREA1 --commit-mode nowait --threads 8 --latencias
```

Por lotes (rompe la regla "1 fila = 1 commit", mayor throughput):

```powershell
python -m ingesta_demo.main --csv ingesta_demo\data\BD_Area1.csv --area AREA1 --commit-mode nowait --threads 8 --batch-size 500 --latencias
```

Para AREA2 (PostgreSQL) es igual, cambiando `--area AREA2` y el CSV.

Para probar el camino de cuarentena:

```powershell
python -m ingesta_demo.main --csv ingesta_demo\data\BD_Area1_DATOS_ERRONEOS.csv --area AREA1 --latencias
```

## 5. Salidas

Por cada corrida, en `out/<run-id>/`:

- `run.log` — log de la corrida (mismo formato que la version Java).
- `resumen.json` — metricas completas de esa corrida.
- `cuarentena.csv` — filas rechazadas (por validacion o por la BD) con motivo.
- `latencias.csv` — latencia de cada INSERT/lote (si se paso `--latencias`).
- `recursos.csv` — CPU% y memoria RSS del proceso cada 1 s.

Acumulado en `out/`:

- `resultados.csv` — una fila por corrida, para comparar configuraciones.
- `reporte_metricas_python_area1.md` / `reporte_metricas_python_area2.md` —
  se va agregando una seccion por corrida (comando, parametros, resultados)
  automaticamente al terminar cada una. Pensado para completarlo a mano con
  la interpretacion de cada corrida, igual que
  `pruebas-ingesta/java-quarkus/reporte_metricas_quarkus.md`.

## Opciones de la CLI

| Flag | Default | Descripcion |
|---|---|---|
| `--csv` | (requerido) | Ruta del CSV a ingestar |
| `--area` | (requerido) | `AREA1` (Oracle) o `AREA2` (PostgreSQL) |
| `--run-id` | autogenerado | Identificador de la corrida (carpeta en `out/`) |
| `--out` | `out` | Carpeta de salida |
| `--max-rows` | `0` (todas) | Limita cuantas filas se leen del CSV |
| `--latencias` | apagado | Guarda `latencias.csv` |
| `--progress-every` | `50000` | Cada cuantas filas loguea progreso |
| `--commit-mode` | `normal` | `normal` o `nowait` |
| `--threads` | `1` | Hilos de insercion (cada uno con su conexion) |
| `--queue-size` | `10000` | Tamano de la cola lector -> hilos |
| `--batch-size` | `1` | Filas por lote (`1` = fila a fila con autocommit) |

## Estructura

```
ingesta_demo/
  core.py     especificacion de columnas, lectura CSV, validacion,
              conexiones BD, INSERT, cuarentena, metricas, recursos
  main.py     CLI, hilo de insercion, orquestacion, reportes
  data/       CSV de prueba (reales, no generados)
```
