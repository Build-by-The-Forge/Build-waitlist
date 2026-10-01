// Applies each SQL file in db/migrations once, in filename order, recording it
// in waitlist.schema_migrations. Each file runs in its own transaction together
// with its bookkeeping row, so a failure leaves no half-applied migration.
//
// Databases migrated before tracking existed have no schema_migrations table:
// the first tracked run re-applies 001-005 (all idempotent) and records them.
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const sql = postgres(url, { max: 1, onnotice: () => {} });
const dir = join(process.cwd(), "db", "migrations");
const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

try {
  await sql`CREATE SCHEMA IF NOT EXISTS waitlist`;
  await sql`
    CREATE TABLE IF NOT EXISTS waitlist.schema_migrations (
      name       TEXT        PRIMARY KEY,
      checksum   TEXT        NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
  const applied = new Map((await sql`SELECT name, checksum FROM waitlist.schema_migrations`).map((r) => [r.name, r.checksum]));

  for (const file of files) {
    const body = await readFile(join(dir, file), "utf8");
    const checksum = createHash("sha256").update(body).digest("hex");
    if (applied.has(file)) {
      if (applied.get(file) !== checksum) console.warn(`warning: ${file} changed after it was applied; not re-running it`);
      else console.log(`skip    ${file} (already applied)`);
      continue;
    }
    await sql.begin(async (tx) => {
      await tx.unsafe(body);
      await tx`INSERT INTO waitlist.schema_migrations (name, checksum) VALUES (${file}, ${checksum})`;
    });
    console.log(`applied ${file}`);
  }
} finally {
  await sql.end();
}
