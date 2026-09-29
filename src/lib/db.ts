import postgres from "postgres";

let sql: postgres.Sql | undefined;

/**
 * Connection options for a DATABASE_URL.
 *
 * On serverless hosting use Supabase's transaction pooler (port 6543): many
 * short-lived function instances can't each hold a session-mode connection.
 * Transaction pooling hands out a different backend per transaction, so
 * named prepared statements must be off there (Supabase's guidance for
 * postgres.js). DATABASE_PREPARE=false forces this for other poolers.
 */
export function connectionOptions(url: string, env: Record<string, string | undefined> = process.env): postgres.Options<Record<string, never>> {
  let port = "";
  try {
    port = new URL(url).port;
  } catch {
    // Unparseable URLs are left for postgres.js to reject.
  }
  const transactionPooler = port === "6543" || env.DATABASE_PREPARE === "false";
  return { max: 5, idle_timeout: 20, connect_timeout: 10, onnotice: () => {}, ...(transactionPooler ? { prepare: false } : {}) };
}

/** Shared Postgres client, or null when DATABASE_URL isn't configured. */
export function getSql(): postgres.Sql | null {
  if (sql) return sql;
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  sql = postgres(url, connectionOptions(url));
  return sql;
}
