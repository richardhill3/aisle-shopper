import fs from "node:fs";
import path from "node:path";
import "../src/config";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  const schema = fs.readFileSync(
    path.join(process.cwd(), "api/schema.sql"),
    "utf8",
  );
  await pool.query(schema);
  await pool.end();
}

main().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
