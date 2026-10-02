import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import postgres from "postgres";
import { baselineLegacy } from "./migration-core.mjs";
import { verifyLegacySchema } from "./legacy-schema.mjs";

const url = process.env.MIGRATION_DATABASE_URL;
if (!url) {
  console.error("MIGRATION_DATABASE_URL is not set; legacy baselining requires a privileged migration connection.");
  process.exitCode = 1;
} else {
  let migrationChanges;
  try {
    migrationChanges = execFileSync("git", ["status", "--porcelain", "--", "db/migrations"], { encoding: "utf8" });
  } catch {
    migrationChanges = "unavailable";
  }
  if (migrationChanges.trim()) {
    console.error("Legacy baseline refused; migration files must be committed and clean.");
    process.exitCode = 1;
  } else {
    const sql = postgres(url, { max: 1, onnotice: () => {} });
    const directory = join(dirname(fileURLToPath(import.meta.url)), "..", "db", "migrations");
    try {
      await baselineLegacy(sql, directory, verifyLegacySchema);
    } catch (error) {
      console.error(error instanceof Error ? error.message : "Legacy baseline failed.");
      process.exitCode = 1;
    } finally {
      await sql.end();
    }
  }
}