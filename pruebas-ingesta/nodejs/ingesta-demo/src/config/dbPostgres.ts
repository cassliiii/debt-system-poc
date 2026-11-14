import pg from 'pg';

const { Pool } = pg;

export const postgresPool = new Pool({
  host: process.env.AREA2_HOST ?? 'localhost',
  port: Number(process.env.AREA2_PORT ?? 5429),
  database: process.env.AREA2_DB ?? 'db_area2',
  user: process.env.AREA2_USER ?? 'area2_user',
  password: process.env.AREA2_PASSWORD,
  max: Number(process.env.POSTGRES_POOL_MAX ?? 12),
  application_name: 'ingesta-demo-nodejs'
});

export async function closePostgresPool(): Promise<void> {
  await postgresPool.end();
}