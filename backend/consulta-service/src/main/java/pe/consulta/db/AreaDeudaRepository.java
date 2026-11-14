package pe.consulta.db;

import java.util.List;

/** Consulta de deudas por nro_documento (DNI) en un area especifica. */
public interface AreaDeudaRepository {

  List<DeudaRow> buscarPorDni(String dni) throws Exception;
}
