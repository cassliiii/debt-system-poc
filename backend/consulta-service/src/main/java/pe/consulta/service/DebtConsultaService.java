package pe.consulta.service;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import pe.consulta.db.Area1OracleRepository;
import pe.consulta.db.Area2PostgresRepository;
import pe.consulta.db.DeudaRow;
import pe.consulta.model.DebtConsultaResponse;
import pe.consulta.model.DebtDetailItem;

/**
 * Une las deudas de Area1 (Oracle) y Area2 (PostgreSQL) para un mismo DNI
 * y arma el reporte consolidado que consume la pantalla de consulta.
 */
@ApplicationScoped
public class DebtConsultaService {

  @Inject
  Area1OracleRepository area1Repository;

  @Inject
  Area2PostgresRepository area2Repository;

  public Optional<DebtConsultaResponse> consultarPorDni(String dni) throws Exception {
    List<DeudaRow> rows = new ArrayList<>();
    rows.addAll(area1Repository.buscarPorDni(dni));
    rows.addAll(area2Repository.buscarPorDni(dni));

    if (rows.isEmpty()) {
      return Optional.empty();
    }

    List<DebtDetailItem> detalle = new ArrayList<>();
    BigDecimal deudaBaseTotal = BigDecimal.ZERO;
    BigDecimal interesTotal = BigDecimal.ZERO;
    Timestamp fechaCargaMasReciente = null;
    String nombre = null;

    for (DeudaRow row : rows) {
      if (nombre == null && row.nombre() != null) {
        nombre = row.nombre();
      }

      BigDecimal montoBase = row.montoBase() == null ? BigDecimal.ZERO : row.montoBase();
      BigDecimal montoInteres = row.montoInteres() == null ? BigDecimal.ZERO : row.montoInteres();
      String fechaVencimiento = row.fechaVencimiento() == null
          ? null
          : row.fechaVencimiento().format(DateTimeFormatter.ISO_LOCAL_DATE);
      String concepto = buildConcepto(row);

      detalle.add(new DebtDetailItem(
          row.area(), row.numPapeleta(), "BASE", concepto, montoBase, row.estadoDeuda(), fechaVencimiento));
      detalle.add(new DebtDetailItem(
          row.area(), row.numPapeleta(), "INTERES", "Interes por mora", montoInteres, row.estadoDeuda(),
          fechaVencimiento));

      deudaBaseTotal = deudaBaseTotal.add(montoBase);
      interesTotal = interesTotal.add(montoInteres);

      if (row.fechaCarga() != null
          && (fechaCargaMasReciente == null || row.fechaCarga().after(fechaCargaMasReciente))) {
        fechaCargaMasReciente = row.fechaCarga();
      }
    }

    BigDecimal deudaTotal = deudaBaseTotal.add(interesTotal);
    String fechaActualizacion = fechaCargaMasReciente == null ? null : fechaCargaMasReciente.toInstant().toString();

    return Optional.of(new DebtConsultaResponse(
        dni, nombre, deudaBaseTotal, interesTotal, deudaTotal, fechaActualizacion, detalle));
  }

  private static String buildConcepto(DeudaRow row) {
    String calificacion = row.calificacionInfraccion() == null ? "" : row.calificacionInfraccion();
    String codigo = row.codigoInfraccion() == null ? "" : row.codigoInfraccion();
    if (calificacion.isBlank() && codigo.isBlank()) {
      return "Papeleta de transito";
    }
    return "Infraccion %s (%s)".formatted(codigo, calificacion).trim();
  }
}
