/**
 * Parsea un CSV con separador coma, comillas escapadas y saltos de línea.
 * @param {string} text
 * @returns {{ header: string[], rows: string[][] }}
 */
export function parseCsv(text) {
  const input = String(text ?? '').replace(/^\uFEFF/, '')
  const records = []

  let record = []
  let field = ''
  let inQuotes = false
  let recordTouched = false

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index]

    if (inQuotes) {
      if (char === '"') {
        if (input[index + 1] === '"') {
          field += '"'
          index += 1
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }

      continue
    }

    if (char === '"') {
      inQuotes = true
      recordTouched = true
      continue
    }

    if (char === ',') {
      record.push(field)
      field = ''
      recordTouched = true
      continue
    }

    if (char === '\r' || char === '\n') {
      if (char === '\r' && input[index + 1] === '\n') {
        index += 1
      }

      record.push(field)
      records.push(record)
      record = []
      field = ''
      recordTouched = false
      continue
    }

    field += char
    recordTouched = true
  }

  if (recordTouched || field !== '' || record.length > 0) {
    record.push(field)
    records.push(record)
  }

  if (records.length === 0) {
    return { header: [], rows: [] }
  }

  const [header, ...rows] = records
  return { header, rows }
}
