const validateCsvRows = (rows) => {
  const errors = [];

  rows.forEach((row, index) => {
    const rowNum = index + 2; // Considerando la cabecera como fila 1
    const { dni, monto_deuda } = row;

    // Validación de DNI: exactamente 8 dígitos numéricos
    const dniRegex = /^\d{8}$/;
    if (!dni || !dniRegex.test(dni.trim())) {
      errors.push(`Fila ${rowNum}: DNI inválido ("${dni}"). Debe tener exactamente 8 dígitos numéricos.`);
    }

    // Validación de Monto: debe ser un número válido
    if (monto_deuda === undefined || monto_deuda === '' || isNaN(Number(monto_deuda))) {
      errors.push(`Fila ${rowNum}: Monto inválido ("${monto_deuda}"). Debe ser un valor numérico.`);
    }
  });

  return errors;
};

module.exports = { validateCsvRows };