import "./config";
import { Pool, PoolClient, QueryResultRow } from "pg";

export type Db = Pool | PoolClient;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>,
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export function oneOrNull<T extends QueryResultRow>(rows: T[]): T | null {
  return rows[0] ?? null;
}
