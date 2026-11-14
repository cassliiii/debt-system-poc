package pe.consulta.resource;

import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;
import org.jboss.logging.Logger;
import pe.consulta.model.DebtConsultaResponse;
import pe.consulta.service.DebtConsultaService;

/** GET /api/debt/consulta/{dni}: reporte de deuda consolidado (Area1 Oracle + Area2 PostgreSQL). */
@Path("/api/debt")
@Produces(MediaType.APPLICATION_JSON)
public class DebtConsultaResource {

  private static final Logger LOG = Logger.getLogger(DebtConsultaResource.class);
  private static final Pattern DNI_PATTERN = Pattern.compile("\\d{8}");

  @Inject
  DebtConsultaService debtConsultaService;

  @GET
  @Path("/consulta/{dni}")
  public Response getDebtByDni(@PathParam("dni") String dni) {
    if (dni == null || !DNI_PATTERN.matcher(dni).matches()) {
      return Response.status(Response.Status.BAD_REQUEST)
          .entity(Map.of("error", "DNI inválido. Debe tener exactamente 8 dígitos."))
          .build();
    }

    try {
      Optional<DebtConsultaResponse> consulta = debtConsultaService.consultarPorDni(dni);
      if (consulta.isEmpty()) {
        return Response.status(Response.Status.NOT_FOUND)
            .entity(Map.of("message", "Ciudadano no encontrado o sin registros de deuda."))
            .build();
      }
      return Response.ok(Map.of("success", true, "data", consulta.get())).build();
    } catch (Exception e) {
      LOG.error("Error al consultar deuda para dni=" + dni, e);
      return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
          .entity(Map.of(
              "error", "Error al consultar la base de datos.",
              "details", String.valueOf(e.getMessage())))
          .build();
    }
  }

  @GET
  @Path("/health")
  public Response health() {
    return Response.ok(Map.of("status", "OK", "message", "Consulta Service funcionando")).build();
  }
}
