package pe.demo;

import java.util.concurrent.atomic.AtomicLong;

/** Estado de una ingesta. Lo actualizan los hilos de insercion y lo lee el endpoint de avance. */
public final class JobStatus {

  public enum Estado { EN_COLA, EN_PROCESO, COMPLETADO, FALLIDO }

  /** Foto inmutable del estado, lista para serializar a JSON. */
  public record Snapshot(String jobId, Estado estado, long filasTotales,
                         long insertadas, long rechazadas, double porcentaje) { }

  private final String jobId;
  private volatile Estado estado = Estado.EN_COLA;
  private volatile long filasTotales;
  private final AtomicLong insertadas = new AtomicLong();
  private final AtomicLong rechazadas = new AtomicLong();

  public JobStatus(String jobId) { this.jobId = jobId; }

  public String jobId() { return jobId; }
  public Estado estado() { return estado; }
  public void estado(Estado e) { this.estado = e; }
  public void filasTotales(long n) { this.filasTotales = n; }

  /** Los hilos suman por lote (addAndGet(batch.size())), no fila por fila. */
  public void sumarInsertadas(long n) { insertadas.addAndGet(n); }
  public void sumarRechazadas(long n) { rechazadas.addAndGet(n); }

  public boolean activo() { return estado == Estado.EN_COLA || estado == Estado.EN_PROCESO; }

  public Snapshot snapshot() {
    long ins = insertadas.get();
    long rech = rechazadas.get();
    long total = filasTotales;
    double pct = total <= 0 ? 0.0 : Math.min(100.0, 100.0 * (ins + rech) / total);
    if (estado == Estado.COMPLETADO) pct = 100.0;
    return new Snapshot(jobId, estado, total, ins, rech, Math.round(pct * 10.0) / 10.0);
  }
}