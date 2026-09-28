// Applies every SQL file in db/migrations in filename order. Files must be idempotent.
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const sql = postgres(url, { max: 1 });
const dir = join(process.cwd(), "db", "migrations");
const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

try {
  for (const file of files) {
    await sql.unsafe(await readFile(join(dir, file), "utf8"));
    console.log(`applied ${file}`);
  }
} finally {
  await sql.end();
}
