const TIPOS_MONTO_VALIDOS = ['BASE', 'INTERES'];

const validateCsvRows = (rows) => {
  const errors = [];

  rows.forEach((row, index) => {
    const rowNum = index + 2; // Considerando la cabecera como fila 1
    const { dni, num_papeleta, tipo_monto, monto } = row;

    // Validación de DNI: exactamente 8 dígitos numéricos
    const dniRegex = /^\d{8}$/;
    if (!dni || !dniRegex.test(dni.trim())) {
      errors.push(`Fila ${rowNum}: DNI inválido ("${dni}"). Debe tener exactamente 8 dígitos numéricos.`);
    }

    // Validación de num_papeleta: no puede estar vacío
    if (!num_papeleta || !num_papeleta.trim()) {
      errors.push(`Fila ${rowNum}: num_papeleta vacío. Es obligatorio para trazar la deuda.`);
    }

    // Validación de tipo_monto: solo BASE o INTERES
    if (!tipo_monto || !TIPOS_MONTO_VALIDOS.includes(tipo_monto.trim().toUpperCase())) {
      errors.push(`Fila ${rowNum}: tipo_monto inválido ("${tipo_monto}"). Debe ser BASE o INTERES.`);
    }

    // Validación de Monto: debe ser un número válido
    if (monto === undefined || monto === '' || isNaN(Number(monto))) {
      errors.push(`Fila ${rowNum}: Monto inválido ("${monto}"). Debe ser un valor numérico.`);
    }
  });

  return errors;
};

module.exports = { validateCsvRows };
