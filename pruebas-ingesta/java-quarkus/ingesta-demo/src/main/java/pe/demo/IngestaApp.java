package pe.demo;

import io.agroal.api.AgroalDataSource;
import io.quarkus.agroal.DataSource;
import io.quarkus.picocli.runtime.annotations.TopCommand;
import jakarta.inject.Inject;
import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.IOException;
import java.io.PrintWriter;
import java.lang.management.GarbageCollectorMXBean;
import java.lang.management.ManagementFactory;
import java.lang.management.MemoryMXBean;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.sql.Types;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.HdrHistogram.Histogram;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import picocli.CommandLine.Command;
import picocli.CommandLine.Option;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;


import static pe.demo.ColumnType.*;

@TopCommand
@Command(name = "ingesta", mixinStandardHelpOptions = true,
        description = "Ingesta CSV -> BD (fila a fila, autocommit) con metricas.")
public class IngestaApp implements Callable<Integer> {

  @Option(names = "--csv", required = true, description = "Ruta del CSV") Path csv;
  @Option(names = "--area", required = true, description = "AREA1 (Oracle) o AREA2 (PostgreSQL)") String area;
  @Option(names = "--run-id", description = "Identificador de la corrida") String runId;
  @Option(names = "--out", defaultValue = "out", description = "Carpeta de salida") Path out;
  @Option(names = "--max-rows", defaultValue = "0", description = "Limita filas leidas (0 = todas)") long maxRows;
  @Option(names = "--latencias", description = "Guarda latencia de cada INSERT en latencias.csv") boolean latencias;
  @Option(names = "--progress-every", defaultValue = "50000") long progressEvery;
  @Option(names = "--commit-mode", defaultValue = "normal", description = "normal | nowait") String commitMode;
  @Option(names = "--threads", defaultValue = "1", description = "Hilos de insercion (cada uno con su conexion)") int threads;
  @Option(names = "--queue-size", defaultValue = "10000", description = "Tamano de la cola lector -> hilos") int queueSize;
  @Option(names = "--batch-size", defaultValue = "1", description = "Filas por lote (1 = fila a fila con autocommit)") int batchSize;

  @Inject @DataSource("area1") AgroalDataSource ds1;
  @Inject @DataSource("area2") AgroalDataSource ds2;

  @Override
  public Integer call() throws Exception {
    if (threads < 1) throw new IllegalArgumentException("--threads debe ser >= 1");

    if (batchSize < 1) throw new IllegalArgumentException("--batch-size debe ser >= 1");

    AreaSpec spec = AreaSpecs.byName(area);
    AgroalDataSource ds = spec.datasource().equals("area1") ? ds1 : ds2;
    if (runId == null) {
      runId = spec.name().toLowerCase() + "_" + DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss").format(LocalDateTime.now());
    }
    Path runDir = out.resolve(runId);
    Files.createDirectories(runDir);
    long fileBytes = Files.size(csv);

    try (RunLog log = new RunLog(runDir.resolve("run.log"))) {
      log.log("Inicio corrida %s | area=%s motor=%s hilos=%d commit=%s csv=%s (%.1f MB)",
              runId, spec.name(), spec.motor(), threads, commitMode, csv, fileBytes / 1048576.0);

      // Conexion principal: solo para los COUNT(*) de antes y despues
      try (Connection conn = ds.getConnection()) {
        conn.setAutoCommit(true);
        long countBefore = count(conn, spec.table());

        Timestamp loadTs = Timestamp.valueOf(LocalDateTime.now().withNano(0));
        RunMetrics m = new RunMetrics();                 // metricas del lector (+ las de los hilos al final)
        RowValidator validator = new RowValidator(spec);

        BlockingQueue<Job> queue = new ArrayBlockingQueue<>(queueSize);
        Job poison = new Job(-1, null, null);            // senal de fin
        AtomicLong processed = new AtomicLong();
        CountDownLatch ready = new CountDownLatch(threads);
        List<InsertWorker> workers = new ArrayList<>();

        if ("nowait".equalsIgnoreCase(commitMode)) {
          log.log("Modo de commit: NOWAIT en cada sesion de trabajador");
        }

        JvmSampler sampler = new JvmSampler(runDir.resolve("jvm.csv"));
        long gcCount0 = JvmSampler.gcCount(), gcMs0 = JvmSampler.gcMs(), cpu0 = JvmSampler.processCpuNs();
        sampler.start();

        long connNs;
        long totalNs;
        try (CsvRowReader reader = new CsvRowReader(csv, spec);
             QuarantineWriter quarantine = new QuarantineWriter(runDir.resolve("cuarentena.csv"), spec);
             BufferedWriter lat = latencias ? Files.newBufferedWriter(runDir.resolve("latencias.csv")) : null) {

          if (lat != null) lat.write("nro_fila,ok,ns\n");

          // ---- Abrir las N conexiones de trabajadores (se mide aparte) ----
          long c0 = System.nanoTime();
          for (int i = 0; i < threads; i++) {
            InsertWorker w = new InsertWorker("worker-" + (i + 1), ds, spec, commitMode, queue, poison,
                    loadTs, quarantine, lat, processed, progressEvery, log, ready, batchSize);
            workers.add(w);
            w.start();
          }
          ready.await();
          connNs = System.nanoTime() - c0;
          for (InsertWorker w : workers) {
            if (w.failure != null) throw new IllegalStateException("No se pudo iniciar " + w.getName(), w.failure);
          }
          log.log("%d conexiones establecidas en %.1f ms", threads, connNs / 1e6);

          // ---- Hilo principal: lee, valida y reparte ----
          long tStart = System.nanoTime();
          long rowNum = 0;

          while (true) {
            // 1. lectura + parseo CSV
            long t = System.nanoTime();
            boolean has = reader.hasNext();
            String[] raw = has ? reader.next() : null;
            m.readNs += System.nanoTime() - t;
            if (!has) break;
            rowNum++;
            m.total++;

            // 2. validacion local
            t = System.nanoTime();
            RowValidator.Result res = validator.validate(raw);
            m.validateNs += System.nanoTime() - t;

            if (res.error() != null) {
              m.rejectedLocal++;
              t = System.nanoTime();
              quarantine.write(rowNum, raw, res.error(), "VALIDACION");
              m.quarantineNs += System.nanoTime() - t;
            } else {
              // 3. el INSERT lo hacen los trabajadores
              enqueue(queue, new Job(rowNum, raw, res.values()), workers);
            }

            if (maxRows > 0 && rowNum >= maxRows) break;
          }

          // ---- Fin: una senal por trabajador y esperar a que terminen ----
          for (int i = 0; i < threads; i++) enqueue(queue, poison, workers);
          for (InsertWorker w : workers) w.join();
          for (InsertWorker w : workers) {
            if (w.failure != null) throw new IllegalStateException("Fallo en " + w.getName(), w.failure);
          }

          long tq = System.nanoTime();
          quarantine.flush();
          m.quarantineNs += System.nanoTime() - tq;
          totalNs = System.nanoTime() - tStart;
        }

        // Combinar las metricas de los trabajadores
        for (InsertWorker w : workers) m.merge(w.m);

        sampler.stopSampler();
        long cpuNs = JvmSampler.processCpuNs() - cpu0;
        long gcCount = JvmSampler.gcCount() - gcCount0, gcMs = JvmSampler.gcMs() - gcMs0;

        // ---- Verificacion de correccion ----
        long countAfter = count(conn, spec.table());
        long delta = countAfter - countBefore;
        boolean ok = delta == m.inserted && m.total == m.inserted + m.rejectedLocal + m.rejectedDb;

        // ---- Reporte (el throughput se calcula siempre sobre el tiempo de reloj) ----
        double totalS = totalNs / 1e9;

        Map<String, Object> d = new LinkedHashMap<>();
        d.put("run_id", runId);
        d.put("area", spec.name());
        d.put("motor", spec.motor());
        d.put("csv", csv.toString());
        d.put("csv_mb", fileBytes / 1048576.0);
        d.put("max_rows", maxRows);
        d.put("fecha_carga", loadTs.toString());
        d.put("commit_mode", commitMode);
        d.put("threads", threads);
        d.put("queue_size", queueSize);
        d.put("total_filas", m.total);
        d.put("insertadas", m.inserted);
        d.put("rechazadas_validacion", m.rejectedLocal);
        d.put("rechazadas_bd", m.rejectedDb);
        d.put("pct_rechazo", m.total == 0 ? 0.0 : 100.0 * (m.rejectedLocal + m.rejectedDb) / m.total);
        d.put("t_conexion_ms", connNs / 1e6);
        d.put("t_total_ms", totalNs / 1e6);
        d.put("t_lectura_ms", m.readNs / 1e6);
        d.put("t_validacion_ms", m.validateNs / 1e6);
        d.put("t_insert_acum_ms", m.insertNs / 1e6);          // suma entre hilos, NO tiempo de reloj
        d.put("t_cuarentena_acum_ms", m.quarantineNs / 1e6);  // suma entre hilos
        d.put("filas_seg_total", totalS == 0 ? 0.0 : m.total / totalS);
        d.put("filas_seg_insert", totalS == 0 ? 0.0 : m.inserted / totalS);
        d.put("mb_seg", totalS == 0 ? 0.0 : (fileBytes / 1048576.0) / totalS);
        d.put("lat_insert_media_us", m.insertOk.getMean() / 1000.0);
        d.put("lat_insert_p50_us", m.insertOk.getValueAtPercentile(50) / 1000.0);
        d.put("lat_insert_p95_us", m.insertOk.getValueAtPercentile(95) / 1000.0);
        d.put("lat_insert_p99_us", m.insertOk.getValueAtPercentile(99) / 1000.0);
        d.put("lat_insert_max_us", m.insertOk.getMaxValue() / 1000.0);
        d.put("lat_error_bd_media_us", m.insertFail.getMean() / 1000.0);
        d.put("lat_error_bd_p95_us", m.insertFail.getValueAtPercentile(95) / 1000.0);
        d.put("heap_pico_mb", sampler.peakHeapBytes() / 1048576.0);
        d.put("gc_count", gcCount);
        d.put("gc_ms", gcMs);
        d.put("cpu_proceso_ms", cpuNs / 1e6);
        d.put("count_bd_antes", countBefore);
        d.put("count_bd_despues", countAfter);
        d.put("conteo_ok", ok);
        d.put("java", System.getProperty("java.version"));
        d.put("os", System.getProperty("os.name"));
        d.put("cpus", Runtime.getRuntime().availableProcessors());
        d.put("jvm_max_heap_mb", Runtime.getRuntime().maxMemory() / 1048576.0);
        d.put("batch_size", batchSize);
        d.put("lotes_total", m.batches);
        d.put("lotes_con_fallback", m.batchFallbacks);
        d.put("lat_lote_p50_us", m.batchOk.getValueAtPercentile(50) / 1000.0);
        d.put("lat_lote_p95_us", m.batchOk.getValueAtPercentile(95) / 1000.0);
        d.put("lat_lote_p99_us", m.batchOk.getValueAtPercentile(99) / 1000.0);
        d.put("lat_lote_max_us", m.batchOk.getMaxValue() / 1000.0);

        ReportWriter.write(out, runDir, d);

        log.log("---- RESUMEN ----");
        log.log("Filas: total=%d insertadas=%d rech.validacion=%d rech.bd=%d", m.total, m.inserted, m.rejectedLocal, m.rejectedDb);
        log.log("Tiempo total (reloj): %.2f s | lectura=%.0f ms validacion=%.0f ms | insert acumulado (suma de hilos)=%.0f ms | cuarentena acumulada=%.0f ms",
                totalS, m.readNs / 1e6, m.validateNs / 1e6, m.insertNs / 1e6, m.quarantineNs / 1e6);
        log.log("Throughput: %.0f filas/s total | %.0f filas/s insertadas | hilos=%d",
                totalS == 0 ? 0 : m.total / totalS, totalS == 0 ? 0 : m.inserted / totalS, threads);
        log.log("Latencia INSERT (us): p50=%.0f p95=%.0f p99=%.0f max=%.0f",
                m.insertOk.getValueAtPercentile(50) / 1000.0, m.insertOk.getValueAtPercentile(95) / 1000.0,
                m.insertOk.getValueAtPercentile(99) / 1000.0, m.insertOk.getMaxValue() / 1000.0);
        log.log("Lotes: tamano=%d total=%d con_fallback=%d | latencia lote (us): p50=%.0f p95=%.0f p99=%.0f",
                batchSize, m.batches, m.batchFallbacks,
                m.batchOk.getValueAtPercentile(50) / 1000.0, m.batchOk.getValueAtPercentile(95) / 1000.0,
                m.batchOk.getValueAtPercentile(99) / 1000.0);
        log.log("JVM: heap pico=%.0f MB, GC=%d (%d ms), CPU proceso=%.0f ms",
                sampler.peakHeapBytes() / 1048576.0, gcCount, gcMs, cpuNs / 1e6);
        log.log("Verificacion COUNT(*): antes=%d despues=%d -> %s", countBefore, countAfter, ok ? "OK" : "DISCREPANCIA");
        return ok ? 0 : 2;
      }
    }
  }

  private static long count(Connection c, String table) throws SQLException {
    try (Statement st = c.createStatement(); ResultSet rs = st.executeQuery("SELECT COUNT(*) FROM " + table)) {
      rs.next();
      return rs.getLong(1);
    }
  }

  /** Se ejecuta en CADA conexion de trabajador: ALTER SESSION / SET valen solo por sesion. */
  static void applyCommitMode(Connection conn, AreaSpec spec, String commitMode) throws SQLException {
    if (!"nowait".equalsIgnoreCase(commitMode)) return;
    try (Statement st = conn.createStatement()) {
      if (spec.motor().equals("oracle")) {
        st.execute("ALTER SESSION SET COMMIT_LOGGING = BATCH");
        st.execute("ALTER SESSION SET COMMIT_WAIT = NOWAIT");
      } else {
        st.execute("SET synchronous_commit = off");
      }
    }
  }

  /** Pone un trabajo en la cola; si un trabajador murio, aborta en lugar de bloquearse para siempre. */
  private static void enqueue(BlockingQueue<Job> queue, Job job, List<InsertWorker> workers) throws InterruptedException {
    while (!queue.offer(job, 500, TimeUnit.MILLISECONDS)) {
      for (InsertWorker w : workers) {
        if (w.failure != null) throw new IllegalStateException("Fallo en " + w.getName(), w.failure);
      }
    }
  }
}

enum ColumnType { TEXT, INT, DECIMAL, DATE, LOAD_TS }

record ColumnSpec(String name, ColumnType type, boolean required) { }

record AreaSpec(String name, String motor, String table, String datasource, List<ColumnSpec> columns) { }

/** Define las columnas de cada area una sola vez. De aqui salen mapeo, validacion e INSERT. */
final class AreaSpecs {

  private AreaSpecs() { }

  private static ColumnSpec r(String n, ColumnType t) { return new ColumnSpec(n, t, true); }
  private static ColumnSpec o(String n, ColumnType t) { return new ColumnSpec(n, t, false); }

  private static final AreaSpec AREA1 = new AreaSpec("AREA1", "oracle", "area1.deudas", "area1", List.of(
          o("codigo_interno_area", TEXT),
          r("nro_documento", TEXT),
          r("nombre", TEXT),
          r("num_papeleta", TEXT),
          r("tipo_documento", TEXT),
          r("placa_vehiculo", TEXT),
          o("marca_vehiculo", TEXT),
          o("modelo_vehiculo", TEXT),
          r("codigo_infraccion", TEXT),
          r("calificacion_infraccion", TEXT),
          r("puntos_infraccion", INT),
          r("fecha_infraccion", DATE),
          r("hora_infraccion", TEXT),
          r("codigo_distrito", TEXT),
          r("direccion_infraccion", TEXT),
          r("modalidad_deteccion", TEXT),
          o("codigo_fiscalizador", TEXT),
          o("dni_conductor", TEXT),
          o("numero_licencia", TEXT),
          r("fecha_emision", DATE),
          r("fecha_notificacion", DATE),
          r("medio_notificacion", TEXT),
          r("fecha_vencimiento", DATE),
          r("monto_base", DECIMAL),
          r("porcentaje_descuento", DECIMAL),
          r("monto_descuento", DECIMAL),
          r("monto_interes", DECIMAL),
          r("estado_deuda", TEXT),
          r("numero_resolucion", TEXT),
          o("fecha_carga", LOAD_TS)));

  private static final AreaSpec AREA2 = new AreaSpec("AREA2", "postgresql", "area2.deudas", "area2", List.of(
          r("nro_documento", TEXT),
          r("nombre", TEXT),
          r("tipo_documento", TEXT),
          r("num_papeleta", TEXT),
          r("placa_vehiculo", TEXT),
          r("codigo_infraccion", TEXT),
          r("calificacion_infraccion", TEXT),
          r("puntos_infraccion", INT),
          r("fecha_infraccion", DATE),
          r("hora_infraccion", TEXT),
          r("codigo_distrito", TEXT),
          r("direccion_infraccion", TEXT),
          o("sede", TEXT),
          r("modalidad_deteccion", TEXT),
          o("tipo_equipo", TEXT),
          o("codigo_equipo", TEXT),
          o("codigo_certificacion", TEXT),
          o("fecha_certificacion", DATE),
          r("fecha_emision", DATE),
          r("fecha_notificacion", DATE),
          r("medio_notificacion", TEXT),
          r("fecha_vencimiento", DATE),
          r("monto_base", DECIMAL),
          r("porcentaje_descuento", DECIMAL),
          r("monto_descuento", DECIMAL),
          r("monto_interes", DECIMAL),
          r("estado_deuda", TEXT),
          r("numero_resolucion", TEXT),
          o("codigo_operador", TEXT),
          o("fecha_carga", LOAD_TS)));

  public static AreaSpec byName(String name) {
    return switch (name == null ? "" : name.trim().toUpperCase()) {
      case "AREA1" -> AREA1;
      case "AREA2" -> AREA2;
      default -> throw new IllegalArgumentException("Area invalida: " + name + " (use AREA1 o AREA2)");
    };
  }
}

/**
 * Lectura en streaming. Mapea por NOMBRE de cabecera: columnas extra se ignoran,
 * el orden no importa. Cada fila se devuelve alineada con spec.columns()
 * (null si la columna no viene en el CSV o la fila es corta).
 */
final class CsvRowReader implements Iterator<String[]>, AutoCloseable {

  private final CSVParser parser;
  private final Iterator<CSVRecord> it;
  private final int[] idx;

  public CsvRowReader(Path file, AreaSpec spec) throws IOException {
    BufferedReader br = new BufferedReader(Files.newBufferedReader(file, StandardCharsets.UTF_8), 1 << 16);
    br.mark(1);
    if (br.read() != 0xFEFF) {       // quita BOM si existe
      br.reset();
    }
    this.parser = CSVFormat.DEFAULT.builder()
            .setHeader()
            .setSkipHeaderRecord(true)
            .setTrim(true)
            .setIgnoreEmptyLines(true)
            .build()
            .parse(br);

    Map<String, Integer> header = new HashMap<>();
    parser.getHeaderMap().forEach((k, v) -> header.put(k.trim().toLowerCase(), v));

    List<ColumnSpec> cols = spec.columns();
    this.idx = new int[cols.size()];
    List<String> faltantes = new ArrayList<>();
    for (int i = 0; i < cols.size(); i++) {
      ColumnSpec c = cols.get(i);
      if (c.type() == ColumnType.LOAD_TS) { idx[i] = -1; continue; }
      Integer pos = header.get(c.name());
      idx[i] = pos == null ? -1 : pos;
      if (pos == null && c.required()) faltantes.add(c.name());
    }
    if (!faltantes.isEmpty()) {
      parser.close();
      throw new IllegalArgumentException("El CSV no tiene las columnas requeridas: " + faltantes);
    }
    this.it = parser.iterator();
  }

  @Override public boolean hasNext() { return it.hasNext(); }

  @Override public String[] next() {
    CSVRecord rec = it.next();
    String[] out = new String[idx.length];
    for (int i = 0; i < idx.length; i++) {
      out[i] = (idx[i] >= 0 && idx[i] < rec.size()) ? rec.get(idx[i]) : null;
    }
    return out;
  }

  @Override public void close() throws IOException { parser.close(); }
}

/**
 * Validacion local: obligatorias, formato de numeros/fechas y regla DNI (8 digitos).
 * Longitudes y precision NUMBER(15,2) se dejan a la BD a proposito (rechazo origen=BD).
 */
final class RowValidator {

  public record Result(Object[] values, String error) { }

  private static final Pattern DNI = Pattern.compile("\\d{8}");

  private final List<ColumnSpec> cols;
  private final int idxDoc;
  private final int idxTipo;

  public RowValidator(AreaSpec spec) {
    this.cols = spec.columns();
    int d = -1, t = -1;
    for (int i = 0; i < cols.size(); i++) {
      if (cols.get(i).name().equals("nro_documento")) d = i;
      if (cols.get(i).name().equals("tipo_documento")) t = i;
    }
    this.idxDoc = d;
    this.idxTipo = t;
  }

  public Result validate(String[] raw) {
    Object[] out = new Object[cols.size()];
    StringBuilder err = null;

    for (int i = 0; i < cols.size(); i++) {
      ColumnSpec c = cols.get(i);
      String v = raw[i];
      if (v != null && v.isEmpty()) v = null;

      if (v == null) {
        if (c.required()) err = add(err, c.name() + ": obligatorio");
        continue;
      }
      try {
        out[i] = switch (c.type()) {
          case TEXT -> v;
          case INT -> Integer.valueOf(v);
          case DECIMAL -> new BigDecimal(v);
          case DATE -> java.sql.Date.valueOf(LocalDate.parse(v));
          case LOAD_TS -> null;
        };
      } catch (RuntimeException e) {
        err = add(err, c.name() + ": formato invalido (" + v + ")");
      }
    }

    if (idxDoc >= 0 && idxTipo >= 0
            && "DNI".equalsIgnoreCase(String.valueOf(out[idxTipo]))
            && out[idxDoc] != null && !DNI.matcher((String) out[idxDoc]).matches()) {
      err = add(err, "nro_documento: DNI debe tener 8 digitos (" + out[idxDoc] + ")");
    }
    return new Result(out, err == null ? null : err.toString());
  }

  private static StringBuilder add(StringBuilder sb, String msg) {
    if (sb == null) return new StringBuilder(msg);
    return sb.append("; ").append(msg);
  }
}

/** INSERT generado desde el AreaSpec. Soporta INSERT simple y por lotes. */
final class RowInserter implements AutoCloseable {

  private final PreparedStatement ps;
  private final List<ColumnSpec> cols;

  public RowInserter(Connection conn, AreaSpec spec) throws SQLException {
    this.cols = spec.columns();
    String names = cols.stream().map(ColumnSpec::name).collect(Collectors.joining(", "));
    String marks = cols.stream().map(c -> "?").collect(Collectors.joining(", "));
    this.ps = conn.prepareStatement("INSERT INTO " + spec.table() + " (" + names + ") VALUES (" + marks + ")");
  }

  private void bind(Object[] v, Timestamp loadTs) throws SQLException {
    for (int i = 0; i < cols.size(); i++) {
      int p = i + 1;
      Object val = v[i];
      switch (cols.get(i).type()) {
        case LOAD_TS -> ps.setTimestamp(p, loadTs);
        case TEXT -> { if (val == null) ps.setNull(p, Types.VARCHAR); else ps.setString(p, (String) val); }
        case INT -> { if (val == null) ps.setNull(p, Types.INTEGER); else ps.setInt(p, (Integer) val); }
        case DECIMAL -> { if (val == null) ps.setNull(p, Types.NUMERIC); else ps.setBigDecimal(p, (BigDecimal) val); }
        case DATE -> { if (val == null) ps.setNull(p, Types.DATE); else ps.setDate(p, (java.sql.Date) val); }
      }
    }
  }

  public void insert(Object[] v, Timestamp loadTs) throws SQLException { bind(v, loadTs); ps.executeUpdate(); }
  public void addBatch(Object[] v, Timestamp loadTs) throws SQLException { bind(v, loadTs); ps.addBatch(); }
  public void executeBatch() throws SQLException { ps.executeBatch(); }
  public void clearBatch() throws SQLException { ps.clearBatch(); }

  @Override public void close() throws SQLException { ps.close(); }
}

/** Un unico CSV de cuarentena por corrida: columnas del area + nro_fila, motivo, origen. */
final class QuarantineWriter implements AutoCloseable {

  private final BufferedWriter w;
  private final List<ColumnSpec> cols;

  public QuarantineWriter(Path file, AreaSpec spec) throws IOException {
    this.cols = spec.columns();
    this.w = new BufferedWriter(Files.newBufferedWriter(file, StandardCharsets.UTF_8), 1 << 16);
    StringBuilder h = new StringBuilder("nro_fila");
    for (ColumnSpec c : cols) if (c.type() != ColumnType.LOAD_TS) h.append(',').append(c.name());
    h.append(",motivo,origen\n");
    w.write(h.toString());
  }

  public synchronized void write(long rowNum, String[] raw, String motivo, String origen) throws IOException {
    StringBuilder sb = new StringBuilder().append(rowNum);
    for (int i = 0; i < cols.size(); i++) {
      if (cols.get(i).type() == ColumnType.LOAD_TS) continue;
      sb.append(',').append(esc(raw[i]));
    }
    sb.append(',').append(esc(motivo)).append(',').append(origen).append('\n');
    w.write(sb.toString());
  }

  public synchronized void flush() throws IOException { w.flush(); }

  private static String esc(String s) {
    if (s == null) return "";
    if (s.indexOf(',') >= 0 || s.indexOf('"') >= 0 || s.indexOf('\n') >= 0 || s.indexOf('\r') >= 0) {
      return '"' + s.replace("\"", "\"\"") + '"';
    }
    return s;
  }

  @Override public void close() throws IOException { w.close(); }
}

/** Acumuladores por fase (nanosegundos) y contadores. Un hilo: sin sincronizacion. */
final class RunMetrics {

  private static final long MAX_NS = 60_000_000_000L;

  public long readNs, validateNs, insertNs, quarantineNs;
  public long total, inserted, rejectedLocal, rejectedDb;

  public final Histogram insertOk = new Histogram(MAX_NS, 3);
  public final Histogram insertFail = new Histogram(MAX_NS, 3);

  public void recordOk(long ns)   { insertNs += ns; insertOk.recordValue(Math.min(Math.max(ns, 1), MAX_NS)); }
  public void recordFail(long ns) { insertNs += ns; insertFail.recordValue(Math.min(Math.max(ns, 1), MAX_NS)); }

  public void merge(RunMetrics o) {
    readNs += o.readNs; validateNs += o.validateNs; insertNs += o.insertNs; quarantineNs += o.quarantineNs;
    total += o.total; inserted += o.inserted; rejectedLocal += o.rejectedLocal; rejectedDb += o.rejectedDb;
    batches += o.batches; batchFallbacks += o.batchFallbacks;
    insertOk.add(o.insertOk);
    insertFail.add(o.insertFail);
    batchOk.add(o.batchOk);
  }

  public long batches, batchFallbacks;
  public final Histogram batchOk = new Histogram(MAX_NS, 3);

  /** Lote confirmado completo con un solo commit. */
  public void recordBatchOk(long ns, int rows) {
    insertNs += ns; inserted += rows; batches++;
    batchOk.recordValue(Math.min(Math.max(ns, 1), MAX_NS));
  }

  /** Lote que fallo: se cuenta el tiempo perdido y se pasa a reintento fila por fila. */
  public void recordBatchFail(long ns) {
    insertNs += ns; batches++; batchFallbacks++;
  }
}

/** Muestrea heap, CPU del proceso y GC cada 1 s hacia jvm.csv. */
final class JvmSampler extends Thread {

  private final Path file;
  private final MemoryMXBean mem = ManagementFactory.getMemoryMXBean();
  private final com.sun.management.OperatingSystemMXBean os =
          (com.sun.management.OperatingSystemMXBean) ManagementFactory.getOperatingSystemMXBean();
  private volatile boolean running = true;
  private volatile long peakHeap = 0;

  public JvmSampler(Path file) {
    super("jvm-sampler");
    setDaemon(true);
    this.file = file;
  }

  public long peakHeapBytes() { return peakHeap; }

  public static long gcCount() {
    long n = 0;
    for (GarbageCollectorMXBean b : ManagementFactory.getGarbageCollectorMXBeans()) n += Math.max(0, b.getCollectionCount());
    return n;
  }

  public static long gcMs() {
    long n = 0;
    for (GarbageCollectorMXBean b : ManagementFactory.getGarbageCollectorMXBeans()) n += Math.max(0, b.getCollectionTime());
    return n;
  }

  public static long processCpuNs() {
    return ((com.sun.management.OperatingSystemMXBean) ManagementFactory.getOperatingSystemMXBean()).getProcessCpuTime();
  }

  @Override public void run() {
    long t0 = System.currentTimeMillis();
    try (BufferedWriter w = Files.newBufferedWriter(file)) {
      w.write("t_ms,heap_mb,cpu_proceso_pct,gc_count,gc_ms\n");
      while (running) {
        sample(w, t0);
        try { Thread.sleep(1000); } catch (InterruptedException e) { break; }
      }
      sample(w, t0);
    } catch (IOException ignored) { }
  }

  private void sample(BufferedWriter w, long t0) throws IOException {
    long used = mem.getHeapMemoryUsage().getUsed();
    if (used > peakHeap) peakHeap = used;
    double cpu = os.getProcessCpuLoad() * 100.0;
    w.write(String.format(Locale.ROOT, "%d,%.1f,%.1f,%d,%d%n",
            System.currentTimeMillis() - t0, used / 1048576.0, Math.max(cpu, 0), gcCount(), gcMs()));
    w.flush();
  }

  public void stopSampler() {
    running = false;
    interrupt();
    try { join(2000); } catch (InterruptedException ignored) { }
  }
}

/** Log simple: consola + run.log. */
final class RunLog implements AutoCloseable {

  private static final DateTimeFormatter F = DateTimeFormatter.ofPattern("HH:mm:ss.SSS");
  private final PrintWriter w;

  public RunLog(Path file) throws IOException {
    this.w = new PrintWriter(Files.newBufferedWriter(file), true);
  }

  public void log(String fmt, Object... args) {
    String line = LocalTime.now().format(F) + "  " + String.format(Locale.ROOT, fmt, args);
    System.out.println(line);
    w.println(line);
  }

  @Override public void close() { w.close(); }
}

/** Escribe <runDir>/resumen.json y agrega una fila a <out>/resultados.csv. */
final class ReportWriter {

  private ReportWriter() { }

  public static void write(Path outDir, Path runDir, Map<String, Object> data) throws IOException {
    StringBuilder j = new StringBuilder("{\n");
    int n = 0;
    for (Map.Entry<String, Object> e : data.entrySet()) {
      if (n++ > 0) j.append(",\n");
      j.append("  \"").append(e.getKey()).append("\": ");
      Object v = e.getValue();
      if (v instanceof Number || v instanceof Boolean) j.append(fmt(v));
      else j.append('"').append(String.valueOf(v).replace("\\", "\\\\").replace("\"", "\\\"")).append('"');
    }
    j.append("\n}\n");
    Files.writeString(runDir.resolve("resumen.json"), j.toString(), StandardCharsets.UTF_8);

    Path csv = outDir.resolve("resultados.csv");
    boolean nuevo = !Files.exists(csv);
    List<String> keys = new ArrayList<>(data.keySet());
    List<String> vals = new ArrayList<>();
    for (Object v : data.values()) vals.add(esc(fmt(v)));
    StringBuilder sb = new StringBuilder();
    if (nuevo) sb.append(String.join(",", keys)).append('\n');
    sb.append(String.join(",", vals)).append('\n');
    Files.writeString(csv, sb.toString(), StandardCharsets.UTF_8,
            StandardOpenOption.CREATE, StandardOpenOption.APPEND);
  }

  private static String fmt(Object v) {
    if (v instanceof Double || v instanceof Float) return String.format(Locale.ROOT, "%.3f", ((Number) v).doubleValue());
    return String.valueOf(v);
  }

  private static String esc(String s) {
    return (s.contains(",") || s.contains("\"")) ? '"' + s.replace("\"", "\"\"") + '"' : s;
  }

}

/** Trabajo que viaja del lector a los hilos de insercion. */
record Job(long rowNum, String[] raw, Object[] values) { }

/** Hilo de insercion: su propia conexion y PreparedStatement. batchSize=1 -> fila a fila con autocommit. */
final class InsertWorker extends Thread {

  private final AgroalDataSource ds;
  private final AreaSpec spec;
  private final String commitMode;
  private final BlockingQueue<Job> queue;
  private final Job poison;
  private final Timestamp loadTs;
  private final QuarantineWriter quarantine;
  private final BufferedWriter lat;
  private final AtomicLong processed;
  private final long progressEvery;
  private final RunLog log;
  private final CountDownLatch ready;
  private final int batchSize;

  final RunMetrics m = new RunMetrics();
  volatile Throwable failure;

  InsertWorker(String name, AgroalDataSource ds, AreaSpec spec, String commitMode,
               BlockingQueue<Job> queue, Job poison, Timestamp loadTs, QuarantineWriter quarantine,
               BufferedWriter lat, AtomicLong processed, long progressEvery, RunLog log,
               CountDownLatch ready, int batchSize) {
    super(name);
    setDaemon(true);
    this.ds = ds; this.spec = spec; this.commitMode = commitMode; this.queue = queue; this.poison = poison;
    this.loadTs = loadTs; this.quarantine = quarantine; this.lat = lat; this.processed = processed;
    this.progressEvery = progressEvery; this.log = log; this.ready = ready; this.batchSize = batchSize;
  }

  @Override public void run() {
    boolean signaled = false;
    try (Connection conn = ds.getConnection()) {
      conn.setAutoCommit(batchSize <= 1);          // lotes: commit manual
      IngestaApp.applyCommitMode(conn, spec, commitMode);
      try (RowInserter inserter = new RowInserter(conn, spec)) {
        ready.countDown();
        signaled = true;
        if (batchSize <= 1) runRowByRow(inserter);
        else runBatches(conn, inserter);
      }
    } catch (Throwable e) {
      failure = e;
    } finally {
      if (!signaled) ready.countDown();
    }
  }

  /** Modo original: 1 fila = 1 INSERT = 1 commit (autocommit). */
  private void runRowByRow(RowInserter inserter) throws Exception {
    while (true) {
      Job job = queue.take();
      if (job == poison) break;
      insertOne(inserter, null, job);
      progress(1);
    }
  }

  /** Modo lotes: acumula, inserta el lote con un commit; el ultimo lote parcial se envia al recibir la senal de fin. */
  private void runBatches(Connection conn, RowInserter inserter) throws Exception {
    List<Job> batch = new ArrayList<>(batchSize);
    boolean end = false;
    while (!end) {
      Job job = queue.take();
      if (job == poison) end = true; else batch.add(job);
      if (!batch.isEmpty() && (batch.size() >= batchSize || end)) {
        flushBatch(conn, inserter, batch);
        progress(batch.size());
        batch.clear();
      }
    }
  }

  /** Lote -> 1 commit. Si falla: rollback y reintento 1 a 1 SOLO de las filas de ese lote. */
  private void flushBatch(Connection conn, RowInserter inserter, List<Job> batch) throws Exception {
    long t = System.nanoTime();
    try {
      for (Job j : batch) inserter.addBatch(j.values(), loadTs);
      inserter.executeBatch();
      conn.commit();
      long ns = System.nanoTime() - t;
      m.recordBatchOk(ns, batch.size());
      writeLat(batch.get(0).rowNum(), 1, ns);      // una linea por lote (fila = primera del lote)
    } catch (SQLException e) {
      m.recordBatchFail(System.nanoTime() - t);
      try { conn.rollback(); } finally { inserter.clearBatch(); }
      for (Job j : batch) insertOne(inserter, conn, j);   // 1 a 1: las malas van a cuarentena
    }
  }

  /** INSERT de una fila. Con conn != null hace commit/rollback manual; con null usa autocommit. */
  private void insertOne(RowInserter inserter, Connection conn, Job job) throws Exception {
    long t = System.nanoTime();
    try {
      inserter.insert(job.values(), loadTs);
      if (conn != null) conn.commit();
      long ns = System.nanoTime() - t;
      m.recordOk(ns);
      m.inserted++;
      writeLat(job.rowNum(), 1, ns);
    } catch (SQLException e) {
      if (conn != null) conn.rollback();
      long ns = System.nanoTime() - t;
      m.recordFail(ns);
      m.rejectedDb++;
      writeLat(job.rowNum(), 0, ns);
      String motivo = "SQLState=" + e.getSQLState() + " code=" + e.getErrorCode() + " "
              + String.valueOf(e.getMessage()).split("\\R")[0];
      t = System.nanoTime();
      quarantine.write(job.rowNum(), job.raw(), motivo, "BD");
      m.quarantineNs += System.nanoTime() - t;
    }
  }

  private void progress(int k) {
    long after = processed.addAndGet(k);
    long before = after - k;
    if (progressEvery > 0 && before / progressEvery != after / progressEvery) {
      log.log("Progreso: %d filas procesadas por la BD", after);
    }
  }

  private void writeLat(long row, int ok, long ns) throws IOException {
    if (lat != null) {
      synchronized (lat) { lat.write(row + "," + ok + "," + ns + "\n"); }
    }
  }
}