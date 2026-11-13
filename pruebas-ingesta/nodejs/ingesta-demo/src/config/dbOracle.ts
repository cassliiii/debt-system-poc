import oracledb from 'oracledb';

export const oraclePool = oracledb.createPool({
  user: process.env.AREA1_USER ?? 'AREA1',
  password: process.env.AREA1_PASSWORD,
  connectString: process.env.AREA1_DSN ?? 'localhost:1521/FREEPDB1',
  poolMin: Number(process.env.ORACLE_POOL_MIN ?? 4),
  poolMax: Number(process.env.ORACLE_POOL_MAX ?? 12),
  poolIncrement: 0,
  stmtCacheSize: Number(process.env.ORACLE_STMT_CACHE_SIZE ?? 20)
});

export async function closeOraclePool(): Promise<void> {
  const pool = await oraclePool;
  await pool.close(10);
}