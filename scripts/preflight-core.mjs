import { CONSTRAINTS, INDEXES, verifyLegacySchema } from "./legacy-schema.mjs";

// Read-only production preflight: proves a database is exactly the legacy
// 001–005 shape that db:baseline:legacy and migration 006 expect, without
// writing anything. Every query runs inside BEGIN READ ONLY (so PostgreSQL
// itself rejects any write) and the transaction is always rolled back.

export const EXPECTED_TABLES = ["admin_audit", "admin_users", "email_deliveries", "rate_limits", "signups"];
/** Names migration 006 creates only "if not exists", so a pre-existing object would be silently skipped. */
export const MIGRATION_006_CONSTRAINTS = ["admin_users_slot_range", "admin_users_active_needs_slot"];
export const MIGRATION_006_INDEX = "admin_users_active_slot";

const RUNTIME_ROLE = "waitlist_app";
const TRANSACTION_POOLER_PORT = "6543";

/**
 * The preflight takes only an explicit MIGRATION_DATABASE_URL. It never falls
 * back to, and refuses to reuse, the runtime connections or the runtime role.
 */
export function resolvePreflightUrl(env = process.env) {
  const url = env.MIGRATION_DATABASE_URL?.trim();
  if (!url) throw new Error("MIGRATION_DATABASE_URL is not set; the preflight requires the privileged migration connection and never falls back to runtime URLs.");
  for (const runtime of ["DATABASE_URL", "WAITLIST_APP_DATABASE_URL"]) {
    if (env[runtime]?.trim() && env[runtime].trim() === url) {
      throw new Error(`MIGRATION_DATABASE_URL is identical to ${runtime}; refusing to use a runtime connection for the preflight.`);
    }
  }
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("MIGRATION_DATABASE_URL is not a valid connection URL.");
  }
  // Supavisor usernames are "<role>.<project-ref>".
  const role = decodeURIComponent(parsed.username).split(".")[0];
  if (role === RUNTIME_ROLE) throw new Error(`MIGRATION_DATABASE_URL uses the ${RUNTIME_ROLE} runtime role; the preflight requires the privileged migration role.`);
  if (parsed.port === TRANSACTION_POOLER_PORT) {
    throw new Error("MIGRATION_DATABASE_URL targets the transaction pooler (port 6543); use the direct connection or session pooler (port 5432), as the migration itself will.");
  }
  return { url, target: { host: parsed.hostname, port: parsed.port || "5432", database: decodeURIComponent(parsed.pathname.replace(/^\//, "")) } };
}

const ROLLBACK = Symbol("rollback");

/** Runs fn inside BEGIN READ ONLY and always rolls back. Writes fail inside PostgreSQL. */
export async function withReadOnly(sql, fn) {
  let result;
  try {
    await sql.begin("read only", async (tx) => {
      result = await fn(tx);
      throw ROLLBACK;
    });
  } catch (error) {
    if (error !== ROLLBACK) throw error;
  }
  return result;
}

export async function runPreflight(sql) {
  return withReadOnly(sql, async (tx) => {
    const checks = [];
    const add = (name, ok, detail = "") => checks.push({ name, ok: Boolean(ok), detail });

    const [{ transaction_read_only: readOnly }] = await tx`SHOW transaction_read_only`;
    add("transaction is READ ONLY", readOnly === "on", `transaction_read_only=${readOnly}`);

    const [identity] = await tx`
      SELECT current_database() AS database, current_user AS role,
             current_setting('server_version') AS version,
             (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) AS superuser`;
    add("connected role is not the runtime role", identity.role !== RUNTIME_ROLE, `role=${identity.role}`);

    const [{ present: schemaPresent }] = await tx`SELECT count(*)::int AS present FROM pg_namespace WHERE nspname = 'waitlist'`;
    add("schema waitlist exists", schemaPresent === 1);
    if (schemaPresent !== 1) return { ok: false, checks, identity, counts: {}, catalog: {} };

    const relations = await tx`
      SELECT c.relname AS name, c.relkind AS kind, pg_get_userbyid(c.relowner) AS owner,
             pg_has_role(current_user, c.relowner, 'USAGE') AS owned, c.relrowsecurity AS rls
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'waitlist' AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
      ORDER BY c.relname`;
    const names = relations.map((r) => r.name);
    const missing = EXPECTED_TABLES.filter((t) => !names.includes(t));
    const unexpected = names.filter((t) => !EXPECTED_TABLES.includes(t));
    add("the five expected tables exist", missing.length === 0, missing.length ? `missing: ${missing.join(", ")}` : EXPECTED_TABLES.join(", "));
    add("no unexpected tables/views in waitlist", unexpected.length === 0, unexpected.length ? `unexpected: ${unexpected.join(", ")}` : "");

    const expected = relations.filter((r) => EXPECTED_TABLES.includes(r.name));
    const notOwned = expected.filter((r) => !r.owned);
    add("migration role owns the five tables (006 runs ALTER TABLE)", missing.length === 0 && notOwned.length === 0,
      notOwned.length ? `not owned: ${notOwned.map((r) => `${r.name} (owner ${r.owner})`).join(", ")}` : `owner: ${[...new Set(expected.map((r) => r.owner))].join(", ")}`);
    const [{ can_create: canCreate }] = await tx`SELECT has_schema_privilege(current_user, 'waitlist', 'CREATE') AS can_create`;
    add("migration role may CREATE in waitlist (baseline creates the ledger)", canCreate);

    let legacyError = null;
    try {
      await verifyLegacySchema(tx);
    } catch (error) {
      legacyError = error instanceof Error ? error.message : String(error);
    }
    add("exact legacy 001–005 schema verification", legacyError === null, legacyError ?? "");

    const [state] = await tx`
      SELECT to_regclass('waitlist.schema_migrations') IS NOT NULL AS ledger,
             to_regclass('waitlist.admin_users_single_active') IS NOT NULL AS single_active,
             to_regclass(${`waitlist.${MIGRATION_006_INDEX}`}) IS NOT NULL AS slot_index,
             (SELECT count(*)::int FROM information_schema.columns
              WHERE table_schema = 'waitlist' AND table_name = 'admin_users' AND column_name = 'admin_slot') AS slot_column`;
    add("waitlist.schema_migrations does not exist", !state.ledger);
    add("admin_users_single_active exists", state.single_active);
    add("admin_users.admin_slot does not exist", state.slot_column === 0);
    add(`no relation named waitlist.${MIGRATION_006_INDEX}`, !state.slot_index);

    // 006 checks pg_constraint by name across every schema, so an exact-name
    // match anywhere in this database would make it skip a constraint.
    const clashes = await tx`
      SELECT n.nspname AS schema, coalesce(t.relname, '-') AS relation, c.conname AS name
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      LEFT JOIN pg_class t ON t.oid = c.conrelid
      WHERE c.conname = ANY(${MIGRATION_006_CONSTRAINTS}::text[])
      ORDER BY 1, 2, 3`;
    add("migration-006 constraint names are unused in every schema", clashes.length === 0,
      clashes.map((c) => `${c.schema}.${c.relation}.${c.name}`).join(", "));

    const constraints = await tx`
      SELECT t.relname AS relation, c.conname AS name, c.contype AS type
      FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'waitlist'
        -- PostgreSQL 18+ records NOT NULL as contype 'n'; nullability is
        -- already verified column by column by the legacy verifier.
        AND c.contype <> 'n'
      ORDER BY 1, 2`;
    const indexes = await tx`SELECT tablename AS relation, indexname AS name FROM pg_indexes WHERE schemaname = 'waitlist' ORDER BY 1, 2`;
    const extraConstraints = constraints.filter((c) => !(c.name in (CONSTRAINTS[c.relation] ?? {})));
    const extraIndexes = indexes.filter((i) => !(i.name in (INDEXES[i.relation] ?? {})));
    add("no constraints beyond the legacy set", extraConstraints.length === 0, extraConstraints.map((c) => `${c.relation}.${c.name}`).join(", "));
    add("no indexes beyond the legacy set", extraIndexes.length === 0, extraIndexes.map((i) => `${i.relation}.${i.name}`).join(", "));

    const triggers = await tx`
      SELECT c.relname AS relation, tg.tgname AS name
      FROM pg_trigger tg JOIN pg_class c ON c.oid = tg.tgrelid JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'waitlist' AND NOT tg.tgisinternal ORDER BY 1, 2`;
    add("no user triggers on waitlist tables", triggers.length === 0, triggers.map((t) => `${t.relation}.${t.name}`).join(", "));

    if (names.includes("admin_users")) {
      // Counts only: no email, subject or other identity data leaves the database.
      const [admins] = await tx`
        SELECT count(*)::int AS total,
               count(*) FILTER (WHERE status = 'active')::int AS active,
               count(*) FILTER (WHERE status = 'disabled')::int AS disabled,
               count(*) FILTER (WHERE status = 'active' AND provider = 'google' AND provider_subject IS NOT NULL)::int AS linked
        FROM waitlist.admin_users`;
      add("exactly 1 admin row (bootstrap seats need total < 3)", admins.total === 1, `total=${admins.total}, disabled=${admins.disabled}`);
      add("exactly 1 active admin", admins.active === 1, `active=${admins.active}`);
      add("the active admin is linked to a Google account", admins.active === 1 && admins.linked === 1, `linked=${admins.linked}`);
    }

    const counts = {};
    for (const table of EXPECTED_TABLES.filter((t) => names.includes(t))) {
      const [{ count }] = await tx.unsafe(`SELECT count(*)::bigint AS count FROM waitlist.${table}`);
      counts[table] = Number(count);
    }

    const catalog = {
      constraints: constraints.length,
      foreignKeys: constraints.filter((c) => c.type === "f").map((c) => `${c.relation}.${c.name}`),
      indexes: indexes.length,
      rowLevelSecurity: relations.filter((r) => r.rls).map((r) => r.name),
    };

    return { ok: checks.every((c) => c.ok), checks, identity, counts, catalog };
  });
}

export function formatReport(report, target) {
  const lines = [];
  if (target) lines.push(`Target: host=${target.host} port=${target.port} database=${target.database}`);
  const { identity } = report;
  lines.push(`Server: PostgreSQL ${identity.version} | database=${identity.database} | role=${identity.role} | superuser=${identity.superuser}`);
  lines.push("");
  for (const c of report.checks) lines.push(`${c.ok ? "PASS" : "FAIL"}  ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
  if (Object.keys(report.counts).length) {
    lines.push("", "Row-count baseline:");
    for (const [table, count] of Object.entries(report.counts)) lines.push(`  waitlist.${table}: ${count}`);
  }
  if (report.catalog.constraints !== undefined) {
    lines.push("", `Catalog baseline: ${report.catalog.constraints} constraints, ${report.catalog.indexes} indexes`);
    lines.push(`  foreign keys: ${report.catalog.foreignKeys.join(", ") || "none"}`);
    lines.push(`  row-level security enabled on: ${report.catalog.rowLevelSecurity.join(", ") || "none"}`);
  }
  const failed = report.checks.filter((c) => !c.ok).length;
  lines.push("", report.ok
    ? `PREFLIGHT: PASS (${report.checks.length} checks). The database matches the expected pre-006 legacy shape.`
    : `PREFLIGHT: FAIL (${failed} of ${report.checks.length} checks failed). Do not baseline or migrate; review the failures.`);
  lines.push("No writes were made: every query ran in a READ ONLY transaction that was rolled back.");
  return lines.join("\n");
}
