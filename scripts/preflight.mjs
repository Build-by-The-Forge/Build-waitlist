import postgres from "postgres";
import { formatReport, resolvePreflightUrl, runPreflight } from "./preflight-core.mjs";

// Read-only production preflight. Run before db:baseline:legacy / db:migrate.
// Requires MIGRATION_DATABASE_URL in the process environment only.

let resolved;
try {
  resolved = resolvePreflightUrl(process.env);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

if (resolved) {
  const sql = postgres(resolved.url, { max: 1, onnotice: () => {} });
  try {
    const report = await runPreflight(sql);
    console.log(formatReport(report, resolved.target));
    process.exitCode = report.ok ? 0 : 1;
  } catch (error) {
    // Never echo a connection string, even if a driver error contains one.
    const message = (error instanceof Error ? error.message : String(error)).replace(/postgres(ql)?:\/\/\S+/gi, "<connection>");
    console.error(`Preflight could not complete: ${message}`);
    console.error("No writes were made: the preflight only runs inside a READ ONLY transaction.");
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
}
