package pe.demo;

import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.io.IOException;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.util.Map;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.resteasy.reactive.RestForm;
import org.jboss.resteasy.reactive.multipart.FileUpload;

@Path("/ingestas")
public class IngestaResource {

  @Inject JobRegistry registry;
  @Inject IngestaService service;

  @ConfigProperty(name = "ingesta.dir", defaultValue = "ingestas") String baseDir;
  @ConfigProperty(name = "ingesta.max-concurrentes", defaultValue = "2") int maxConcurrentes;

  /** Sube el CSV y lanza la ingesta en segundo plano. Responde 202 con el jobId. */
  @POST
  @Consumes(MediaType.MULTIPART_FORM_DATA)
  @Produces(MediaType.APPLICATION_JSON)
  public Response crear(@RestForm("archivo") FileUpload archivo, @RestForm("area") String area) {
    if (archivo == null) return error(400, "Falta el archivo CSV (campo 'archivo').");

    AreaSpec spec;
    try {
      spec = AreaSpecs.byName(area);
    } catch (IllegalArgumentException e) {
      return error(400, e.getMessage());
    }
    if (registry.activos() >= maxConcurrentes) {
      return error(429, "Hay ingestas en curso. Intente nuevamente en unos segundos.");
    }

    JobStatus job = registry.crear();
    try {
      java.nio.file.Path dir = java.nio.file.Path.of(baseDir, job.jobId());
      Files.createDirectories(dir);
      java.nio.file.Path csv = dir.resolve("entrada.csv");
      Files.move(archivo.uploadedFile(), csv, StandardCopyOption.REPLACE_EXISTING);  // el temporal se borra al terminar el request
      service.iniciar(job, spec, csv, dir);
    } catch (IOException e) {
      job.estado(JobStatus.Estado.FALLIDO);
      return error(500, "No se pudo guardar el archivo.");
    }
    return Response.accepted(job.snapshot()).location(URI.create("/ingestas/" + job.jobId())).build();
  }

  /** Avance: el front lo consulta cada 1-2 s hasta que el estado sea COMPLETADO o FALLIDO. */
  @GET
  @Path("/{jobId}")
  @Produces(MediaType.APPLICATION_JSON)
  public Response estado(@PathParam("jobId") String jobId) {
    JobStatus job = registry.obtener(jobId);
    if (job == null) return error(404, "Ingesta no encontrada o expirada.");
    return Response.ok(job.snapshot()).build();
  }

  /** Descarga el CSV con las filas rechazadas (disponible al terminar). */
  @GET
  @Path("/{jobId}/cuarentena")
  @Produces("text/csv")
  public Response cuarentena(@PathParam("jobId") String jobId) {
    JobStatus job = registry.obtener(jobId);
    if (job == null) return error(404, "Ingesta no encontrada o expirada.");
    if (job.activo()) return error(409, "La ingesta aun esta en curso.");
    java.nio.file.Path f = java.nio.file.Path.of(baseDir, jobId, "cuarentena.csv");
    if (!Files.exists(f)) return error(404, "No hay archivo de cuarentena.");
    return Response.ok(f.toFile())
            .header("Content-Disposition", "attachment; filename=\"cuarentena_" + jobId + ".csv\"")
            .build();
  }

  private static Response error(int status, String msg) {
    return Response.status(status).type(MediaType.APPLICATION_JSON).entity(Map.of("error", msg)).build();
  }
}