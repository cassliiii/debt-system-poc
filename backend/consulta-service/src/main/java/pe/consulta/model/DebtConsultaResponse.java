package pe.consulta.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.util.List;

/** Reporte consolidado de deuda de un DNI, uniendo Area1 (Oracle) y Area2 (PostgreSQL). */
public record DebtConsultaResponse(
    @JsonProperty("dni") String dni,
    @JsonProperty("nombre") String nombre,
    @JsonProperty("deuda_base_total") BigDecimal deudaBaseTotal,
    @JsonProperty("interes_total") BigDecimal interesTotal,
    @JsonProperty("deuda_total") BigDecimal deudaTotal,
    @JsonProperty("fecha_actualizacion") String fechaActualizacion,
    @JsonProperty("detalle") List<DebtDetailItem> detalle) {
}
