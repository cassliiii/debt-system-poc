# Reporte de métricas de ingesta — Node.js / TypeScript

## 1. Resumen ejecutivo

La implementación Node.js procesó e insertó correctamente 500.000 registros
por área:

- **Oracle / Área 1:** 26,394 s; aproximadamente **18.944 filas/s**.
- **PostgreSQL / Área 2:** 28,844 s; aproximadamente **17.335 filas/s**.

Ambas ejecuciones cumplen el objetivo de tiempo total inferior a 30 segundos.
El mejor resultado histórico sigue siendo Java sobre Oracle, con 15,6–21,1
segundos usando 12 conexiones y lotes de 1.000 filas.

Estas mediciones no son una comparación perfectamente controlada: se realizaron
en corridas y motores distintos, con estrategias de concurrencia diferentes.
Por tanto, sirven como comparación operacional del PoC, no como benchmark
estadístico definitivo.

## 2. Contexto de la prueba Node.js

| Elemento | Área 1 | Área 2 |
|---|---|---|
| Archivo | `BD_Area1.csv` | `BD_Area2.csv` |
| Motor | Oracle Free | PostgreSQL 16 |
| Filas | 500.000 | 500.000 |
| Columnas | 30 | 30 |
| Codificación | UTF-8 | UTF-8 |
| Delimitador | `,` | `,` |
| Lectura | `fs.createReadStream` + `readline` | `fs.createReadStream` + `readline` |
| Lote efectivo | 10.000 | 1.000 |
| Concurrencia | 1 conexión | 12 inserciones concurrentes |
| Inserción | `executeMany` + `commit` por lote | `INSERT` multi-row por lote |

Aunque el diseño inicial contemplaba un batch de 5.000, la implementación
validada utiliza 10.000 para Oracle y 1.000 para PostgreSQL. El tamaño de
PostgreSQL se redujo para mantenerse dentro del límite de parámetros de una
sentencia.

## 3. Resultados Node.js

| Área | Filas insertadas | Tiempo total | Throughput aproximado | Resultado |
|---|---:|---:|---:|---|
| Oracle | 500.000 | 26,394 s | 18.944 filas/s | Cumple `< 30 s` |
| PostgreSQL | 500.000 | 28,844 s | 17.335 filas/s | Cumple `< 30 s` |

### Cálculo del throughput

```text
Oracle:      500.000 / 26,394 = 18.944 filas/s
PostgreSQL:  500.000 / 28,844 = 17.335 filas/s
```

### Integridad observada

- Registros reportados por Node.js: 500.000 en cada área.
- Errores reportados: 0.
- No se ejecutó una medición independiente de RSS, CPU o latencias p95/p99.
- La validación de TypeScript pasó antes de la ejecución.

## 4. Comparación con Java y Python

### Área 1 — Oracle

| Implementación | Estrategia | Tiempo | Throughput |
|---|---|---:|---:|
| Java | 12 hilos, `nowait`, batch 1.000 | 15,6–21,1 s | 23.681–32.111 filas/s |
| Python | 12 hilos, `nowait`, batch 1.000 | 44,9 s | 11.145 filas/s |
| Node.js | 1 conexión, `executeMany`, batch 10.000 | **26,394 s** | **18.944 filas/s** |

Node.js queda aproximadamente 25% por debajo del mejor resultado Java de 15,6
segundos, pero mejora el resultado Python de 44,9 segundos y cumple el umbral
de 30 segundos.

### Área 2 — PostgreSQL

| Implementación | Estrategia | Tiempo | Throughput |
|---|---|---:|---:|
| Python | 12 hilos, `nowait`, batch 1.000 | 68,77 s | 7.271 filas/s |
| Node.js | 12 inserciones concurrentes, batch 1.000 | **28,844 s** | **17.335 filas/s** |

En PostgreSQL, Node.js reduce el tiempo documentado de Python en
aproximadamente 58% y supera el objetivo de 30 segundos.

## 5. Cuellos de botella y observaciones

1. **Oracle:** la ejecución Node.js usa una sola conexión; la concurrencia
   adicional de Java explica parte de la diferencia frente a sus mejores
   corridas.
2. **PostgreSQL:** el rendimiento depende del costo de construir sentencias
   multi-row y de la concurrencia de conexiones.
3. **Parser CSV:** la lectura es streaming y no carga el archivo completo;
   no aparece como cuello de botella dominante en estas mediciones.
4. **Índices:** las inserciones se realizan sobre tablas que mantienen índices
   activos, por lo que cada lote también paga el mantenimiento de índices.
5. **Variabilidad:** las pruebas anteriores reportan variaciones relevantes
   entre corridas por Docker Desktop/WSL2, carga de fondo y estado de las
   tablas.

## 6. Conclusiones

- Node.js cumple el objetivo de **menos de 30 segundos** en Oracle y
  PostgreSQL.
- Oracle: **26,394 s**, con margen de 3,606 segundos frente al objetivo.
- PostgreSQL: **28,844 s**, con margen de 1,156 segundos frente al objetivo.
- Java continúa siendo la referencia más rápida en Oracle cuando usa
  concurrencia y lotes optimizados.
- Node.js supera claramente las mediciones Python documentadas.
- Para una comparación definitiva deben repetirse al menos tres veces por
  configuración y registrar CPU, RSS, latencias por lote y `COUNT(*)` antes y
  después.

## 7. Comandos utilizados

```powershell
cd "C:\Users\Lisseth\Documents\UNI\8VO\DES DE SW\poc\debt-system-poc\pruebas-ingesta\nodejs\ingesta-demo"

$env:AREA1_PASSWORD = "Area1Poc2024"
npx tsx src/index.ts --area AREA1 --csv "..\BD_Area1.csv"

$env:AREA2_PASSWORD = "PgArea2Secure!2024"
npx tsx src/index.ts --area AREA2 --csv "..\BD_Area2.csv"
```
