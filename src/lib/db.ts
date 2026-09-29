import postgres from "postgres";

let sql: postgres.Sql | undefined;

/** Shared Postgres client, or null when DATABASE_URL isn't configured. */
export function getSql(): postgres.Sql | null {
  if (sql) return sql;
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  sql = postgres(url, { max: 5, idle_timeout: 20, connect_timeout: 10, onnotice: () => {} });
  return sql;
}
