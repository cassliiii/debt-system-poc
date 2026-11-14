package pe.demo;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import jakarta.enterprise.context.ApplicationScoped;
import java.time.Duration;
import java.util.UUID;

/** Cache en memoria con los estados de las ingestas (se pierde si el contenedor se reinicia). */
@ApplicationScoped
public class JobRegistry {

  private final Cache<String, JobStatus> jobs = Caffeine.newBuilder()
          .maximumSize(100)                          // tope de jobs guardados
          .expireAfterAccess(Duration.ofMinutes(30)) // se borra 30 min despues de la ultima consulta
          .build();

  /** Crea un job nuevo en estado EN_COLA y lo registra. */
  public JobStatus crear() {
    String id = UUID.randomUUID().toString().substring(0, 8);
    JobStatus job = new JobStatus(id);
    jobs.put(id, job);
    return job;
  }

  /** Devuelve el job o null si no existe o ya expiro. */
  public JobStatus obtener(String jobId) {
    return jobs.getIfPresent(jobId);
  }

  /** Cantidad de ingestas en cola o en proceso (para limitar las simultaneas). */
  public long activos() {
    return jobs.asMap().values().stream().filter(JobStatus::activo).count();
  }
}