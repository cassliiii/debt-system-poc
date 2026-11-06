const bigquery = require('../config/bigquery');
const { validateCsvRows } = require('../middlewares/validator');

// 1. Ingesta de CSV (POST /upload)
// CSV esperado: dni,nombre,num_papeleta,tipo_monto,monto,concepto
const uploadCsvData = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se ha adjuntado ningún archivo CSV.' });
    }

    const area = req.body.area; // Ej: 'BD_Area1' o 'BD_Area2'
    if (!area || !['BD_Area1', 'BD_Area2'].includes(area)) {
      return res.status(400).json({ error: 'Área no especificada o inválida. Debe ser BD_Area1 o BD_Area2.' });
    }

    const fileContent = req.file.buffer.toString('utf8');
    const lines = fileContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    if (lines.length <= 1) {
      return res.status(400).json({ error: 'El archivo CSV está vacío o solo contiene la cabecera.' });
    }

    // Parseo básico del CSV: dni,nombre,num_papeleta,tipo_monto,monto,concepto
    const rows = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      return {
        dni: values[0],
        nombre: values[1],
        num_papeleta: values[2],
        tipo_monto: values[3] ? values[3].toUpperCase() : values[3],
        monto: parseFloat(values[4]),
        concepto: values[5]
      };
    });

    // Validar filas con el validador
    const validationErrors = validateCsvRows(rows);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        message: 'El archivo CSV contiene errores de formato.',
        errors: validationErrors
      });
    }

    const datasetId = process.env.BQ_DATASET || 'ds_sistema_deudas';
    const rowsToInsert = rows.map(r => ({
      dni: r.dni,
      nombre: r.nombre,
      num_papeleta: r.num_papeleta,
      tipo_monto: r.tipo_monto,
      monto: r.monto,
      concepto: r.concepto,
      fecha_carga: new Date().toISOString()
    }));

    // Inserción en BigQuery
    await bigquery.dataset(datasetId).table(area).insert(rowsToInsert);

    return res.status(200).json({
      success: true,
      message: `¡Archivo procesado e insertado exitosamente en ${area}!`,
      totalRegistros: rowsToInsert.length
    });

  } catch (error) {
    console.error('Error en uploadCsvData:', error);
    return res.status(500).json({ error: 'Error interno del servidor al procesar el archivo.', details: error.message });
  }
};

// 2. Consulta de Deuda por DNI (GET /consulta/:dni)
const getDebtByDni = async (req, res) => {
  try {
    const { dni } = req.params;

    const dniRegex = /^\d{8}$/;
    if (!dniRegex.test(dni)) {
      return res.status(400).json({ error: 'DNI inválido. Debe tener exactamente 8 dígitos.' });
    }

    const datasetId = process.env.BQ_DATASET || 'ds_sistema_deudas';
    const query = `
      SELECT dni, nombre, deuda_base_total, interes_total, deuda_total, detalle
      FROM \`${datasetId}.VW_Reporte_Deuda\`
      WHERE dni = @dni
    `;

    const options = {
      query: query,
      params: { dni: dni },
    };

    const [rows] = await bigquery.query(options);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Ciudadano no encontrado o sin registros de deuda.' });
    }

    return res.status(200).json({
      success: true,
      data: rows[0]
    });

  } catch (error) {
    console.error('Error en getDebtByDni:', error);
    return res.status(500).json({ error: 'Error al consultar la base de datos.', details: error.message });
  }
};

module.exports = {
  uploadCsvData,
  getDebtByDni
};
