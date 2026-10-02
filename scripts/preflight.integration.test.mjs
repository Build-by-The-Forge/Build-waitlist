import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import postgres from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { formatReport, resolvePreflightUrl, runPreflight, withReadOnly } from "./preflight-core.mjs";

const postgresUrl = process.env.MIGRATION_TEST_DATABASE_URL;
if (postgresUrl) {
  const parsed = new URL(postgresUrl);
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  if (!new Set(["localhost", "127.0.0.1", "::1"]).has(parsed.hostname) || !/(test|migration|disposable)/i.test(database)) {
    throw new Error("MIGRATION_TEST_DATABASE_URL must target a loopback host and database named for test/migration/disposable use.");
  }
}

const migrationsDir = fileURLToPath(new URL("../db/migrations/", import.meta.url));
const LEGACY = ["001_waitlist_signups.sql", "002_admin.sql", "003_waitlist_email_verification.sql", "004_rate_limits.sql", "005_email_deliveries.sql"];
// Recognizable fake identity values: the report must never contain them.
const ADMIN_EMAIL = "secret-admin@identity.invalid";
const ADMIN_SUBJECT = "secret-google-subject-8f3a";

let sql;
let pglite;

function createPgliteAdapter(database) {
  const client = (strings, ...values) => {
    const query = strings.reduce((text, part, index) => text + (index ? `$${index}` : "") + part, "");
    return database.query(query, values).then((result) => result.rows);
  };
  // Multi-statement SQL (the migration files) needs exec; the rows of the last statement are returned.
  client.unsafe = (query) => database.exec(query).then((results) => results.at(-1)?.rows ?? []);
  client.begin = async (modeOrCallback, maybeCallback) => {
    const [mode, callback] = typeof modeOrCallback === "function" ? ["", modeOrCallback] : [modeOrCallback, maybeCallback];
    await database.exec(`BEGIN ${mode}`);
    try {
      const result = await callback(client);
      await database.exec("COMMIT");
      return result;
    } catch (error) {
      await database.exec("ROLLBACK");
      throw error;
    }
  };
  client.end = () => database.close();
  return client;
}

async function buildLegacyDatabase() {
  await sql.unsafe("DROP SCHEMA IF EXISTS waitlist CASCADE");
  await sql.unsafe("DROP SCHEMA IF EXISTS other_schema CASCADE");
  for (const name of LEGACY) await sql.unsafe(await readFile(join(migrationsDir, name), "utf8"));
  await sql`INSERT INTO waitlist.admin_users (email, provider, provider_subject, last_login_at) VALUES (${ADMIN_EMAIL}, 'google', ${ADMIN_SUBJECT}, now())`;
  await sql`INSERT INTO waitlist.admin_audit (admin_id, action) VALUES (1, 'sign_in'), (1, 'export_csv')`;
  await sql`INSERT INTO waitlist.signups (email, email_normalized, verification_status, verified_at) VALUES ('a@x.invalid', 'a@x.invalid', 'verified', now())`;
  await sql`INSERT INTO waitlist.signups (email, email_normalized) VALUES ('b@x.invalid', 'b@x.invalid'), ('c@x.invalid', 'c@x.invalid')`;
  await sql`INSERT INTO waitlist.email_deliveries (message_id, signup_id, message_type, provider, status) VALUES ('00000000-0000-4000-8000-000000000001', 1, 'verification', 'brevo', 'sent')`;
  await sql`INSERT INTO waitlist.rate_limits (bucket, window_start, hits) VALUES ('b1', now(), 1), ('b2', now(), 2), ('b3', now(), 3), ('b4', now(), 4)`;
}

const failing = (report) => report.checks.filter((c) => !c.ok).map((c) => c.name);

describe("resolvePreflightUrl", () => {
  const prod = "postgresql://postgres.ref:pw@db.example.invalid:5432/postgres?sslmode=require";

  it("fails closed when MIGRATION_DATABASE_URL is missing", () => {
    expect(() => resolvePreflightUrl({})).toThrow("MIGRATION_DATABASE_URL is not set");
    expect(() => resolvePreflightUrl({ MIGRATION_DATABASE_URL: "   " })).toThrow("MIGRATION_DATABASE_URL is not set");
  });

  it("never falls back to or reuses runtime connections or the runtime role", () => {
    expect(() => resolvePreflightUrl({ DATABASE_URL: prod, WAITLIST_APP_DATABASE_URL: prod })).toThrow("is not set");
    expect(() => resolvePreflightUrl({ MIGRATION_DATABASE_URL: prod, DATABASE_URL: prod })).toThrow("identical to DATABASE_URL");
    expect(() => resolvePreflightUrl({ MIGRATION_DATABASE_URL: prod, WAITLIST_APP_DATABASE_URL: prod })).toThrow("identical to WAITLIST_APP_DATABASE_URL");
    expect(() => resolvePreflightUrl({ MIGRATION_DATABASE_URL: "postgresql://waitlist_app:pw@db.example.invalid:5432/postgres" })).toThrow("waitlist_app runtime role");
    expect(() => resolvePreflightUrl({ MIGRATION_DATABASE_URL: "postgresql://waitlist_app.ref:pw@pooler.example.invalid:5432/postgres" })).toThrow("waitlist_app runtime role");
    expect(() => resolvePreflightUrl({ MIGRATION_DATABASE_URL: "postgresql://postgres.ref:pw@pooler.example.invalid:6543/postgres" })).toThrow("transaction pooler");
  });

  it("accepts an explicit migration URL and exposes only non-secret target fields", () => {
    const resolved = resolvePreflightUrl({ MIGRATION_DATABASE_URL: prod, DATABASE_URL: "postgresql://waitlist_app.ref:other@pooler.example.invalid:6543/postgres" });
    expect(resolved.target).toEqual({ host: "db.example.invalid", port: "5432", database: "postgres" });
    expect(JSON.stringify(resolved.target)).not.toContain("pw");
  });
});

describe("read-only production preflight (PGlite or explicitly requested disposable PostgreSQL)", () => {
  beforeAll(async () => {
    if (postgresUrl) {
      sql = postgres(postgresUrl, { max: 1, onnotice: () => {} });
    } else {
      pglite = new PGlite();
      sql = createPgliteAdapter(pglite);
    }
  }, 60_000);

  beforeEach(buildLegacyDatabase, 30_000);

  it("runs inside a READ ONLY transaction in which PostgreSQL rejects writes", async () => {
    await expect(withReadOnly(sql, (tx) => tx`INSERT INTO waitlist.rate_limits (bucket, window_start, hits) VALUES ('w', now(), 1)`)).rejects.toThrow(/read-only transaction/);
    await expect(withReadOnly(sql, (tx) => tx`CREATE TABLE waitlist.probe (id int)`)).rejects.toThrow(/read-only transaction/);
    const report = await runPreflight(sql);
    expect(report.checks.find((c) => c.name === "transaction is READ ONLY")).toMatchObject({ ok: true, detail: "transaction_read_only=on" });
  });

  it("passes on the exact legacy 001–005 production shape", async () => {
    const report = await runPreflight(sql);
    expect(failing(report)).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it("fails when a legacy schema object is missing", async () => {
    await sql.unsafe("DROP INDEX waitlist.signups_created_at_idx");
    const report = await runPreflight(sql);
    expect(report.ok).toBe(false);
    expect(failing(report)).toContain("exact legacy 001–005 schema verification");
    expect(report.checks.find((c) => c.name.startsWith("exact legacy")).detail).toContain("signups_created_at_idx is missing");
  });

  it("fails on an unexpected table in the waitlist schema", async () => {
    await sql.unsafe("CREATE TABLE waitlist.extra (id int)");
    expect(failing(await runPreflight(sql))).toEqual(["no unexpected tables/views in waitlist"]);
  });

  it("fails on schema drift", async () => {
    await sql.unsafe("ALTER TABLE waitlist.admin_users ALTER COLUMN status SET DEFAULT 'disabled'");
    expect(failing(await runPreflight(sql))).toEqual(["exact legacy 001–005 schema verification"]);
  });

  it("detects an existing migration ledger", async () => {
    await sql.unsafe("CREATE TABLE waitlist.schema_migrations (name TEXT PRIMARY KEY, checksum TEXT NOT NULL)");
    const failed = failing(await runPreflight(sql));
    expect(failed).toContain("waitlist.schema_migrations does not exist");
    expect(failed).toContain("no unexpected tables/views in waitlist");
  });

  it("detects an existing admin_slot column", async () => {
    await sql.unsafe("ALTER TABLE waitlist.admin_users ADD COLUMN admin_slot SMALLINT");
    const failed = failing(await runPreflight(sql));
    expect(failed).toContain("admin_users.admin_slot does not exist");
    expect(failed).toContain("exact legacy 001–005 schema verification");
  });

  it("detects a missing admin_users_single_active index", async () => {
    await sql.unsafe("DROP INDEX waitlist.admin_users_single_active");
    expect(failing(await runPreflight(sql))).toEqual(["exact legacy 001–005 schema verification", "admin_users_single_active exists"]);
  });

  it("detects a migration-006 constraint name in any schema, by exact name only", async () => {
    await sql.unsafe("CREATE SCHEMA other_schema; CREATE TABLE other_schema.t (x int CONSTRAINT admin_users_slot_range_lookalike CHECK (x > 0))");
    expect((await runPreflight(sql)).ok).toBe(true);

    await sql.unsafe("ALTER TABLE other_schema.t ADD CONSTRAINT admin_users_slot_range CHECK (x < 10)");
    const report = await runPreflight(sql);
    const clash = report.checks.find((c) => c.name === "migration-006 constraint names are unused in every schema");
    expect(clash.ok).toBe(false);
    expect(clash.detail).toBe("other_schema.t.admin_users_slot_range");
    expect(failing(report)).toEqual(["migration-006 constraint names are unused in every schema"]);
  });

  it("fails unless there is exactly one admin row", async () => {
    await sql`INSERT INTO waitlist.admin_users (email, provider_subject, status) VALUES ('old@x.invalid', 'old-sub', 'disabled')`;
    const report = await runPreflight(sql);
    expect(failing(report)).toEqual(["exactly 1 admin row (bootstrap seats need total < 3)"]);
    expect(report.checks.find((c) => c.name.startsWith("exactly 1 admin row")).detail).toBe("total=2, disabled=1");
  });

  it("fails with more than one active admin", async () => {
    await sql.unsafe("DROP INDEX waitlist.admin_users_single_active");
    await sql`INSERT INTO waitlist.admin_users (email, provider_subject) VALUES ('second@x.invalid', 'second-sub')`;
    const failed = failing(await runPreflight(sql));
    expect(failed).toContain("exactly 1 active admin");
    expect(failed).toContain("exactly 1 admin row (bootstrap seats need total < 3)");
  });

  it("fails when the existing admin is not linked to a Google account", async () => {
    await sql`UPDATE waitlist.admin_users SET provider_subject = NULL`;
    expect(failing(await runPreflight(sql))).toEqual(["the active admin is linked to a Google account"]);
  });

  it("never prints admin identity data, on success or failure", async () => {
    const passing = formatReport(await runPreflight(sql), { host: "h", port: "5432", database: "d" });
    await sql`UPDATE waitlist.admin_users SET provider_subject = NULL`;
    await sql.unsafe("CREATE TABLE waitlist.extra (id int)");
    const failed = formatReport(await runPreflight(sql));
    for (const output of [passing, failed]) {
      expect(output).not.toContain(ADMIN_EMAIL);
      expect(output).not.toContain(ADMIN_SUBJECT);
      expect(output).not.toMatch(/@identity\.invalid/);
    }
    expect(passing).toContain("PREFLIGHT: PASS");
    expect(failed).toContain("PREFLIGHT: FAIL");
  });

  it("reports the row-count and catalog baseline", async () => {
    const report = await runPreflight(sql);
    expect(report.counts).toEqual({ admin_audit: 2, admin_users: 1, email_deliveries: 1, rate_limits: 4, signups: 3 });
    expect(report.catalog.foreignKeys).toEqual(["admin_audit.admin_audit_admin_id_fkey", "email_deliveries.email_deliveries_signup_id_fkey"]);
    const text = formatReport(report);
    expect(text).toContain("waitlist.signups: 3");
    expect(text).toContain("waitlist.rate_limits: 4");
  });

  it("ends its read-only transaction and leaves the database exactly as it was", async () => {
    const snapshot = async () => ({
      relations: await sql`SELECT c.relname, c.relkind FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'waitlist' ORDER BY 1`,
      admin: await sql`SELECT xmin::text AS xmin, last_login_at FROM waitlist.admin_users`,
      counts: await sql`SELECT (SELECT count(*)::int FROM waitlist.signups) AS s, (SELECT count(*)::int FROM waitlist.rate_limits) AS r, (SELECT count(*)::int FROM waitlist.admin_audit) AS a`,
    });
    const before = await snapshot();
    expect((await runPreflight(sql)).ok).toBe(true);
    expect(await snapshot()).toEqual(before);
    // The session is back outside any transaction and writable again.
    expect((await sql`SHOW transaction_read_only`)[0].transaction_read_only).toBe("off");
    expect((await sql`SELECT to_regclass('waitlist.schema_migrations') AS ledger`)[0].ledger).toBeNull();
  });

  afterAll(async () => {
    if (sql) await sql.end();
  });
});
