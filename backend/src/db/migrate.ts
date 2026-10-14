import { migrate } from 'drizzle-orm/node-postgres/migrator';
import * as path from 'path';
import { createDb } from './db';
import { loadEnv } from './load-env';

async function main() {
  loadEnv();
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  const { db, pool } = createDb(url);
  // Works from both src/db (tsx) and dist/db (compiled): migrations live in <backend>/drizzle.
  await migrate(db, { migrationsFolder: path.resolve(__dirname, '../../drizzle') });
  await pool.end();
  console.log('Migrations applied');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
