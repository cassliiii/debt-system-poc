package pe.consulta.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;

/**
 * Un renglon del detalle de deuda (una papeleta aporta un item BASE y,
 * si corresponde, otro INTERES). Nombres de propiedad en snake_case para
 * mantener el mismo contrato que consumia el backend anterior (Node + BigQuery).
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record DebtDetailItem(
    @JsonProperty("area") String area,
    @JsonProperty("num_papeleta") String numPapeleta,
    @JsonProperty("tipo_monto") String tipoMonto,
    @JsonProperty("concepto") String concepto,
    @JsonProperty("monto") BigDecimal monto,
    @JsonProperty("estado") String estado,
    @JsonProperty("fecha_vencimiento") String fechaVencimiento) {
}
