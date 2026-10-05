import postgres from 'postgres';
import { readFile } from 'node:fs/promises';
process.loadEnvFile('.env.local');
const sql = postgres(process.env.POSTGRES_URL, { ssl: 'require', max: 1, prepare: false });
try {
  await sql.unsafe(await readFile('supabase/migrations/20261005074122_gapline_core.sql', 'utf8'));
  const result = await sql`select tablename, rowsecurity from pg_tables where schemaname='public' and tablename in ('user_state','market_snapshots')`;
  console.log(JSON.stringify(result));
} finally { await sql.end(); }
