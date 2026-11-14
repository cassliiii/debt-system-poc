package pe.consulta.db;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDate;

/**
 * Fila cruda leida de area1.deudas (Oracle) o area2.deudas (PostgreSQL),
 * antes de transformarla al contrato de respuesta de la API.
 */
public record DeudaRow(
    String area,
    String numPapeleta,
    String nombre,
    String codigoInfraccion,
    String calificacionInfraccion,
    BigDecimal montoBase,
    BigDecimal montoInteres,
    String estadoDeuda,
    LocalDate fechaVencimiento,
    Timestamp fechaCarga) {
}
