import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { oraclePool, closeOraclePool } from './config/dbOracle.js';
import { postgresPool, closePostgresPool } from './config/dbPostgres.js';

const BATCH_SIZE_ORACLE = 10_000; // Lotes grandes de 10k secuenciales para Oracle (máxima estabilidad local)
const BATCH_SIZE_PG = 1_000;       // Lotes de 1k para Postgres en paralelo
const CONCURRENCY_LIMIT_PG = 12;   // 12 hilos concurrentes para Postgres
type Area = 'AREA1' | 'AREA2';
type Row = string[];

// Columnas exactas de la tabla DEUDAS en Oracle (Área 1)
const area1Columns = [
  'codigo_interno_area', 'nro_documento', 'nombre', 'num_papeleta',
  'tipo_documento', 'placa_vehiculo', 'marca_vehiculo', 'modelo_vehiculo',
  'codigo_infraccion', 'calificacion_infraccion', 'puntos_infraccion',
  'fecha_infraccion', 'hora_infraccion', 'codigo_distrito',
  'direccion_infraccion', 'modalidad_deteccion', 'codigo_fiscalizador',
  'dni_conductor', 'numero_licencia', 'fecha_emision', 'fecha_notificacion',
  'medio_notificacion', 'fecha_vencimiento', 'monto_base',
  'porcentaje_descuento', 'monto_descuento', 'monto_interes',
  'estado_deuda', 'numero_resolucion'
] as const;

// Columnas exactas de la tabla deudas en PostgreSQL (Área 2)
const area2Columns = [
  'nro_documento', 'nombre', 'tipo_documento', 'num_papeleta',
  'placa_vehiculo', 'codigo_infraccion', 'calificacion_infraccion',
  'puntos_infraccion', 'fecha_infraccion', 'hora_infraccion',
  'codigo_distrito', 'direccion_infraccion', 'sede', 'modalidad_deteccion',
  'tipo_equipo', 'codigo_equipo', 'codigo_certificacion',
  'fecha_certificacion', 'fecha_emision', 'fecha_notificacion',
  'medio_notificacion', 'fecha_vencimiento', 'monto_base',
  'porcentaje_descuento', 'monto_descuento', 'monto_interes',
  'estado_deuda', 'numero_resolucion', 'codigo_operador'
] as const;

const oracleDateColumns = new Set([
  'fecha_infraccion', 'fecha_emision', 'fecha_notificacion', 'fecha_vencimiento'
]);

function argument(name: string, fallback?: string): string | undefined {
  const position = process.argv.indexOf(name);
  return position === -1 ? fallback : process.argv[position + 1];
}

function parseCsvLine(line: string): Row {
  const values: string[] = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') { value += '"'; index += 1; }
      else { quoted = !quoted; }
    } else if (character === ',' && !quoted) {
      values.push(value); value = '';
    } else { value += character; }
  }
  if (quoted) throw new Error('CSV inválido: comillas sin cerrar.');
  values.push(value);
  return values;
}

async function* readCsv(path: string): AsyncGenerator<Row> {
  const input = createReadStream(path, { encoding: 'utf8', highWaterMark: 1024 * 1024 });
  const lines = createInterface({ input, crlfDelay: Infinity });
  try {
    for await (const rawLine of lines) {
      const line = rawLine.replace(/^\uFEFF/, '');
      if (line.trim() === '') continue;
      yield parseCsvLine(line);
    }
  } finally {
    lines.close();
    input.destroy();
  }
}

function mapRow(header: string[], row: Row, columns: readonly string[]): Record<string, string | null> {
  const indexes = new Map(header.map((name, index) => [name.trim().toLowerCase(), index]));
  return Object.fromEntries(columns.map((column) => {
    const index = indexes.get(column.toLowerCase());
    if (index === undefined) throw new Error(`Falta columna requerida: ${column}`);
    const value = row[index]?.trim() ?? '';
    return [column, value === '' ? null : value];
  }));
}

// --- INGESTA SECUENCIAL ESTABLE ORACLE (Área 1) - Lotes de 10,000 ---
async function ingestOracle(path: string): Promise<number> {
  const connectionPool = await oraclePool;
  const connection = await connectionPool.getConnection();
  let header: string[] | undefined;
  let batch: Record<string, string | null>[] = [];
  let total = 0;

  const binds = area1Columns.map((c) => oracleDateColumns.has(c) ? `TO_DATE(:${c}, 'YYYY-MM-DD')` : `:${c}`).join(', ');
  const sql = `INSERT INTO area1.deudas (${area1Columns.join(', ')}, fecha_carga) VALUES (${binds}, SYSDATE)`;

  try {
    for await (const row of readCsv(path)) {
      if (!header) {
        header = row.map((column) => column.trim().toLowerCase());
        continue;
      }
      batch.push(mapRow(header, row, area1Columns));
      if (batch.length < BATCH_SIZE_ORACLE) continue;

      await connection.executeMany(sql, batch, { autoCommit: false });
      await connection.commit();
      total += batch.length;
      batch = [];
    }
    if (batch.length > 0) {
      await connection.executeMany(sql, batch, { autoCommit: false });
      await connection.commit();
      total += batch.length;
    }
    return total;
  } finally {
    await connection.close();
  }
}

// --- INGESTA PARALELA POSTGRESQL (Área 2) ---
async function ingestPostgres(path: string): Promise<number> {
  let header: string[] | undefined;
  let batch: Record<string, string | null>[] = [];
  const batches: Record<string, string | null>[][] = [];

  for await (const row of readCsv(path)) {
    if (!header) {
      header = row.map((column) => column.trim().toLowerCase());
      continue;
    }
    batch.push(mapRow(header, row, area2Columns));
    if (batch.length === BATCH_SIZE_PG) {
      batches.push(batch);
      batch = [];
    }
  }
  if (batch.length > 0) batches.push(batch);

  const columnsStr = area2Columns.join(', ');
  let total = 0;

  for (let i = 0; i < batches.length; i += CONCURRENCY_LIMIT_PG) {
    const chunkBatches = batches.slice(i, i + CONCURRENCY_LIMIT_PG);
    await Promise.all(chunkBatches.map(async (b) => {
      const client = await postgresPool.connect();
      try {
        const values: string[] = [];
        const parameters: unknown[] = [];
        for (const row of b) {
          const placeholders = area2Columns.map((_, idx) => `$${parameters.length + idx + 1}`);
          values.push(`(${placeholders.join(', ')}, CURRENT_TIMESTAMP)`);
          parameters.push(...area2Columns.map((col) => row[col]));
        }
        await client.query(
          `INSERT INTO area2.deudas (${columnsStr}, fecha_carga) VALUES ${values.join(', ')}`,
          parameters
        );
        total += b.length;
      } finally {
        client.release();
      }
    }));
  }
  return total;
}

async function main(): Promise<void> {
  const area = (argument('--area') ?? 'AREA1').toUpperCase() as Area;
  const path = argument('--csv');
  if (!path || !['AREA1', 'AREA2'].includes(area)) {
    throw new Error('Uso: npx tsx src/index.ts --area AREA1|AREA2 --csv ruta/al/archivo.csv');
  }

  console.time(`ingesta-${area}`);
  const total = area === 'AREA1' ? await ingestOracle(path) : await ingestPostgres(path);
  console.timeEnd(`ingesta-${area}`);
  console.log(`Registros insertados: ${total}.`);
}

main()
  .catch((error: unknown) => {
    console.error('Error de ingesta:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.allSettled([closeOraclePool(), closePostgresPool()]);
  });