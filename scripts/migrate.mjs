import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import postgres from "postgres";
import { runMigrations } from "./migration-core.mjs";

const url = process.env.MIGRATION_DATABASE_URL;
if (!url) {
  console.error("MIGRATION_DATABASE_URL is not set; migrations require a privileged migration connection.");
  process.exitCode = 1;
} else {
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  const directory = join(dirname(fileURLToPath(import.meta.url)), "..", "db", "migrations");
  try {
    await runMigrations(sql, directory);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Migration runner failed.");
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
}
