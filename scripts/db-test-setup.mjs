// Creates a fresh test database, applies the Supabase shim and every migration
// in order. Used by `npm run db:test` locally and in CI.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const adminUrl = process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/postgres";
const dbName = process.env.TEST_DB_NAME ?? "maison_test";

const admin = new pg.Client({ connectionString: adminUrl });
await admin.connect();
await admin.query(`drop database if exists ${dbName} with (force)`);
await admin.query(`create database ${dbName}`);
await admin.end();

const url = new URL(adminUrl);
url.pathname = `/${dbName}`;
const db = new pg.Client({ connectionString: url.toString() });
await db.connect();

const run = async (label, sql) => {
  try {
    await db.query(sql);
    console.log(`  ✓ ${label}`);
  } catch (err) {
    console.error(`  ✗ ${label}\n    ${err.message}${err.position ? ` (at char ${err.position})` : ""}`);
    process.exit(1);
  }
};

console.log(`Preparing ${dbName}`);
await run("supabase shim", readFileSync("tests/db/supabase-shim.sql", "utf8"));
const dir = "supabase/migrations";
for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
  await run(file, readFileSync(join(dir, file), "utf8"));
}
await db.end();
