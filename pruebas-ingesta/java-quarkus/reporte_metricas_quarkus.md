# Reporte de métricas de ingesta — Área 1 (Oracle)

> Documento reorganizado para facilitar su lectura por personas y sistemas de IA. Se conserva el contenido, los valores, las observaciones y las conclusiones del reporte original; los cambios son de estructura y presentación.

## Reporte original: pruebas de ingesta

## 1. Contexto de las pruebas

| Elemento | Detalle |
|---|---|
| Programa | `IngestaApp` (Quarkus + picocli, ejecución por línea de comandos, sin API REST) |
| Destino | Oracle (contenedor Docker), tabla `area1.deudas` (30 columnas, índice `idx_deudas_nrodoc` sobre `nro_documento`) |
| Origen | `BD_Area1.csv` (145,1 MB, 500.000 filas) |
| Modo de inserción | No transaccional, fila por fila: cada fila se valida, se inserta con `autocommit` y, si falla, va a cuarentena |
| JVM | Java 21, `-Xms2g -Xmx2g` |
| Métricas | Tiempo por fase (lectura, validación, insert, cuarentena), throughput, latencia del INSERT por fila (p50, p95, p99, máx), memoria, GC y CPU del proceso, y verificación final con `COUNT(*)` |

Se ejecutaron tres corridas:

| # | Corrida | Filas | Modo de commit |
|---|---|---|---|
| 1 | Línea base | 500.000 | Normal (el commit espera la escritura a disco) |
| 2 | Prueba de optimización | 50.000 | `nowait` (el commit no espera la escritura a disco) |
| 3 | Control de la prueba 2 | 50.000 | Normal |

Las corridas 2 y 3 usan el mismo volumen para que sean comparables entre sí. La corrida 1 sirve de referencia a escala completa.

---


## 2. Corrida 1: línea base con 500.000 filas

### Comando y salida

```
```powershell
PS D:\8vo Ciclo\SW\ingesta-demo> java -Xms2g -Xmx2g -jar target/quarkus-app/quarkus-run.jar --csv "D:\8vo Ciclo\SW\ingesta-demo\data\BD_Area1.csv" --area AREA1 --max-rows 500000 --truncate --latencias
23:03:56.177  Inicio corrida area1_20261111_230356 | area=AREA1 motor=oracle csv=D:\8vo Ciclo\SW\ingesta-demo\data\BD_Area1.csv (145.1 MB)
23:03:57.446  Conexion establecida en 1259.5 ms
23:03:58.229  TRUNCATE area1.deudas ejecutado
23:08:42.768  Progreso: 50000 filas (ok=50000, rech.val=0, rech.bd=0)
23:13:58.300  Progreso: 100000 filas (ok=100000, rech.val=0, rech.bd=0)
23:19:08.786  Progreso: 150000 filas (ok=150000, rech.val=0, rech.bd=0)
23:24:54.528  Progreso: 200000 filas (ok=200000, rech.val=0, rech.bd=0)
23:28:15.068  Progreso: 250000 filas (ok=250000, rech.val=0, rech.bd=0)
23:31:30.729  Progreso: 300000 filas (ok=300000, rech.val=0, rech.bd=0)
23:34:39.332  Progreso: 350000 filas (ok=350000, rech.val=0, rech.bd=0)
23:37:49.654  Progreso: 400000 filas (ok=400000, rech.val=0, rech.bd=0)
23:40:54.425  Progreso: 450000 filas (ok=450000, rech.val=0, rech.bd=0)
23:44:02.298  Progreso: 500000 filas (ok=500000, rech.val=0, rech.bd=0)
23:44:05.285  ---- RESUMEN ----
23:44:05.288  Filas: total=500000 insertadas=500000 rech.validacion=0 rech.bd=0
23:44:05.288  Tiempo total: 2403.58 s | lectura=20245 ms validacion=17563 ms insert=2362380 ms cuarentena=8 ms
23:44:05.289  Throughput: 208 filas/s total | 212 filas/s solo insert
23:44:05.289  Latencia INSERT (us): p50=4018 p95=8290 p99=16138 max=1061159
23:44:05.290  JVM: heap pico=1234 MB, GC=5 (229 ms), CPU proceso=362516 ms
23:44:05.290  Verificacion COUNT(*): antes=0 despues=500000 -> OK
```
```

### Interpretación

**Correctitud.** Se leyeron e insertaron las 500.000 filas, sin rechazos de validación ni de base de datos. El `COUNT(*)` pasó de 0 a 500.000, coincidente con lo que el programa reporta. La ingesta funciona de punta a punta a escala completa.

**Duración.** La corrida tomó 2.403,6 s (unos 40 minutos), con un promedio de 208 filas/s.

**Distribución del tiempo.**

| Fase | Tiempo | % del total |
|---|---|---|
| INSERT | 2.362,4 s | 98,3 % |
| Lectura y parseo del CSV | 20,2 s | 0,8 % |
| Validación | 17,6 s | 0,7 % |
| Cuarentena | 0,008 s | ~0 % |
| Otros (suma de fases vs. total) | ~3,4 s | 0,1 % |

Casi la totalidad del tiempo se gasta esperando a Oracle. Leer y validar las 500.000 filas toma unos 38 s en total, así que ni el parser ni las reglas de validación son un límite. Cualquier mejora de tiempo de respuesta debe venir de cómo se inserta, no de cómo se lee o se valida.

**Uso de recursos del cliente.** El proceso Java consumió 362,5 s de CPU durante 2.403,6 s de ejecución, es decir, cerca del 15 % de un núcleo. El programa pasa la mayor parte del tiempo bloqueado esperando respuesta de la base de datos. Esto indica que hay capacidad de sobra en el cliente para hacer más trabajo en paralelo.

**Memoria y recolector de basura.** El heap pico fue de 1.234 MB con 2 GB reservados. Hubo solo 5 recolecciones que sumaron 229 ms. No se observa una fuga: la JVM acumuló basura y no la limpió porque tenía espacio de sobra.

**Latencia del INSERT.** Una inserción típica (p50) tardó 4,0 ms. El 5 % más lento (p95) superó los 8,3 ms y el 1 % más lento (p99) los 16,1 ms. El máximo fue de 1.061 ms, es decir, al menos un INSERT tardó más de un segundo, probablemente por una pausa interna de Oracle. La cola larga justifica usar percentiles y no promedios para describir el comportamiento.

**Cambio de velocidad durante la corrida.** Calculando los tiempos entre cada marca de 50.000 filas:

| Tramo (filas) | Duración | Filas/s aprox. |
|---|---|---|
| 0 – 50k | 4 min 44 s | 176 |
| 50k – 100k | 5 min 16 s | 159 |
| 100k – 150k | 5 min 10 s | 161 |
| 150k – 200k | 5 min 46 s | 145 |
| 200k – 250k | 3 min 20 s | 249 |
| 250k – 300k | 3 min 16 s | 256 |
| 300k – 350k | 3 min 09 s | 265 |
| 350k – 400k | 3 min 10 s | 263 |
| 400k – 450k | 3 min 05 s | 271 |
| 450k – 500k | 3 min 08 s | 266 |

Las primeras 200.000 filas se insertaron a unas 159 filas/s en promedio y las últimas 300.000 a unas 261 filas/s, un 64 % más rápido. Es contraintuitivo, porque la tabla y el índice crecen y la carga debería volverse más lenta, no más rápida. Esto apunta a un factor externo al código (otra carga en la máquina durante los primeros ~21 minutos, caché fría de Oracle, contención del disco o de WSL2). Con los datos disponibles no es posible confirmar la causa, pero sí advertir que **una sola corrida no basta para comparar configuraciones**, porque la variación del entorno (145 a 271 filas/s) es del mismo orden que las diferencias que se quieren medir.

### Conclusión para mejorar el tiempo de respuesta

El 98 % del tiempo es espera de la base de datos en cada INSERT con su commit individual. La palanca principal es reducir el costo del commit por fila (corridas 2 y 3) y aprovechar que el cliente está ocioso, solapando varias inserciones a la vez. Optimizar el parseo o la validación aportaría menos del 2 % de mejora posible.

---


## 3. Corrida 2: 50.000 filas con commit sin espera (`nowait`)

### Comando y salida

```
```powershell
PS D:\8vo Ciclo\SW\ingesta-demo> java -Xms2g -Xmx2g -jar target/quarkus-app/quarkus-run.jar --csv "D:\8vo Ciclo\SW\ingesta-demo\data\BD_Area1.csv" --area AREA1 --max-rows 50000 --commit-mode nowait --run-id a1_50k_nowait --latencias
23:57:47.377  Inicio corrida a1_50k_nowait | area=AREA1 motor=oracle csv=D:\8vo Ciclo\SW\ingesta-demo\data\BD_Area1.csv (145.1 MB)
23:57:48.757  Modo de commit: NOWAIT (sin esperar escritura a disco)
23:57:48.757  Conexion establecida en 1161.3 ms
23:59:28.054  Progreso: 50000 filas (ok=50000, rech.val=0, rech.bd=0)
23:59:28.384  ---- RESUMEN ----
23:59:28.385  Filas: total=50000 insertadas=50000 rech.validacion=0 rech.bd=0
23:59:28.385  Tiempo total: 97.93 s | lectura=1435 ms validacion=801 ms insert=94797 ms cuarentena=0 ms
23:59:28.387  Throughput: 511 filas/s total | 527 filas/s solo insert
23:59:28.387  Latencia INSERT (us): p50=1671 p95=3602 p99=5620 max=195297
23:59:28.387  JVM: heap pico=393 MB, GC=1 (16 ms), CPU proceso=26359 ms
23:59:28.390  Verificacion COUNT(*): antes=0 despues=50000 -> OK
```
```

### Interpretación

**Qué cambia en esta configuración.** Se configuró la sesión de Oracle para que el commit no espere la confirmación de escritura del log de transacciones en disco (`COMMIT_LOGGING = BATCH`, `COMMIT_WAIT = NOWAIT`). Sigue habiendo un commit por fila, pero el motor no bloquea al cliente hasta que el disco confirma.

**Resultado.** Las 50.000 filas se insertaron en 97,9 s, a 511 filas/s, sin rechazos y con verificación `COUNT(*)` correcta. La latencia típica (p50) fue de 1,67 ms, con p95 de 3,6 ms y p99 de 5,6 ms.

**Distribución del tiempo.** El INSERT sigue siendo la fase dominante (94,8 s de 97,9 s, un 96,8 %), pero lectura (1,4 s) y validación (0,8 s) ahora pesan un poco más en términos relativos porque el INSERT se hizo más rápido.

**CPU del cliente.** Usó 26,4 s de CPU en 97,9 s, cerca del 27 % de un núcleo. Aunque subió respecto a la línea base, el cliente sigue esperando la mayor parte del tiempo y tiene capacidad libre.

### Conclusión para mejorar el tiempo de respuesta

Quitar la espera del disco mejora el rendimiento de forma clara, lo que confirma que el fsync del log de transacciones era una parte importante del costo por fila. Sin embargo, cada INSERT sigue tardando unos 1,7 ms, que ya no corresponden al disco. Ese tiempo restante se reparte entre el viaje de red al contenedor, el procesamiento de 30 parámetros por fila y el mantenimiento del índice. Como el cliente aún está mayormente ocioso, el siguiente paso con más potencial es ejecutar varias inserciones simultáneas (varios hilos, cada uno con su conexión), combinadas con este modo de commit.

---


## 4. Corrida 3: 50.000 filas con commit normal (control)

### Comando y salida

```
```powershell
PS D:\8vo Ciclo\SW\ingesta-demo> java -Xms2g -Xmx2g -jar target/quarkus-app/quarkus-run.jar --csv "D:\8vo Ciclo\SW\ingesta-demo\data\BD_Area1.csv" --area AREA1 --max-rows 50000 --commit-mode normal --run-id a1_50k_normal --latencias
00:01:09.988  Inicio corrida a1_50k_normal | area=AREA1 motor=oracle csv=D:\8vo Ciclo\SW\ingesta-demo\data\BD_Area1.csv (145.1 MB)
00:01:10.480  Conexion establecida en 483.4 ms
00:05:27.671  Progreso: 50000 filas (ok=50000, rech.val=0, rech.bd=0)
00:05:28.692  ---- RESUMEN ----
00:05:28.693  Filas: total=50000 insertadas=50000 rech.validacion=0 rech.bd=0
00:05:28.693  Tiempo total: 256.87 s | lectura=1317 ms validacion=787 ms insert=253790 ms cuarentena=0 ms
00:05:28.693  Throughput: 195 filas/s total | 197 filas/s solo insert
00:05:28.693  Latencia INSERT (us): p50=4919 p95=8028 p99=11444 max=339476
00:05:28.694  JVM: heap pico=397 MB, GC=1 (14 ms), CPU proceso=35594 ms
00:05:28.694  Verificacion COUNT(*): antes=0 despues=50000 -> OK
```
```

### Interpretación

**Resultado.** Con el commit normal, las 50.000 filas tomaron 256,9 s a 195 filas/s. El INSERT ocupó el 98,8 % del tiempo (253,8 s). La latencia típica fue de 4,9 ms, con p95 de 8,0 ms y p99 de 11,4 ms.

**Coherencia con la línea base.** El rendimiento de esta corrida (195 filas/s) cae dentro del rango observado en la corrida de 500.000 filas (145 a 271 filas/s), en particular en su tramo lento. Esto confirma que el comportamiento es repetible a distinta escala y que los 50.000 registros representan bien la carga completa.

**CPU del cliente.** 35,6 s de CPU en 256,9 s, cerca del 14 % de un núcleo, prácticamente igual que en la línea base: el cliente espera casi todo el tiempo.

### Conclusión para mejorar el tiempo de respuesta

Esta corrida sirve como control directo de la corrida 2: mismo volumen, mismo entorno, mismo código, distinto modo de commit. Su valor es poder atribuir la diferencia a una sola variable.

---


## 5. Comparación entre corridas 2 y 3 (50.000 filas)

| Métrica | Commit normal | Commit `nowait` | Variación |
|---|---|---|---|
| Tiempo total | 256,87 s | 97,93 s | 62 % menos (2,6 veces más rápido) |
| Throughput total | 195 filas/s | 511 filas/s | +162 % |
| Tiempo medio de INSERT | 5,08 ms | 1,90 ms | 63 % menos |
| Latencia p50 | 4.919 µs | 1.671 µs | 66 % menos |
| Latencia p95 | 8.028 µs | 3.602 µs | 55 % menos |
| Latencia p99 | 11.444 µs | 5.620 µs | 51 % menos |
| Latencia máxima | 339.476 µs | 195.297 µs | 42 % menos |
| CPU del proceso | 35,6 s | 26,4 s | |
| Heap pico | 397 MB | 393 MB | Sin cambio relevante |
| Verificación `COUNT(*)` | OK | OK | |

### Interpretación

1. **El fsync del log de transacciones explica la mayor parte del costo por INSERT.** La mediana baja unos 3,2 ms de los 4,9 ms originales. La espera de confirmación de disco en cada commit era el cuello de botella dominante.

2. **Queda un costo residual de unos 1,7 ms por INSERT que no es disco.** Es consistente con el ida y vuelta de red hacia el contenedor, el enlace de 30 parámetros y el mantenimiento del índice.

3. **La mejora es robusta frente al ruido del entorno, aunque su magnitud exacta tiene un margen.** En la línea base el ritmo osciló entre 145 y 271 filas/s. Si la corrida de control hubiera caído en el régimen rápido (unas 265 filas/s), la mejora del modo `nowait` habría sido de unas 1,9 veces en lugar de 2,6. Lo más prudente es presentar el resultado como una mejora de entre 1,9 y 2,6 veces, y confirmarlo con repeticiones.

4. **Las tres corridas pasaron la verificación de integridad**, de modo que el cambio de modo de commit no afectó la cantidad de filas almacenadas.

### Costo de la optimización

Con `nowait`, Oracle confirma el commit al cliente antes de que el log llegue a disco. Si el contenedor o el servidor se cae justo después de un commit, las últimas filas confirmadas pueden perderse aunque el programa las haya contado como insertadas. Para una carga reproducible desde un CSV que puede relanzarse, el riesgo es aceptable, pero debe declararse como una concesión de durabilidad a cambio de velocidad.

---


## 6. Limitaciones de las mediciones

- **Una sola corrida por configuración.** No hay réplicas, así que no se puede calcular desviación estándar. Se recomiendan al menos 3 repeticiones por configuración.
- **Orden fijo de ejecución.** La corrida `nowait` se ejecutó antes que la de control. Alternar el orden en las repeticiones descarta un efecto del orden.
- **Variabilidad del entorno no explicada.** El cambio de velocidad a mitad de la corrida de 500.000 filas no tiene causa confirmada. Conviene revisar `latencias.csv` por bloques y registrar el consumo de CPU y memoria del contenedor de Oracle (`docker stats`) durante las corridas.
- **Camino de errores sin probar.** En las tres corridas hubo 0 rechazos. La cuarentena (tanto por validación como por errores de la BD) no se ha ejercitado con datos reales.
- **Solo Oracle.** Todavía no hay mediciones del Área 2 en PostgreSQL, por lo que no es posible comparar motores.
- **Estimación no medida.** Extrapolando 511 filas/s a 500.000 filas, una corrida completa con `nowait` tomaría unos 16 minutos, frente a los 40 de la línea base. Es una proyección que debe confirmarse ejecutando la corrida completa.

---


## 7. Resumen de hallazgos

| Hallazgo | Evidencia |
|---|---|
| La ingesta funciona y es correcta a escala completa | 500.000 insertadas, 0 rechazos, `COUNT(*)` coincide |
| La base de datos es el cuello de botella, no el programa | INSERT = 98 % del tiempo; CPU del cliente 14–27 % de un núcleo |
| Leer y validar cuestan casi nada | 38 s de 2.403 s en la línea base |
| La espera de escritura a disco en cada commit es el costo dominante | Commit sin espera: tiempo total 62 % menor, p50 pasa de 4,9 ms a 1,7 ms |
| Aún hay capacidad ociosa en el cliente | CPU baja y latencias de espera, lo que sugiere paralelizar inserciones |
| Los resultados tienen ruido de entorno | Velocidad entre 145 y 271 filas/s dentro de una misma corrida |

### Líneas de mejora indicadas por los resultados

1. Combinar el commit sin espera con varios hilos de inserción, cada uno con su propia conexión, para solapar la espera de red y de base de datos.
2. Medir el efecto del índice sobre `nro_documento` creándolo después de la carga.
3. Revisar dónde reside el log de transacciones de Oracle dentro de Docker (volumen nombrado frente a carpeta de Windows montada).
4. Repetir cada configuración al menos 3 veces y reportar media y dispersión.
5. Si la regla de commit fila por fila pudiera relajarse, evaluar inserción por lotes con reintento fila por fila ante fallos, que es la alternativa con mayor potencial de reducción de tiempo.

---


Estrategia: Hilos con commit sin esperar (n.° 3). Es la mejora más grande sin romper “1 a 1”.

```powershell
PS D:\8vo Ciclo\SW\ingesta-demo> java -Xms2g -Xmx2g -jar target/quarkus-app/quarkus-run.jar --csv "D:\8vo Ciclo\SW\ingesta-demo\data\BD_Area1.csv" --area AREA1 --max-rows 50000 --commit-mode nowait --threads 4 --run-id a1_50k_nowait_t4 --latencias
13:53:31.306  Inicio corrida a1_50k_nowait_t4 | area=AREA1 motor=oracle hilos=4 commit=nowait csv=D:\8vo Ciclo\SW\ingesta-demo\data\BD_Area1.csv (145.1 MB)
13:53:32.214  Modo de commit: NOWAIT en cada sesion de trabajador
13:53:32.477  4 conexiones establecidas en 217.5 ms
13:53:51.962  Progreso: 50000 filas procesadas por la BD
13:53:52.087  ---- RESUMEN ----
13:53:52.088  Filas: total=50000 insertadas=50000 rech.validacion=0 rech.bd=0
13:53:52.088  Tiempo total (reloj): 19.49 s | lectura=1195 ms validacion=791 ms | insert acumulado (suma de hilos)=76863 ms | cuarentena acumulada=0 ms
13:53:52.088  Throughput: 2565 filas/s total | 2565 filas/s insertadas | hilos=4
13:53:52.089  Latencia INSERT (us): p50=1222 p95=2861 p99=4248 max=250479
13:53:52.090  JVM: heap pico=200 MB, GC=4 (73 ms), CPU proceso=22141 ms
13:53:52.090  Verificacion COUNT(*): antes=0 despues=50000 -> OK
PS D:\8vo Ciclo\SW\ingesta-demo> 
```

Con 4 hilos y commit sin espera la ingesta es unas 5 veces más rápida que la prueba de 1 hilo con nowait, y 12 a 13 veces más rápida que el baseline, sin romper la regla “1 a 1”. Los números exactos tienen un margen de error que explico abajo.

Comparación (50.000 filas)
| Configuración | Tiempo total | Filas/s | p50 |
| --- | --- | --- | --- |
| Commit normal, 1 hilo | 256,9 s | 195 | 4.919 µs |
| nowait, 1 hilo | 97,9 s | 511 | 1.671 µs |
| nowait, 4 hilos | 19,5 s | 2.565 | 1.222 µs |

Las 50.000 filas se insertaron, sin rechazos, y el COUNT(*) coincide.

Qué indica el resultado
Los hilos aprovechan la espera que el cliente tenía ociosa. Mientras un hilo espera a Oracle, los otros avanzan. Eso confirma la hipótesis de que el cliente tenía capacidad libre.
Los 4 hilos trabajaron casi todo el tiempo. El tiempo de INSERT acumulado fue 76,9 s. Repartido entre 4 hilos son unos 19,2 s por hilo, casi igual a los 19,5 s de reloj. Los trabajadores no esperaron trabajo, así que el lector (que gasta unos 2 s en leer y validar) no es el límite.
La latencia no empeoró con la concurrencia. Esperaba que los hilos compitieran y subieran la latencia por INSERT. Pasó lo contrario: el p50 bajó de 1.671 a 1.222 µs. Con 4 hilos Oracle todavía no está saturado, así que probablemente hay margen para más hilos.
El cliente ya consume más CPU. Gastó 22,1 s de CPU en 19,5 s de reloj, algo más de un núcleo (antes era del 15 al 27 % de un núcleo). La memoria sigue baja (200 MB) y el GC es insignificante.
Una cautela importante

Pasar de 511 a 2.565 filas/s es 5 veces con 4 hilos, es decir, más que lineal. Es una señal de que la comparación no es del todo limpia. Lo más probable es que la corrida de 1 hilo cayera en un momento lento del sistema. Esa corrida fue de noche, esta de día, y en la corrida de 500k vimos que el ritmo varía entre 145 y 271 filas/s dentro de una misma ejecución. Con una sola corrida por configuración no puedo separar el efecto de los hilos del ruido del entorno. El rango plausible de mejora real de los hilos es de unas 3 a 5 veces.

---


```powershell
PS D:\8vo Ciclo\SW\ingesta-demo> java -Xms2g -Xmx2g -jar target/quarkus-app/quarkus-run.jar --csv "D:\8vo Ciclo\SW\ingesta-demo\data\BD_Area1.csv" --area AREA1 --max-rows 50000 --commit-mode nowait --threads 1 --run-id a1_50k_nowait_t1 --latencias
18:38:16.228  Inicio corrida a1_50k_nowait_t1 | area=AREA1 motor=oracle hilos=1 commit=nowait csv=D:\8vo Ciclo\SW\ingesta-demo\data\BD_Area1.csv (145.1 MB)
18:38:18.104  Modo de commit: NOWAIT en cada sesion de trabajador
18:38:18.365  1 conexiones establecidas en 168.1 ms
18:39:02.007  Progreso: 50000 filas procesadas por la BD
18:39:02.180  ---- RESUMEN ----
18:39:02.182  Filas: total=50000 insertadas=50000 rech.validacion=0 rech.bd=0
18:39:02.182  Tiempo total (reloj): 43.64 s | lectura=1125 ms validacion=822 ms | insert acumulado (suma de hilos)=42782 ms | cuarentena acumulada=0 ms
18:39:02.182  Throughput: 1146 filas/s total | 1146 filas/s insertadas | hilos=1
18:39:02.185  Latencia INSERT (us): p50=647 p95=2005 p99=3787 max=142737
18:39:02.187  JVM: heap pico=188 MB, GC=4 (77 ms), CPU proceso=23328 ms
18:39:02.187  Verificacion COUNT(*): antes=0 despues=50000 -> OK
PS D:\8vo Ciclo\SW\ingesta-demo> java -Xms2g -Xmx2g -jar target/quarkus-app/quarkus-run.jar --csv "D:\8vo Ciclo\SW\ingesta-demo\data\BD_Area1.csv" --area AREA1 --max-rows 50000 --commit-mode nowait --threads 8 --run-id a1_50k_nowait_t8 --latencias
18:43:05.114  Inicio corrida a1_50k_nowait_t8 | area=AREA1 motor=oracle hilos=8 commit=nowait csv=D:\8vo Ciclo\SW\ingesta-demo\data\BD_Area1.csv (145.1 MB)
18:43:05.873  Modo de commit: NOWAIT en cada sesion de trabajador
18:43:06.180  8 conexiones establecidas en 294.7 ms
18:43:16.449  Progreso: 50000 filas procesadas por la BD
18:43:17.083  ---- RESUMEN ----
18:43:17.084  Filas: total=50000 insertadas=50000 rech.validacion=0 rech.bd=0
18:43:17.085  Tiempo total (reloj): 10.29 s | lectura=901 ms validacion=594 ms | insert acumulado (suma de hilos)=81202 ms | cuarentena acumulada=0 ms
18:43:17.086  Throughput: 4857 filas/s total | 4857 filas/s insertadas | hilos=8
18:43:17.087  Latencia INSERT (us): p50=977 p95=3549 p99=6189 max=722469
18:43:17.087  JVM: heap pico=225 MB, GC=4 (77 ms), CPU proceso=19250 ms
18:43:17.087  Verificacion COUNT(*): antes=0 despues=50000 -> OK

PS D:\8vo Ciclo\SW\ingesta-demo> java -Xms2g -Xmx2g -jar target/quarkus-app/quarkus-run.jar --csv "D:\8vo Ciclo\SW\ingesta-demo\data\BD_Area1.csv" --area AREA1 --max-rows 50000 --commit-mode nowait --threads 12 --run-id a1_50k_nowait_t12 --latencias
18:56:03.982  Inicio corrida a1_50k_nowait_t12 | area=AREA1 motor=oracle hilos=12 commit=nowait csv=D:\8vo Ciclo\SW\ingesta-demo\data\BD_Area1.csv (145.1 MB)
18:56:05.704  Modo de commit: NOWAIT en cada sesion de trabajador
18:56:06.030  12 conexiones establecidas en 317.0 ms
18:56:11.427  Progreso: 50000 filas procesadas por la BD
18:56:11.541  ---- RESUMEN ----
18:56:11.541  Filas: total=50000 insertadas=50000 rech.validacion=0 rech.bd=0
18:56:11.541  Tiempo total (reloj): 5.41 s | lectura=725 ms validacion=405 ms | insert acumulado (suma de hilos)=64209 ms | cuarentena acumulada=0 ms
18:56:11.542  Throughput: 9241 filas/s total | 9241 filas/s insertadas | hilos=12
18:56:11.542  Latencia INSERT (us): p50=1051 p95=2230 p99=3555 max=401867
18:56:11.543  JVM: heap pico=235 MB, GC=4 (41 ms), CPU proceso=16922 ms
18:56:11.543  Verificacion COUNT(*): antes=0 despues=50000 -> OK
```

---


Resultados (50.000 filas, nowait)
| Hilos | Tiempo | Filas/s | p50 | p99 |
| --- | --- | --- | --- | --- |
| 1 | 43,6 s | 1.146 | 647 µs | 3.787 µs |
| 4 (corrida previa) | 19,5 s | 2.565 | 1.222 µs | 4.248 µs |
| 8 | 10,3 s | 4.857 | 977 µs | 6.189 µs |
| 12 | 5,4 s | 9.241 | 1.051 µs | 3.555 µs |

Las tres corridas insertaron las 50.000 filas, con 0 rechazos y COUNT(*) correcto.

Interpretación
Más hilos mejoran el rendimiento de forma sostenida. Con 12 hilos se logran 9.241 filas/s, unas 8 veces más que con 1 hilo, y la latencia por INSERT se mantiene cerca de 1 ms. Hasta 12 hilos no hay señal de saturación de Oracle.
El escalado no es limpio. Pasar de 8 a 12 hilos (1,5 veces más) duplicó el rendimiento. Eso es más que lineal y apunta a ruido del entorno, no solo al efecto de los hilos.
El control de 1 hilo desmiente la corrida anterior. Con la misma configuración dio 1.146 filas/s, frente a las 511 de la prueba previa. El entorno varía hasta 2 veces entre corridas, así que la mejora de los hilos es real pero su magnitud exacta tiene un margen amplio.
Quedan picos de latencia aislados. El máximo llegó a 722 ms con 8 hilos y a 402 ms con 12. Los percentiles p95 y p99 sí se mantienen bajos.
El cliente no es el límite. Usó entre 17 y 23 s de CPU y menos de 240 MB de memoria.


---


## 9. Pruebas con 16 hilos
```powershell
PS D:\8vo Ciclo\SW\ingesta-demo> java -Xms2g -Xmx2g -jar target/quarkus-app/quarkus-run.jar --csv "D:\8vo Ciclo\SW\ingesta-demo\data\BD_Area1.csv" --area AREA1 --max-rows 50000 --commit-mode nowait --threads 16 --run-id a1_50k_nowait_t16 --latencias
19:00:00.980  Inicio corrida a1_50k_nowait_t16 | area=AREA1 motor=oracle hilos=16 commit=nowait csv=D:\8vo Ciclo\SW\ingesta-demo\data\BD_Area1.csv (145.1 MB)
19:00:01.548  Modo de commit: NOWAIT en cada sesion de trabajador
19:00:01.879  16 conexiones establecidas en 285.2 ms
19:00:10.675  Progreso: 50000 filas procesadas por la BD
19:00:10.981  ---- RESUMEN ----
19:00:10.981  Filas: total=50000 insertadas=50000 rech.validacion=0 rech.bd=0
19:00:10.981  Tiempo total (reloj): 8.85 s | lectura=1119 ms validacion=775 ms | insert acumulado (suma de hilos)=139717 ms | cuarentena acumulada=1 ms
19:00:10.985  Throughput: 5648 filas/s total | 5648 filas/s insertadas | hilos=16
19:00:10.987  Latencia INSERT (us): p50=1419 p95=3746 p99=7049 max=751305
19:00:10.987  JVM: heap pico=243 MB, GC=4 (65 ms), CPU proceso=24344 ms
19:00:10.987  Verificacion COUNT(*): antes=0 despues=50000 -> OK
PS D:\8vo Ciclo\SW\ingesta-demo> java -Xms2g -Xmx2g -jar target/quarkus-app/quarkus-run.jar --csv "D:\8vo Ciclo\SW\ingesta-demo\data\BD_Area1.csv" --area AREA1 --max-rows 50000 --commit-mode nowait --threads 16 --run-id a1_50k_nowait_t16 --latencias
19:01:15.337  Inicio corrida a1_50k_nowait_t16 | area=AREA1 motor=oracle hilos=16 commit=nowait csv=D:\8vo Ciclo\SW\ingesta-demo\data\BD_Area1.csv (145.1 MB)
19:01:15.884  Modo de commit: NOWAIT en cada sesion de trabajador
19:01:16.320  16 conexiones establecidas en 425.7 ms
19:01:27.070  Progreso: 50000 filas procesadas por la BD
19:01:27.198  ---- RESUMEN ----
19:01:27.198  Filas: total=50000 insertadas=50000 rech.validacion=0 rech.bd=0
19:01:27.198  Tiempo total (reloj): 10.77 s | lectura=799 ms validacion=542 ms | insert acumulado (suma de hilos)=171320 ms | cuarentena acumulada=0 ms
19:01:27.198  Throughput: 4643 filas/s total | 4643 filas/s insertadas | hilos=16
19:01:27.199  Latencia INSERT (us): p50=1539 p95=4078 p99=7102 max=1225785
19:01:27.199  JVM: heap pico=245 MB, GC=4 (43 ms), CPU proceso=18359 ms
19:01:27.199  Verificacion COUNT(*): antes=50000 despues=100000 -> OK
PS D:\8vo Ciclo\SW\ingesta-demo> java -Xms2g -Xmx2g -jar target/quarkus-app/quarkus-run.jar --csv "D:\8vo Ciclo\SW\ingesta-demo\data\BD_Area1.csv" --area AREA1 --max-rows 50000 --commit-mode nowait --threads 16 --run-id a1_50k_nowait_t16 --latencias
19:01:41.882  Inicio corrida a1_50k_nowait_t16 | area=AREA1 motor=oracle hilos=16 commit=nowait csv=D:\8vo Ciclo\SW\ingesta-demo\data\BD_Area1.csv (145.1 MB)
19:01:42.373  Modo de commit: NOWAIT en cada sesion de trabajador
19:01:42.592  16 conexiones establecidas en 206.9 ms
19:01:51.481  Progreso: 50000 filas procesadas por la BD
19:01:51.586  ---- RESUMEN ----
19:01:51.587  Filas: total=50000 insertadas=50000 rech.validacion=0 rech.bd=0
19:01:51.587  Tiempo total (reloj): 8.90 s | lectura=783 ms validacion=579 ms | insert acumulado (suma de hilos)=141439 ms | cuarentena acumulada=0 ms
19:01:51.587  Throughput: 5620 filas/s total | 5620 filas/s insertadas | hilos=16
19:01:51.587  Latencia INSERT (us): p50=1381 p95=3637 p99=5956 max=918553
19:01:51.587  JVM: heap pico=244 MB, GC=4 (40 ms), CPU proceso=20750 ms
19:01:51.588  Verificacion COUNT(*): antes=0 despues=50000 -> OK
PS D:\8vo Ciclo\SW\ingesta-demo> java -Xms2g -Xmx2g -jar target/quarkus-app/quarkus-run.jar --csv "D:\8vo Ciclo\SW\ingesta-demo\data\BD_Area1.csv" --area AREA1 --max-rows 50000 --commit-mode nowait --threads 16 --run-id a1_50k_nowait_t16 --latencias
19:01:58.823  Inicio corrida a1_50k_nowait_t16 | area=AREA1 motor=oracle hilos=16 commit=nowait csv=D:\8vo Ciclo\SW\ingesta-demo\data\BD_Area1.csv (145.1 MB)
19:01:59.270  Modo de commit: NOWAIT en cada sesion de trabajador
19:01:59.510  16 conexiones establecidas en 229.5 ms
19:02:07.694  Progreso: 50000 filas procesadas por la BD
19:02:08.138  ---- RESUMEN ----
19:02:08.138  Filas: total=50000 insertadas=50000 rech.validacion=0 rech.bd=0
19:02:08.138  Tiempo total (reloj): 8.21 s | lectura=874 ms validacion=576 ms | insert acumulado (suma de hilos)=130127 ms | cuarentena acumulada=0 ms
19:02:08.139  Throughput: 6089 filas/s total | 6089 filas/s insertadas | hilos=16
19:02:08.140  Latencia INSERT (us): p50=1711 p95=4334 p99=6631 max=816316
19:02:08.140  JVM: heap pico=241 MB, GC=4 (44 ms), CPU proceso=21734 ms
19:02:08.140  Verificacion COUNT(*): antes=50000 despues=100000 -> OK
```


Sí, con estos datos 12 hilos rinde mejor que 16. Con 16 hilos ya no se gana velocidad y se pierde eficiencia.

| Hilos | Filas/s | p50 | Insert acumulado |
| --- | --- | --- | --- |
| 12 (1 corrida) | 9.241 | 1,05 ms | 64 s |
| 16 (4 corridas) | 4.643 – 6.089 (promedio ~5.500) | 1,38 – 1,71 ms | 130 – 171 s |
16 hilos es más lento y menos estable. Rindió entre 4.643 y 6.089 filas/s, por debajo de los 9.241 de 12 hilos y también de los 4.857 de 8 hilos en el mejor caso.
Hay señales de saturación de Oracle. El p50 subió a 1,4–1,7 ms y el tiempo de INSERT acumulado se duplicó (130–171 s frente a 64 s con 12 hilos). Los hilos pasan más tiempo esperándose entre sí y no avanzan más.
Dos corridas no son válidas para comparar. La 2.ª y la 4.ª empezaron con 50.000 filas ya en la tabla (antes=50000), porque no se limpió. Las dos corridas limpias de 16 hilos dieron 5.648 y 5.620 filas/s, muy parecidas entre sí.
Se repitió el mismo --run-id. Las cuatro corridas de 16 hilos comparten nombre, así que sus archivos en out/a1_50k_nowait_t16/ se sobrescribieron. Usa un --run-id distinto por repetición.

Cautela: 12 hilos tiene una sola corrida, y ya vimos que el entorno puede variar hasta 2 veces. Conviene repetirlo 3 veces con la tabla limpia antes de afirmarlo como óptimo. Con lo medido, 12 es la mejor configuración.

---


## 10. Repetición de pruebas con 12 hilos
Resumen (12 hilos, 50.000 filas, nowait)
| Corrida | Filas previas en la tabla | Tiempo | Filas/s |
| --- | --- | --- | --- |
| 1 | 0 | 5,73 s | 8.731 |
| 2 | 50.000 | 6,04 s | 8.279 |
| 3 | 100.000 | 7,95 s | 6.287 |
Interpretación
Las tres insertaron todo correctamente. Hubo 0 rechazos y el COUNT(*) cuadra en cada una (la diferencia fue siempre de 50.000).
Con la tabla vacía, 12 hilos rinden unas 8.700 a 9.200 filas/s. La corrida 1 (8.731) coincide con la anterior limpia (9.241), así que ese valor es repetible.
Las corridas 2 y 3 no son comparables. Se ejecutaron sin limpiar la tabla (antes=50000 y antes=100000). Se ven más lentas (8.279 y 6.287 filas/s), pero eso mezcla dos efectos que no puedo separar: tabla e índice más grandes, y ruido del entorno.
La latencia por INSERT casi no cambió (p50 de 1,06 a 1,10 ms). La caída viene de que el tiempo acumulado de INSERT subió (68 s, 72 s, 94 s), probablemente por picos de espera más que por una lentitud general.
Se repitió el mismo --run-id. Los archivos de out/a1_50k_nowait_t12/ se sobrescribieron, así que solo queda la última corrida.
Conclusión

Para 12 hilos, el valor de referencia es ~9.000 filas/s con tabla vacía. Para tener una media confiable, repite con TRUNCATE entre corridas y un --run-id distinto en cada una.

---


## 11. Escalado a 500.000 filas: 12 hilos y `nowait`
## Resultados (500.000 filas, 12 hilos, `nowait`)

| Corrida | Filas previas en la tabla | Tiempo | Filas/s | p50 | p95 | p99 | Máx |
|---|---|---|---|---|---|---|---|
| 1 | 0 | 112,7 s | 4.437 | 1.489 µs | 3.611 µs | 6.029 µs | 1.079 ms |
| 2 | 500.000 | 98,5 s | 5.075 | 1.351 µs | 3.375 µs | 5.997 µs | 695 ms |
| 3 | 1.000.000 | 117,7 s | 4.249 | 1.503 µs | 4.272 µs | 8.204 µs | 823 ms |

- **Integridad:** las tres corridas insertaron 500.000 filas, con 0 rechazos de validación y de BD, y el `COUNT(*)` coincide (diferencia de 500.000 en cada una).
- **Condiciones de las corridas:** solo la corrida 1 partió de tabla vacía. Las corridas 2 y 3 empezaron con 500.000 y 1.000.000 filas, y las tres usaron el mismo `--run-id`, por lo que los archivos de `out/a1_500k_nowait_t12/` se sobrescribieron.
- **Frente a la línea base** (500.000 filas, 1 hilo, commit normal, 2.403,6 s y 208 filas/s), la corrida 1 tardó 112,7 s con 4.437 filas/s, unas 21 veces más rápido.
- **Frente a la prueba de 50.000 filas con 12 hilos** (8.300 a 9.200 filas/s con tabla vacía), a 500.000 filas el rendimiento fue de 4.437 filas/s, aproximadamente la mitad.
- **Hilos:** el tiempo de INSERT acumulado de la corrida 1 fue 1.345 s, es decir, unos 112 s por hilo, casi igual al tiempo de reloj. Los 12 hilos estuvieron ocupados durante toda la corrida.
- **Lectura y validación** sumaron unos 13,7 s de los 112,7 s.
- **Recursos de la JVM:** heap pico de 1.279 MB, 9 recolecciones de GC (125 ms) y 109,6 s de CPU del proceso.
- **Valor de referencia:** 4.437 filas/s, que corresponde a la corrida 1 con tabla vacía. Las otras dos no son comparables en las mismas condiciones.

---


## 12. Pruebas de inserción por lotes
```powershell
PS D:\8vo Ciclo\SW\ingesta-demo> java -Xms2g -Xmx2g -jar target/quarkus-app/quarkus-run.jar --csv "D:\8vo Ciclo\SW\ingesta-demo\data\BD_Area1.csv" --area AREA1 --max-rows 50000 --commit-mode nowait --threads 12 --batch-size 10 --run-id a1_50k_t12_b10 --latencias
19:41:57.225  Inicio corrida a1_50k_t12_b10 | area=AREA1 motor=oracle hilos=12 commit=nowait csv=D:\8vo Ciclo\SW\ingesta-demo\data\BD_Area1.csv (145.1 MB)
19:42:05.471  Modo de commit: NOWAIT en cada sesion de trabajador
19:42:06.424  12 conexiones establecidas en 923.7 ms
19:42:43.332  Progreso: 50000 filas procesadas por la BD
19:42:43.720  ---- RESUMEN ----
19:42:43.721  Filas: total=50000 insertadas=50000 rech.validacion=0 rech.bd=0
19:42:43.721  Tiempo total (reloj): 36.91 s | lectura=1727 ms validacion=1168 ms | insert acumulado (suma de hilos)=414817 ms | cuarentena acumulada=0 ms
19:42:43.723  Throughput: 1355 filas/s total | 1355 filas/s insertadas | hilos=12
19:42:43.725  Latencia INSERT (us): p50=0 p95=0 p99=0 max=0
19:42:43.728  Lotes: tamano=10 total=5000 con_fallback=0 | latencia lote (us): p50=5423 p95=14737 p99=35095
19:42:43.728  JVM: heap pico=328 MB, GC=2 (29 ms), CPU proceso=23297 ms
19:42:43.728  Verificacion COUNT(*): antes=0 despues=50000 -> OK
PS D:\8vo Ciclo\SW\ingesta-demo> java -Xms2g -Xmx2g -jar target/quarkus-app/quarkus-run.jar --csv "D:\8vo Ciclo\SW\ingesta-demo\data\BD_Area1.csv" --area AREA1 --max-rows 50000 --commit-mode nowait --threads 12 --batch-size 100 --run-id a1_50k_t12_b100 --latencias
19:43:56.267  Inicio corrida a1_50k_t12_b100 | area=AREA1 motor=oracle hilos=12 commit=nowait csv=D:\8vo Ciclo\SW\ingesta-demo\data\BD_Area1.csv (145.1 MB)
19:43:57.435  Modo de commit: NOWAIT en cada sesion de trabajador
19:43:57.683  12 conexiones establecidas en 216.9 ms
19:44:01.310  Progreso: 50000 filas procesadas por la BD
19:44:03.454  ---- RESUMEN ----
19:44:03.455  Filas: total=50000 insertadas=50000 rech.validacion=0 rech.bd=0
19:44:03.455  Tiempo total (reloj): 3.63 s | lectura=2364 ms validacion=1010 ms | insert acumulado (suma de hilos)=42273 ms | cuarentena acumulada=0 ms
19:44:03.455  Throughput: 13762 filas/s total | 13762 filas/s insertadas | hilos=12
19:44:03.455  Latencia INSERT (us): p50=0 p95=0 p99=0 max=0
19:44:03.455  Lotes: tamano=100 total=501 con_fallback=0 | latencia lote (us): p50=44302 p95=331088 p99=561512
19:44:03.459  JVM: heap pico=248 MB, GC=3 (37 ms), CPU proceso=15859 ms
19:44:03.460  Verificacion COUNT(*): antes=0 despues=50000 -> OK
PS D:\8vo Ciclo\SW\ingesta-demo> java -Xms2g -Xmx2g -jar target/quarkus-app/quarkus-run.jar --csv "D:\8vo Ciclo\SW\ingesta-demo\data\BD_Area1.csv" --area AREA1 --max-rows 50000 --commit-mode nowait --threads 12 --batch-size 1000 --run-id a1_50k_t12_b1000 --latencias
19:45:26.883  Inicio corrida a1_50k_t12_b1000 | area=AREA1 motor=oracle hilos=12 commit=nowait csv=D:\8vo Ciclo\SW\ingesta-demo\data\BD_Area1.csv (145.1 MB)
19:45:29.071  Modo de commit: NOWAIT en cada sesion de trabajador
19:45:29.655  12 conexiones establecidas en 551.5 ms
19:45:32.153  Progreso: 50000 filas procesadas por la BD
19:45:33.196  ---- RESUMEN ----
19:45:33.196  Filas: total=50000 insertadas=50000 rech.validacion=0 rech.bd=0
19:45:33.198  Tiempo total (reloj): 2.49 s | lectura=1384 ms validacion=609 ms | insert acumulado (suma de hilos)=16155 ms | cuarentena acumulada=0 ms
19:45:33.199  Throughput: 20063 filas/s total | 20063 filas/s insertadas | hilos=12
19:45:33.201  Latencia INSERT (us): p50=0 p95=0 p99=0 max=0
19:45:33.204  Lotes: tamano=1000 total=54 con_fallback=0 | latencia lote (us): p50=146538 p95=828375 p99=864551
19:45:33.205  JVM: heap pico=116 MB, GC=5 (101 ms), CPU proceso=16047 ms
19:45:33.205  Verificacion COUNT(*): antes=0 despues=50000 -> OK
```

Resultados (50.000 filas, 12 hilos, nowait)
| Lote | Tiempo | Filas/s | Lotes | Latencia de lote p50 | p99 | Fallbacks |
| --- | --- | --- | --- | --- | --- | --- |
| 10 | 36,9 s | 1.355 | 5.000 | 5,4 ms | 35 ms | 0 |
| 100 | 3,6 s | 13.762 | 501 | 44 ms | 562 ms | 0 |
| 1.000 | 2,5 s | 20.063 | 54 | 147 ms | 864 ms | 0 |
Integridad: las tres corridas insertaron las 50.000 filas, con 0 rechazos y COUNT(*) correcto. con_fallback=0 en todas, porque el CSV no tiene filas inválidas, así que el camino de rollback y reintento 1 a 1 no se ejercitó.
Lote de 100 y 1.000 frente a 12 hilos fila por fila (5,4 a 5,7 s y 8.700 a 9.200 filas/s con tabla vacía): 3,6 s y 2,5 s, es decir, entre 1,5 y 2,3 veces más rápido.
Lote de 10 es el más lento (36,9 s, 1.355 filas/s). Es unas 6 veces más lento que 12 hilos fila por fila. La conexión también tardó más (923,7 ms), y el log marcó 8 s entre el inicio y el aviso de modo de commit, lo que indica otra carga en el entorno durante esa corrida. Con una sola corrida por configuración no se puede atribuir la diferencia solo al tamaño del lote.
El 1.000 pasó a ser limitado por la lectura. Lectura más validación suman unos 2 s de los 2,49 s de reloj, así que el programa ya no espera a Oracle.
La latencia por lote crece con el tamaño: p50 de 5,4 ms (10), 44 ms (100) y 147 ms (1.000), y el p99 llega a 864 ms con 1.000 filas por lote.
Latencia INSERT = 0 es esperado en modo lotes. Esa métrica solo se llena con los reintentos fila por fila, y no hubo ninguno.
Recursos: el heap pico bajó a entre 116 y 328 MB y el GC se mantuvo en 2 a 5 recolecciones.

---


### 12.1. Evaluación del tamaño de lote
La más eficiente medida es 12 hilos con nowait y lotes de 1.000: 20.063 filas/s, 2,5 s por 50.000 filas. Es unas 100 veces más rápida que la línea base (195 filas/s) y 2,2 veces más rápida que 12 hilos fila por fila (~9.000 filas/s).

Por qué es la más eficiente:

Con lotes se paga un solo commit y un solo viaje de red por cada 1.000 filas, en lugar de uno por fila. Ese era el costo dominante que midimos desde el baseline.
A 1.000 filas por lote el programa ya espera poco a Oracle: lectura y validación suman unos 2 s de los 2,5 s totales. Un lote mayor no daría mucha más mejora.
También usa menos memoria (heap pico de 116 MB).

Limitaciones:

Es una corrida por configuración con 50.000 filas. Los lotes todavía no se han medido con 500.000 filas ni con tabla creciente.
El lote de 10 fue anómalo (1.355 filas/s) y coincidió con carga externa en el entorno, así que no sirve para comparar.
El camino de fallo (rollback y reintento 1 a 1) no se probó, porque el CSV no tiene filas inválidas.
Los lotes rompen la regla “1 a 1”. Si el profesor la exige, la mejor configuración que la respeta es 12 hilos con nowait fila por fila (~9.000 filas/s con tabla vacía).

---


## 13. Validación a escala completa: 500.000 filas por lotes
```powershell
PS D:\8vo Ciclo\SW\ingesta-demo> java -Xms2g -Xmx2g -jar target/quarkus-app/quarkus-run.jar --csv "D:\8vo Ciclo\SW\ingesta-demo\data\BD_Area1.csv" --area AREA1 --max-rows 500000 --commit-mode nowait --threads 12 --batch-size 1000 --run-id a1_500k_t12_b1000 --latencias
19:56:17.582  Inicio corrida a1_500k_t12_b1000 | area=AREA1 motor=oracle hilos=12 commit=nowait csv=D:\8vo Ciclo\SW\ingesta-demo\data\BD_Area1.csv (145.1 MB)
19:56:26.458  Modo de commit: NOWAIT en cada sesion de trabajador
19:56:27.521  12 conexiones establecidas en 1005.1 ms
19:56:31.040  Progreso: 50000 filas procesadas por la BD
19:56:32.465  Progreso: 100000 filas procesadas por la BD
19:56:34.620  Progreso: 150000 filas procesadas por la BD
19:56:35.924  Progreso: 200000 filas procesadas por la BD
19:56:37.000  Progreso: 250000 filas procesadas por la BD
19:56:38.314  Progreso: 300000 filas procesadas por la BD
19:56:39.443  Progreso: 350000 filas procesadas por la BD
19:56:40.784  Progreso: 400000 filas procesadas por la BD
19:56:41.906  Progreso: 450000 filas procesadas por la BD
19:56:43.093  Progreso: 500000 filas procesadas por la BD
19:56:44.933  ---- RESUMEN ----
19:56:44.937  Filas: total=500000 insertadas=500000 rech.validacion=0 rech.bd=0
19:56:44.938  Tiempo total (reloj): 15.57 s | lectura=10071 ms validacion=2951 ms | insert acumulado (suma de hilos)=113845 ms | cuarentena acumulada=1 ms
19:56:44.943  Throughput: 32111 filas/s total | 32111 filas/s insertadas | hilos=12
19:56:44.943  Latencia INSERT (us): p50=0 p95=0 p99=0 max=0
19:56:44.943  Lotes: tamano=1000 total=500 con_fallback=0 | latencia lote (us): p50=168952 p95=653263 p99=959971
19:56:44.943  JVM: heap pico=1197 MB, GC=11 (272 ms), CPU proceso=38578 ms
19:56:44.948  Verificacion COUNT(*): antes=100000 despues=600000 -> OK
PS D:\8vo Ciclo\SW\ingesta-demo> java -Xms2g -Xmx2g -jar target/quarkus-app/quarkus-run.jar --csv "D:\8vo Ciclo\SW\ingesta-demo\data\BD_Area1.csv" --area AREA1 --max-rows 500000 --commit-mode nowait --threads 12 --batch-size 1000 --run-id a1_500k_t12_b1000 --latencias
19:57:46.009  Inicio corrida a1_500k_t12_b1000 | area=AREA1 motor=oracle hilos=12 commit=nowait csv=D:\8vo Ciclo\SW\ingesta-demo\data\BD_Area1.csv (145.1 MB)
19:57:49.563  Modo de commit: NOWAIT en cada sesion de trabajador
19:57:49.887  12 conexiones establecidas en 305.1 ms
19:57:54.200  Progreso: 50000 filas procesadas por la BD
19:57:56.291  Progreso: 100000 filas procesadas por la BD
19:58:00.256  Progreso: 150000 filas procesadas por la BD
19:58:02.219  Progreso: 200000 filas procesadas por la BD
19:58:03.644  Progreso: 250000 filas procesadas por la BD
19:58:04.865  Progreso: 300000 filas procesadas por la BD
19:58:06.323  Progreso: 350000 filas procesadas por la BD
19:58:08.584  Progreso: 400000 filas procesadas por la BD
19:58:09.768  Progreso: 450000 filas procesadas por la BD
19:58:11.001  Progreso: 500000 filas procesadas por la BD
19:58:14.700  ---- RESUMEN ----
19:58:14.701  Filas: total=500000 insertadas=500000 rech.validacion=0 rech.bd=0
19:58:14.701  Tiempo total (reloj): 21.11 s | lectura=13631 ms validacion=4035 ms | insert acumulado (suma de hilos)=98780 ms | cuarentena acumulada=0 ms
19:58:14.703  Throughput: 23681 filas/s total | 23681 filas/s insertadas | hilos=12
19:58:14.704  Latencia INSERT (us): p50=0 p95=0 p99=0 max=0
19:58:14.707  Lotes: tamano=1000 total=500 con_fallback=0 | latencia lote (us): p50=96600 p95=825229 p99=2013266
19:58:14.707  JVM: heap pico=1193 MB, GC=9 (179 ms), CPU proceso=42859 ms
19:58:14.707  Verificacion COUNT(*): antes=600000 despues=1100000 -> OK
PS D:\8vo Ciclo\SW\ingesta-demo> java -Xms2g -Xmx2g -jar target/quarkus-app/quarkus-run.jar --csv "D:\8vo Ciclo\SW\ingesta-demo\data\BD_Area1.csv" --area AREA1 --max-rows 500000 --commit-mode nowait --threads 12 --batch-size 1000 --run-id a1_500k_t12_b1000 --latencias
19:58:29.794  Inicio corrida a1_500k_t12_b1000 | area=AREA1 motor=oracle hilos=12 commit=nowait csv=D:\8vo Ciclo\SW\ingesta-demo\data\BD_Area1.csv (145.1 MB)
19:58:31.200  Modo de commit: NOWAIT en cada sesion de trabajador
19:58:31.491  12 conexiones establecidas en 272.3 ms
19:58:33.503  Progreso: 50000 filas procesadas por la BD
19:58:34.691  Progreso: 100000 filas procesadas por la BD
19:58:37.145  Progreso: 150000 filas procesadas por la BD
19:58:38.929  Progreso: 200000 filas procesadas por la BD
19:58:40.714  Progreso: 250000 filas procesadas por la BD
19:58:41.898  Progreso: 300000 filas procesadas por la BD
19:58:43.182  Progreso: 350000 filas procesadas por la BD
19:58:44.369  Progreso: 400000 filas procesadas por la BD
19:58:47.695  Progreso: 450000 filas procesadas por la BD
19:58:48.788  Progreso: 500000 filas procesadas por la BD
19:58:51.583  ---- RESUMEN ----
19:58:51.583  Filas: total=500000 insertadas=500000 rech.validacion=0 rech.bd=0
19:58:51.583  Tiempo total (reloj): 17.30 s | lectura=10517 ms validacion=2808 ms | insert acumulado (suma de hilos)=103789 ms | cuarentena acumulada=1 ms
19:58:51.585  Throughput: 28897 filas/s total | 28897 filas/s insertadas | hilos=12
19:58:51.585  Latencia INSERT (us): p50=0 p95=0 p99=0 max=0
19:58:51.585  Lotes: tamano=1000 total=500 con_fallback=0 | latencia lote (us): p50=131203 p95=627573 p99=1370489
19:58:51.585  JVM: heap pico=1367 MB, GC=10 (226 ms), CPU proceso=42391 ms
19:58:51.585  Verificacion COUNT(*): antes=1100000 despues=1600000 -> OK
```

Resultados (500.000 filas, 12 hilos, nowait, lotes de 1.000)
| Corrida | Filas previas en la tabla | Tiempo | Filas/s | CPU del proceso Java (promedio) |
| --- | --- | --- | --- | --- |
| 1 | 100.000 | 15,6 s | 32.111 | ~2,5 núcleos |
| 2 | 600.000 | 21,1 s | 23.681 | ~2,0 núcleos |
| 3 | 1.100.000 | 17,3 s | 28.897 | ~2,5 núcleos |
Integridad: las tres insertaron 500.000 filas, con 0 rechazos y COUNT(*) correcto. con_fallback=0, porque el CSV no tiene filas inválidas.
El límite pasó a ser la lectura. Lectura más validación suman 13 a 17 s del tiempo total. Los 12 hilos de inserción trabajan unos 8 a 9 s cada uno, así que esperan datos del lector.
El tamaño previo de la tabla (100 mil a 1,1 millones) no muestra una tendencia clara. Las diferencias entre corridas (23 a 32 mil filas/s) caen dentro del ruido que ya habíamos visto.
Memoria: heap pico de 1,2 a 1,4 GB de los 2 GB reservados, con 9 a 11 recolecciones de GC (180 a 270 ms en total).

### 13.1. Evaluación del objetivo de rendimiento
¿Se cumplió el objetivo de menos de 1 minuto sin saturar la máquina?
Tiempo: sí, con lotes. 15,6 a 21,1 s para 500.000 filas. Sin lotes, con 12 hilos fila por fila, tomó 98 a 118 s, así que ese modo no lo cumple.


## 13.2. Validación a escala completa en PostgreSQL: Área 2

A diferencia de las pruebas anteriores de esta sección, que utilizaron Oracle para el Área 1, esta validación se ejecutó contra PostgreSQL para el Área 2. Se mantuvieron los parámetros principales de la estrategia por lotes: 500.000 filas por corrida, 12 hilos, `nowait` y lotes de 1.000 registros.

### Comando de ejecución

```powershell
PS D:\8vo Ciclo\SW\debt-system-poc\pruebas-ingesta\java-quarkus\ingesta-demo> java -Xms2g -Xmx2g -jar target/quarkus-app/quarkus-run.jar --csv "D:\8vo Ciclo\SW\ingesta-demo\data\BD_Area2.csv" --area AREA2 --max-rows 500000 --commit-mode nowait --threads 12 --batch-size 1000 --run-id a2_500k_t12_b1000 --latencias
```

### Resultados de las tres corridas

**Corrida 1**

```text
20:39:26.298  Inicio corrida a2_500k_t12_b1000 | area=AREA2 motor=postgresql hilos=12 commit=nowait csv=D:\8vo Ciclo\SW\ingesta-demo\data\BD_Area2.csv (167.4 MB)
20:39:26.546  Modo de commit: NOWAIT en cada sesion de trabajador
20:39:26.674  12 conexiones establecidas en 105.7 ms
20:39:28.011  Progreso: 50000 filas procesadas por la BD
20:39:28.798  Progreso: 100000 filas procesadas por la BD
20:39:29.536  Progreso: 150000 filas procesadas por la BD
20:39:30.640  Progreso: 200000 filas procesadas por la BD
20:39:31.496  Progreso: 250000 filas procesadas por la BD
20:39:32.301  Progreso: 300000 filas procesadas por la BD
20:39:33.073  Progreso: 350000 filas procesadas por la BD
20:39:33.767  Progreso: 400000 filas procesadas por la BD
20:39:34.566  Progreso: 450000 filas procesadas por la BD
20:39:35.273  Progreso: 500000 filas procesadas por la BD
20:39:35.414  ---- RESUMEN ----
20:39:35.414  Filas: total=500000 insertadas=500000 rech.validacion=0 rech.bd=0
20:39:35.414  Tiempo total (reloj): 8.60 s | lectura=5522 ms validacion=1858 ms | insert acumulado (suma de hilos)=35221 ms | cuarentena acumulada=0 ms
20:39:35.414  Throughput: 58161 filas/s total | 58161 filas/s insertadas | hilos=12
20:39:35.414  Latencia INSERT (us): p50=0 p95=0 p99=0 max=0
20:39:35.415  Lotes: tamano=1000 total=503 con_fallback=0 | latencia lote (us): p50=54591 p95=148242 p99=403702
20:39:35.416  JVM: heap pico=1070 MB, GC=10 (139 ms), CPU proceso=29203 ms
20:39:35.416  Verificacion COUNT(*): antes=0 despues=500000 -> OK
```

**Corrida 2**

```text
20:39:41.940  Inicio corrida a2_500k_t12_b1000 | area=AREA2 motor=postgresql hilos=12 commit=nowait csv=D:\8vo Ciclo\SW\ingesta-demo\data\BD_Area2.csv (167.4 MB)
20:39:42.223  Modo de commit: NOWAIT en cada sesion de trabajador
20:39:42.304  12 conexiones establecidas en 66.5 ms
20:39:43.796  Progreso: 50000 filas procesadas por la BD
20:39:44.615  Progreso: 100000 filas procesadas por la BD
20:39:45.335  Progreso: 150000 filas procesadas por la BD
20:39:46.182  Progreso: 200000 filas procesadas por la BD
20:39:47.244  Progreso: 250000 filas procesadas por la BD
20:39:48.171  Progreso: 300000 filas procesadas por la BD
20:39:48.878  Progreso: 350000 filas procesadas por la BD
20:39:49.639  Progreso: 400000 filas procesadas por la BD
20:39:50.364  Progreso: 450000 filas procesadas por la BD
20:39:50.983  Progreso: 500000 filas procesadas por la BD
20:39:51.215  ---- RESUMEN ----
20:39:51.215  Filas: total=500000 insertadas=500000 rech.validacion=0 rech.bd=0
20:39:51.215  Tiempo total (reloj): 8.68 s | lectura=5671 ms validacion=1679 ms | insert acumulado (suma de hilos)=38524 ms | cuarentena acumulada=0 ms
20:39:51.215  Throughput: 57617 filas/s total | 57617 filas/s insertadas | hilos=12
20:39:51.217  Latencia INSERT (us): p50=0 p95=0 p99=0 max=0
20:39:51.219  Lotes: tamano=1000 total=504 con_fallback=0 | latencia lote (us): p50=55083 p95=166724 p99=457441
20:39:51.220  JVM: heap pico=1072 MB, GC=10 (105 ms), CPU proceso=30516 ms
20:39:51.221  Verificacion COUNT(*): antes=500000 despues=1000000 -> OK
```

**Corrida 3**

```text
20:39:57.557  Inicio corrida a2_500k_t12_b1000 | area=AREA2 motor=postgresql hilos=12 commit=nowait csv=D:\8vo Ciclo\SW\ingesta-demo\data\BD_Area2.csv (167.4 MB)
20:39:57.839  Modo de commit: NOWAIT en cada sesion de trabajador
20:39:57.959  12 conexiones establecidas en 110.4 ms
20:39:59.341  Progreso: 50000 filas procesadas por la BD
20:40:00.113  Progreso: 100000 filas procesadas por la BD
20:40:00.803  Progreso: 150000 filas procesadas por la BD
20:40:01.517  Progreso: 200000 filas procesadas por la BD
20:40:02.220  Progreso: 250000 filas procesadas por la BD
20:40:03.035  Progreso: 300000 filas procesadas por la BD
20:40:03.701  Progreso: 350000 filas procesadas por la BD
20:40:04.468  Progreso: 400000 filas procesadas por la BD
20:40:05.164  Progreso: 450000 filas procesadas por la BD
20:40:05.812  Progreso: 500000 filas procesadas por la BD
20:40:05.948  ---- RESUMEN ----
20:40:05.948  Filas: total=500000 insertadas=500000 rech.validacion=0 rech.bd=0
20:40:05.949  Tiempo total (reloj): 7.85 s | lectura=5313 ms validacion=1423 ms | insert acumulado (suma de hilos)=35894 ms | cuarentena acumulada=0 ms
20:40:05.949  Throughput: 63678 filas/s total | 63678 filas/s insertadas | hilos=12
20:40:05.949  Latencia INSERT (us): p50=0 p95=0 p99=0 max=0
20:40:05.950  Lotes: tamano=1000 total=502 con_fallback=0 | latencia lote (us): p50=56394 p95=205259 p99=293077
20:40:05.950  JVM: heap pico=1366 MB, GC=10 (112 ms), CPU proceso=28422 ms
20:40:05.950  Verificacion COUNT(*): antes=1000000 despues=1500000 -> OK
```

### Resumen de métricas

| Corrida | Filas previas | Tiempo total | Throughput | Lotes | Latencia lote p50 | p95 | p99 | Heap pico |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 0 | 8,60 s | 58.161 filas/s | 503 | 54,6 ms | 148,2 ms | 403,7 ms | 1.070 MB |
| 2 | 500.000 | 8,68 s | 57.617 filas/s | 504 | 55,1 ms | 166,7 ms | 457,4 ms | 1.072 MB |
| 3 | 1.000.000 | 7,85 s | 63.678 filas/s | 502 | 56,4 ms | 205,3 ms | 293,1 ms | 1.366 MB |

Las tres corridas procesaron 500.000 filas cada una. El tiempo acumulado fue de 25,13 s para 1.500.000 filas, equivalente a un throughput agregado aproximado de 59.690 filas/s. El promedio aritmético de los throughputs reportados por corrida fue de aproximadamente 59.819 filas/s.

### Interpretación

**Integridad de los datos.** Las tres corridas insertaron las 500.000 filas previstas, sin rechazos de validación ni errores de base de datos. La verificación `COUNT(*)` fue correcta en todos los casos: pasó de 0 a 500.000, luego a 1.000.000 y finalmente a 1.500.000 registros. Por tanto, las pruebas confirman la ingesta correcta y acumulativa en PostgreSQL para el Área 2.

**Rendimiento.** Los tiempos se mantuvieron entre 7,85 y 8,68 segundos por cada 500.000 filas, con un throughput entre 57.617 y 63.678 filas/s. La tercera corrida fue la más rápida. La variación observada entre las tres ejecuciones es relativamente acotada, aunque estas mediciones por sí solas no permiten establecer un rendimiento universal ni descartar variaciones del entorno.

**Distribución del trabajo.** La lectura y la validación sumaron entre 6,74 y 7,38 segundos por corrida. El tiempo acumulado de inserción reportado como suma de los hilos fue de 35,2 a 38,5 segundos; no debe confundirse con el tiempo de reloj, porque corresponde a la suma del trabajo concurrente de los 12 trabajadores.

**Lotes y latencia.** Se procesaron lotes de tamaño 1.000, con 502 a 504 lotes reportados por corrida y sin fallback. La latencia p50 de lote se mantuvo alrededor de 55–56 ms. El p95 varió entre 148 y 205 ms y el p99 entre 293 y 457 ms. La métrica `Latencia INSERT` aparece en cero porque, al trabajar por lotes y no producirse fallback a inserciones individuales, no se registraron latencias de INSERT fila por fila; la métrica relevante en estas corridas es la latencia de lote.

**Recursos de la JVM.** El heap pico estuvo entre 1.070 y 1.366 MB, con 10 recolecciones de GC por corrida y pausas acumuladas de 105 a 139 ms. El consumo de CPU del proceso Java fue de 28,4 a 30,5 segundos por corrida.

**Acumulación de registros.** Las corridas 2 y 3 se ejecutaron sobre una tabla que ya contenía 500.000 y 1.000.000 de filas, respectivamente. Aun así, no se observa una caída del throughput en esta pequeña muestra: la tercera corrida fue la más rápida. No obstante, como solo se realizaron tres ejecuciones y no se controlaron otras variables del entorno, no corresponde concluir que el tamaño de la tabla carezca de efecto.

**Identificación de las ejecuciones.** Se reutilizó el mismo `--run-id` (`a2_500k_t12_b1000`) en las tres corridas. Para conservar los archivos de métricas de cada ejecución sin riesgo de sobrescritura, conviene asignar un identificador diferente a cada repetición.

### Conclusión de la prueba en PostgreSQL (Área 2)

La estrategia de inserción por lotes de 1.000 registros, con 12 hilos y modo `nowait`, completó correctamente tres cargas consecutivas de 500.000 filas en PostgreSQL. El tiempo por corrida fue inferior a 9 segundos y el throughput reportado superó las 57.000 filas/s, sin rechazos ni fallos de verificación.

Este resultado valida el funcionamiento de la estrategia a escala completa para el Área 2. Debe mantenerse separado de los resultados de Oracle del Área 1: son motores y conjuntos de datos distintos, por lo que estas cifras no constituyen por sí solas una comparación controlada entre PostgreSQL y Oracle.

---


## 14. Conclusión general de la demostración
Conclusión general de la demo (Área 1, Oracle, 500.000 filas)
| Configuración | Tiempo | Filas/s | Respeta “1 a 1” |
| --- | --- | --- | --- |
| 1 hilo, commit normal (línea base) | 2.403,6 s | 208 | Sí |
| 12 hilos, nowait | 98 – 118 s | 4.249 – 5.075 | Sí |
| 12 hilos, nowait, lotes de 1.000 | 15,6 – 21,1 s | 23.681 – 32.111 | No |
Cada paso atacó el cuello de botella que medimos: primero la espera del disco en cada commit (nowait), luego la espera de la base de datos con una sola conexión (hilos) y por último los commits y viajes de red por fila (lotes).
La mejora total frente a la línea base es de unas 114 a 154 veces.
El objetivo de menos de 1 minuto solo se logra rompiendo la regla “1 a 1”, o sea, con lotes. Si la regla es obligatoria, el mejor resultado es 98 a 118 s.

| Corridas (hora aprox.) | Pico de CPU de Oracle |
| --- | --- |
| 12 hilos, 50k filas, fila a fila (~19:10) | ~300 % |
| 12 hilos, 500k filas, fila a fila (19:20 a 19:28) | ~280 a 410 % |
| Lotes de 10, 100 y 1.000, 50k filas (~19:42 a 19:45) | ~150 a 180 % |
| 12 hilos, 500k filas, lotes de 1.000 (19:56 a 19:58) | ~150 a 180 % |
CPU: en Docker, 100 % equivale a un núcleo. Los picos son cortos y coinciden con las corridas. Al terminar, el uso baja a ~2,6 %, así que Oracle no queda consumiendo.
Fila a fila vs. lotes: con 12 hilos fila a fila Oracle llegó hasta ~410 %. Con lotes, el pico es de ~150 a 180 % y dura menos, porque la corrida termina en 16 a 21 s. Los lotes usaron menos CPU de Oracle y además terminaron antes.
Memoria: entre ~1,9 y ~2,8 GB de 7,59 GB, sin crecimiento sostenido y sin acercarse al límite.
Red: el tráfico acumulado sube en escalones que coinciden con las corridas grandes, hasta 1,3 GB recibidos y 336 MB enviados.
Disco: marca 0 B / 0 B en todo el período. Es el valor que reporta Docker Desktop aquí, no un dato real de uso. No hay información de disco en esta captura.
