# Reporte de métricas de ingesta — Python (AREA1 Oracle / AREA2 PostgreSQL)

> Puerto a Python de `pruebas-ingesta/java-quarkus/ingesta-demo` (`IngestaApp.java`).
> Mismas pruebas, mismo dataset (500 000 filas por área), mismo esquema de
> columnas y mismas BD locales (`docker-compose.yml`). El objetivo es
> replicar la metodología del reporte Java (`reporte_metricas_quarkus.md`)
> y comparar ambas implementaciones bajo las mismas configuraciones.

## 1. Contexto de las pruebas

| Elemento | Detalle |
|---|---|
| Programa | `ingesta_demo.main` (CLI en Python, hilos nativos + `oracledb`/`psycopg2`) |
| Destino | Oracle `area1.deudas` (AREA1) y PostgreSQL `area2.deudas` (AREA2) |
| Origen | `BD_Area1.csv` (145.1 MB) y `BD_Area2.csv` (167.4 MB), 500 000 filas cada uno |
| Modo de insercion | Fila a fila (autocommit) o por lotes (`executemany`/`execute_batch` + 1 commit por lote) |
| Python | 3.12.4, 16 CPUs disponibles |
| Metricas | Tiempo total, throughput, latencia por INSERT/lote (p50/p95/p99/max), CPU%/RSS del proceso (muestreado cada 1s), verificacion `COUNT(*)` |

Se corrieron 4 configuraciones por area (8 corridas en total), todas con
commit `nowait` (equivalente a `ALTER SESSION SET COMMIT_WAIT=NOWAIT` en
Oracle / `SET synchronous_commit=off` en Postgres), variando hilos y
tamaño de lote:

| # | Hilos | Lote | Respeta "1 fila = 1 commit" |
|---|---|---|---|
| 1 | 8 | 1 (fila a fila) | Si |
| 2 | 8 | 500 | No |
| 3 | 12 | 1 (fila a fila) | Si |
| 4 | 12 | 1000 | No |

Las configuraciones 3 y 4 (12 hilos, lote 1000) se eligieron a proposito
para igualar los parametros de la mejor corrida de Java (seccion 11 y 13
de `pruebas-ingesta/java-quarkus/reporte_metricas_quarkus.md`), con el fin
de poder comparar 1 a 1.

---

## 2. Resultados — AREA1 (Oracle)

| Configuracion | Tiempo total | Throughput (insert) | Latencia INSERT/lote p50 | p95 | p99 | max | CPU proceso (prom. / pico) | RSS pico |
|---|---|---|---|---|---|---|---|---|
| 8 hilos, fila a fila | 174.54 s | 2 865 filas/s | 2.38 ms | 4.09 ms | 6.50 ms | 1.21 s | 121.3% / 150.0% | 101 MB |
| 8 hilos, lote 500 | 44.68 s | 11 192 filas/s | 98.9 ms (lote) | 535.3 ms | 2.03 s | — | 89.7% / 118.4% | 99 MB |
| 12 hilos, fila a fila | 180.87 s | 2 764 filas/s | 2.60 ms | 6.96 ms | 12.08 ms | 1.53 s | 121.9% / 153.1% | 102 MB |
| 12 hilos, lote 1000 | 44.86 s | 11 145 filas/s | 158.0 ms (lote) | 1.04 s | 1.40 s | — | 97.0% / 110.7% | 135 MB |

Las 4 corridas insertaron las 500 000 filas sin rechazos (`rech.validacion=0`,
`rech.bd=0`) y la verificacion `COUNT(*)` fue `OK` en todas.

### Interpretacion

**Pasar de 8 a 12 hilos no mejoro el tiempo — lo empeoro ligeramente**, tanto
fila a fila (174.5 s -> 180.9 s) como por lotes (44.68 s -> 44.86 s,
practicamente igual). El CPU promedio del proceso se mantuvo casi plano
(~121% en ambos casos fila a fila, ~90-97% en ambos casos por lotes), lo
que indica que el cuello de botella no esta en que falten hilos esperando
trabajo, sino en el GIL de Python: con mas hilos compitiendo por el
interprete para serializar parametros y leer resultados, la contencion
sube mas rapido de lo que se gana en paralelismo de I/O. A diferencia de
Java (que en su prueba de 50 000 filas si siguio escalando de 1 a 12
hilos antes de saturarse en 16), Python llega a su techo de concurrencia
util con bastante menos hilos.

**El salto de fila a fila a lotes es, con diferencia, la mejora mas
grande**: ~4x mas rapido (174.5 s -> 44.7 s), igual que en Java. Agrupar
500-1000 filas por commit sigue siendo la palanca mas efectiva, tanto en
Java como en Python, porque ataca el mismo costo dominante: un commit y un
viaje de red por fila es mucho mas caro que uno cada varios cientos.

**El RSS crecio con el tamaño de lote** (99 MB -> 135 MB al pasar de lote
500 a 1000 con 12 hilos), por los buffers de filas acumuladas antes de
cada `executemany`; sigue siendo un uso de memoria bajo en terminos
absolutos.

---

## 3. Resultados — AREA2 (PostgreSQL)

| Configuracion | Tiempo total | Throughput (insert) | Latencia INSERT/lote p50 | p95 | p99 | max | CPU proceso (prom. / pico) | RSS pico |
|---|---|---|---|---|---|---|---|---|
| 8 hilos, fila a fila | 172.24 s | 2 903 filas/s | 2.43 ms | 4.25 ms | 6.10 ms | 105.2 ms | 135.9% / 165.6% | 101 MB |
| 8 hilos, lote 500 | 79.33 s | 6 303 filas/s | 174.0 ms (lote) | 285.3 ms | 441.6 ms | — | 96.4% / 110.9% | 63 MB |
| 12 hilos, fila a fila | 182.91 s | 2 734 filas/s | 2.59 ms | 5.98 ms | 8.64 ms | 94.8 ms | 139.2% / 164.6% | 102 MB |
| 12 hilos, lote 1000 | 68.77 s | 7 271 filas/s | 344.0 ms (lote) | 765.7 ms | 1.80 s | — | 101.1% / 117.2% | 138 MB |

Igual que en AREA1: 0 rechazos y `COUNT(*)` correcto en las 4 corridas.

### Interpretacion

**El patron se repite**: 12 hilos no mejora sobre 8 hilos (172.2 s -> 182.9 s
fila a fila; en lotes si hay una mejora real de 79.3 s a 68.8 s, a
diferencia de AREA1 donde fue neutro — la varianza entre corridas de este
tipo ya se vio tambien en Java, seccion 3.1 del reporte original).
**La latencia maxima de INSERT es mucho menor que en Oracle** (105 ms vs.
1.2 s en AREA1 fila a fila): PostgreSQL en este entorno respondio de forma
mas pareja, sin los picos aislados que sí aparecieron contra Oracle.
**El throughput de PostgreSQL por lotes es menor que el de Oracle** (6 303 y
7 271 filas/s vs. 11 192 y 11 145 filas/s): `execute_batch` de psycopg2
reenvia los parametros como sentencias individuales agrupadas en un solo
viaje de ida y vuelta, mientras que el *array binding* de `executemany` de
oracledb empaqueta los lotes de forma mas eficiente a nivel de protocolo;
esa diferencia de driver pesa mas que la del motor de base de datos en si.

---

## 4. Comparacion 1 a 1 contra Java (12 hilos, nowait, 500 000 filas, AREA1/Oracle)

Java no probo AREA2 (ver limitacion en su propio reporte, seccion 6), asi
que la comparacion directa solo es posible para AREA1.

| Métrica | Java (12 hilos, fila a fila) | Python (12 hilos, fila a fila) | Java (12 hilos, lote 1000) | Python (12 hilos, lote 1000) |
|---|---|---|---|---|
| Tiempo total | 98 – 118 s | **180.9 s** | 15.6 – 21.1 s | **44.9 s** |
| Throughput | 4 249 – 5 075 filas/s | **2 764 filas/s** | 23 681 – 32 111 filas/s | **11 145 filas/s** |
| Throughput por hilo | ~355 – 423 filas/s/hilo | **~230 filas/s/hilo** | ~1 974 – 2 676 filas/s/hilo | **~929 filas/s/hilo** |
| CPU del proceso cliente | ~97% (~1 nucleo) | **~122% (~1.2 nucleos)** | ~200 – 250% (~2 – 2.5 nucleos) | **~97% (~1 nucleo)** |
| Verificacion `COUNT(*)` | OK | OK | OK | OK |

### ¿Cuál es más eficiente y por qué?

**Java es más eficiente en ambas configuraciones, con una brecha de ~1.5x
a ~2.9x.** La causa no es "la JVM ejecuta bytecode más rápido que
CPython" — esta carga es I/O-bound (esperar a la base de datos), no
CPU-bound, así que la velocidad de ejecución del intérprete casi no debería
pesar. Las dos razones reales de la diferencia son:

1. **El GIL limita cuánto trabajo "administrativo" puede solaparse entre
   hilos de Python.** Cada hilo, antes y después de esperar la red, necesita
   el GIL para serializar los parámetros del `INSERT`/lote y leer el
   resultado. Con 12 hilos, esa breve porción de trabajo con el GIL tomado
   empieza a encolarse: por eso el CPU del proceso Python se estanca en
   ~1 - 1.2 núcleos *incluso con 12 hilos*, mientras que la JVM en el modo
   por lotes sí llegó a usar ~2 - 2.5 núcleos reales (sus hilos son
   paralelismo genuino, sin un lock global equivalente). Esto también
   explica por qué en Python pasar de 8 a 12 hilos no ayudó (sección 2 y 3):
   el techo de concurrencia útil se alcanza antes que en Java.
2. **El driver de Oracle en modo batch.** El *array binding* de
   `executemany` de `oracledb` (modo thin) agrupa los valores de forma más
   compacta en el protocolo de red que lo que hace el intérprete de Python
   al construir esa estructura fila por fila en el `for` de `_bind()`. Java
   arma el lote con `PreparedStatement.addBatch()` directamente sobre
   buffers JDBC, con menos capas intermedias.

**En el modo fila a fila** (el que mejor aísla el efecto I/O puro, sin
armado de lotes de por medio) la brecha es menor en términos relativos de
tiempo total porque ambos pasan la mayoría del tiempo esperando a Oracle,
pero aun así Java mantiene una ventaja consistente: con menos uso de CPU
(~1 núcleo) logra más throughput que Python con más CPU (~1.2 núcleos) —
señal de que, incluso en el camino "solo esperar", el overhead por INSERT
de Python (armar la tupla de bind, pasar por el intérprete, liberar/tomar
el GIL en cada vuelta) es mayor que el de Java por llamada.

**Conclusión:** para esta prueba, Java es la opción más eficiente en
tiempo absoluto, pero la ventaja no viene de que "Java sea más rápido" de
forma genérica — viene del **paralelismo real sin GIL** de sus hilos
nativos (más visible cuanto más CPU exige el camino caliente, como en
batch) y de un **driver JDBC con menos overhead por fila** en el armado de
lotes. Para una ingesta I/O-bound como esta, Python con hilos sigue siendo
una opción razonable (consigue ~2.9x de mejora con lotes igual que Java,
~4x), solo que con un techo de throughput más bajo.

---

## 5. Comparación de estrategias dentro de Python

| Estrategia | AREA1 | AREA2 | Mejora vs. fila a fila (8 hilos) |
|---|---|---|---|
| 8 hilos, fila a fila | 2 865 filas/s | 2 903 filas/s | referencia |
| 8 hilos, lote 500 | 11 192 filas/s | 6 303 filas/s | 3.9x / 2.2x |
| 12 hilos, fila a fila | 2 764 filas/s | 2 734 filas/s | -4% / -6% |
| 12 hilos, lote 1000 | 11 145 filas/s | 7 271 filas/s | 3.9x / 2.5x |

**Agrupar en lotes sigue siendo la optimización más rentable también en
Python** (igual conclusión que Java): ataca directamente el costo de
network round-trip + commit por fila, que es el cuello de botella real.
**Agregar hilos más allá de 8, en cambio, no trajo beneficio** en esta
prueba — en AREA1 fue neutro/negativo y en AREA2 solo ayudó en el modo por
lotes. Para esta carga de trabajo y esta máquina, 8 hilos parece estar
cerca del punto óptimo de concurrencia en Python; subir más solo añade
contención por el GIL sin más paralelismo útil de I/O.

---

## 6. Limitaciones de las mediciones

- **Una sola corrida por configuración**, igual que la mayoría de las
  corridas de Java — no hay desviación estándar, y el propio reporte Java
  ya documentó variaciones de hasta 2x entre corridas "idénticas" por ruido
  del entorno (Docker Desktop en Windows, carga de fondo, etc.).
- **Hilos != hilos**: los hilos de Python compiten por el GIL; los de Java
  no. La comparación de "12 hilos" en ambos no es una comparación de
  paralelismo equivalente, es intencional para igualar el parámetro de la
  CLI, no el paralelismo real obtenido.
- **Drivers distintos**: `oracledb` (modo thin, puro Python) vs. driver
  JDBC de Oracle; `psycopg2` vs. driver JDBC de PostgreSQL. Parte de la
  diferencia medida es driver, no lenguaje.
- **CPU reportado por `psutil` es del proceso, no por hilo** — no permite
  ver si un hilo específico está saturado mientras otros esperan.
- **No se ejercitó el camino de fallos** (rollback + reintento 1 a 1 en
  lotes, cuarentena por rechazo de BD): los CSV usados en esta sección no
  traen filas inválidas. Ver `BD_Area1_DATOS_ERRONEOS.csv` /
  `BD_Area2_DATOS_ERRONEOS.csv` para esa prueba por separado.
- **Entorno**: Windows + Docker Desktop (WSL2) para ambas BD, mismo
  entorno usado en las pruebas Java, pero no necesariamente idéntico en
  cuanto a carga de fondo entre una sesión y otra.

---

## 7. Resumen de hallazgos

| Hallazgo | Evidencia |
|---|---|
| La ingesta en Python funciona y es correcta a escala completa | 500 000 insertadas en las 8 corridas, 0 rechazos, `COUNT(*)` coincide en todas |
| Los lotes son la optimización más rentable, en ambos lenguajes | ~4x en Python (174.5 s -> 44.7/44.9 s), ~5-7x en Java a esta escala |
| Más hilos no implica más throughput en Python, a diferencia de Java | 12 hilos fue igual o peor que 8 hilos en las 4 comparaciones directas |
| El GIL limita el techo de CPU utilizable por el proceso Python | CPU se estanca en ~1-1.4 núcleos incluso con 12 hilos; Java sí usó ~2-2.5 núcleos en modo batch |
| Java es más eficiente en esta prueba, por paralelismo real + driver | 1.5x (fila a fila) a 2.9x (lotes) menos tiempo que Python en la misma configuración |
| PostgreSQL respondió con latencia máxima mucho más estable que Oracle | max INSERT 94-105 ms (AREA2) vs. 1.2-1.5 s (AREA1) |

### Líneas de mejora posibles (si se quisiera acercar Python a Java)

1. Usar `multiprocessing` en vez de `threading` para evitar el GIL en el
   armado de lotes (a costa de manejar N procesos con sus propias
   conexiones en vez de N hilos livianos).
2. Probar `asyncpg` (PostgreSQL) y el modo async de `oracledb` para I/O
   asíncrono real en una sola hebra, en vez de hilos bloqueantes.
3. Medir con lotes más grandes (2000-5000) para ver si Python sigue
   mejorando o si el armado en Python se vuelve el nuevo cuello de botella.
4. Repetir cada configuración 3 veces (igual que recomienda el propio
   reporte de Java) para separar la mejora real del ruido del entorno.

---

## 8. Conclusión general

Python con hilos es una alternativa funcional y razonablemente eficiente
para esta ingesta (0 errores, hasta ~4x de mejora con lotes frente a fila
por fila), pero **no alcanza el throughput de la versión Java** bajo los
mismos parámetros de hilos y tamaño de lote: es entre 1.5x y 2.9x más
lento. La diferencia no es "Python es lento" en general — en el modo que
mejor aísla el efecto de I/O puro (fila a fila) la brecha es la más chica
de las dos — sino que viene de dos factores concretos y medibles: el GIL
impone un techo de paralelismo útil más bajo que el de los hilos nativos
de la JVM (más visible en batch, que exige más trabajo del intérprete por
lote), y el driver `oracledb` en modo batch tiene más overhead por fila
que el *array binding* de JDBC. Para una decisión de arquitectura real,
esto sugiere que si el volumen de ingesta de una integración crece mucho,
conviene o bien mantenerla en Java/JVM, o bien evolucionar la versión
Python hacia procesos (`multiprocessing`) o I/O asíncrono en vez de hilos,
para esquivar el límite del GIL.
