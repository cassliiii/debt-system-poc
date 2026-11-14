package pe.consulta.db;

import io.agroal.api.AgroalDataSource;
import io.quarkus.agroal.DataSource;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;

/** Lee deudas del Area 2 (PostgreSQL), tabla area2.deudas. */
@ApplicationScoped
public class Area2PostgresRepository implements AreaDeudaRepository {

  private static final String QUERY = """
      SELECT nro_documento, nombre, num_papeleta, codigo_infraccion, calificacion_infraccion,
             monto_base, monto_interes, estado_deuda, fecha_vencimiento, fecha_carga
      FROM area2.deudas
      WHERE nro_documento = ?
      """;

  @Inject
  @DataSource("area2")
  AgroalDataSource dataSource;

  @Override
  public List<DeudaRow> buscarPorDni(String dni) throws Exception {
    List<DeudaRow> rows = new ArrayList<>();
    try (Connection conn = dataSource.getConnection();
        PreparedStatement ps = conn.prepareStatement(QUERY)) {
      ps.setString(1, dni);
      try (ResultSet rs = ps.executeQuery()) {
        while (rs.next()) {
          java.sql.Date vencimiento = rs.getDate("fecha_vencimiento");
          Timestamp cargaTs = rs.getTimestamp("fecha_carga");
          rows.add(new DeudaRow(
              "BD_Area2",
              rs.getString("num_papeleta"),
              rs.getString("nombre"),
              rs.getString("codigo_infraccion"),
              rs.getString("calificacion_infraccion"),
              rs.getBigDecimal("monto_base"),
              rs.getBigDecimal("monto_interes"),
              rs.getString("estado_deuda"),
              vencimiento == null ? null : vencimiento.toLocalDate(),
              cargaTs));
        }
      }
    }
    return rows;
  }
}
