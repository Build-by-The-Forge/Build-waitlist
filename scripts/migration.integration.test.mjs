import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import postgres from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { baselineLegacy, ensureLedger, loadBaselineMigrations, loadMigrations, runMigrations } from "./migration-core.mjs";
import { verifyLegacySchema } from "./legacy-schema.mjs";

const postgresUrl = process.env.MIGRATION_TEST_DATABASE_URL;
if (postgresUrl) {
  const parsed = new URL(postgresUrl);
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  if (!new Set(["localhost", "127.0.0.1", "::1"]).has(parsed.hostname) || !/(test|migration|disposable)/i.test(database)) {
    throw new Error("MIGRATION_TEST_DATABASE_URL must target a loopback host and database named for test/migration/disposable use.");
  }
}

let sql;
let pglite;
let unsafeExecutions = 0;
const migrationsDir = fileURLToPath(new URL("../db/migrations/", import.meta.url));
const legacyNames = [
  "001_waitlist_signups.sql",
  "002_admin.sql",
  "003_waitlist_email_verification.sql",
  "004_rate_limits.sql",
  "005_email_deliveries.sql",
];

function createPgliteAdapter(database) {
  const client = (strings, ...values) => {
    const query = strings.reduce((text, part, index) => text + (index ? `$${index}` : "") + part, "");
    return database.query(query, values).then((result) => result.rows);
  };
  client.unsafe = async (query) => {
    unsafeExecutions++;
    return database.exec(query);
  };
  client.begin = async (callback) => {
    await database.exec("BEGIN");
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

describe("migration file integrity", () => {
  it("loads exactly migrations 001–005 for baselining with deterministic SHA-256 checksums", async () => {
    const baseline = await loadBaselineMigrations(migrationsDir);
    const all = await loadMigrations(migrationsDir);
    expect(baseline.map((migration) => migration.name)).toEqual(legacyNames);
    expect(baseline.every((migration) => /^[a-f0-9]{64}$/.test(migration.checksum))).toBe(true);
    expect(all.map((migration) => migration.name)).toContain("006_multi_admin.sql");
    expect(baseline.map((migration) => migration.name)).not.toContain("006_multi_admin.sql");
  });
});

async function resetDatabase() {
  await sql`DROP SCHEMA IF EXISTS waitlist CASCADE`;
}

async function createLegacySchema() {
  for (const name of legacyNames) {
    await sql.unsafe(await readFile(join(migrationsDir, name), "utf8"));
  }
}

async function createMigrationFixture(files) {
  const directory = await mkdtemp(join(tmpdir(), "build-waitlist-migrations-"));
  for (const [name, contents] of Object.entries(files)) await writeFile(join(directory, name), contents);
  return directory;
}

// Tests share one database and run in order (Vitest 5 runs tests sequentially
// unless marked concurrent; describe.sequential no longer exists).
describe("migration infrastructure (PGlite or explicitly requested disposable PostgreSQL)", () => {
  beforeAll(async () => {
    if (postgresUrl) {
      sql = postgres(postgresUrl, { max: 1, onnotice: () => {} });
      const originalUnsafe = sql.unsafe.bind(sql);
      sql.unsafe = (...args) => {
        unsafeExecutions++;
        return originalUnsafe(...args);
      };
    } else {
      pglite = new PGlite();
      sql = createPgliteAdapter(pglite);
    }
  });

  beforeEach(resetDatabase);

  it("applies every migration to a fresh database and records applied provenance", async () => {
    await runMigrations(sql, migrationsDir);
    const rows = await sql`SELECT name, source FROM waitlist.schema_migrations ORDER BY name`;
    expect(rows).toHaveLength(6);
    expect(rows.every((row) => row.source === "applied")).toBe(true);
    expect(rows.map((row) => row.name)).toContain("006_multi_admin.sql");
    expect((await sql`SELECT to_regclass('waitlist.admin_users_active_slot') AS index_name`)[0].index_name).toBe("waitlist.admin_users_active_slot");
  });

  it("baselines legacy 001–005 without replaying them, then applies 006", async () => {
    await createLegacySchema();
    expect((await sql`SELECT to_regclass('waitlist.schema_migrations') AS ledger`)[0].ledger).toBeNull();
    const [admin] = await sql`
      INSERT INTO waitlist.admin_users (email, provider, provider_subject)
      VALUES ('owner@example.test', 'google', 'stable-subject') RETURNING id`;
    const [signup] = await sql`
      INSERT INTO waitlist.signups (email, email_normalized)
      VALUES ('member@example.test', 'member@example.test') RETURNING id`;
    await sql`INSERT INTO waitlist.admin_audit (admin_id, action) VALUES (${admin.id}, 'seed')`;
    await sql`
      INSERT INTO waitlist.email_deliveries (message_id, signup_id, message_type, provider, status)
      VALUES ('11111111-1111-4111-8111-111111111111', ${signup.id}, 'verification', 'test', 'sent')`;

    const before = await sql`
      SELECT (SELECT count(*) FROM waitlist.admin_users)::int AS admins,
             (SELECT count(*) FROM waitlist.signups)::int AS signups,
             (SELECT count(*) FROM waitlist.admin_audit)::int AS audits,
             (SELECT count(*) FROM waitlist.email_deliveries)::int AS deliveries`;
    const beforeBaselineExecutions = unsafeExecutions;
    await baselineLegacy(sql, migrationsDir, verifyLegacySchema);
    expect(unsafeExecutions).toBe(beforeBaselineExecutions);
    let ledger = await sql`SELECT name, source FROM waitlist.schema_migrations ORDER BY name`;
    expect(ledger).toHaveLength(5);
    expect(ledger.every((row) => row.source === "baseline")).toBe(true);
      const migrationChecksums = await loadBaselineMigrations(migrationsDir);
      expect(ledger.map((row) => row.name)).toEqual(migrationChecksums.map((migration) => migration.name));
      const recorded = await sql`SELECT name, checksum FROM waitlist.schema_migrations ORDER BY name`;
      expect(recorded.map((row) => row.checksum)).toEqual(migrationChecksums.map((migration) => migration.checksum));
    expect(ledger.map((row) => row.name)).not.toContain("006_multi_admin.sql");
    expect((await sql`SELECT to_regclass('waitlist.admin_users') IS NOT NULL AS present`)[0].present).toBe(true);
    expect((await sql`SELECT column_name FROM information_schema.columns WHERE table_schema='waitlist' AND table_name='admin_users' AND column_name='admin_slot'`)).toHaveLength(0);

    await baselineLegacy(sql, migrationsDir, verifyLegacySchema);
    expect(unsafeExecutions).toBe(beforeBaselineExecutions);
    const afterBaseline = await sql`
      SELECT (SELECT count(*) FROM waitlist.admin_users)::int AS admins,
             (SELECT count(*) FROM waitlist.signups)::int AS signups,
             (SELECT count(*) FROM waitlist.admin_audit)::int AS audits,
             (SELECT count(*) FROM waitlist.email_deliveries)::int AS deliveries`;
    expect(afterBaseline).toEqual(before);

    const beforeTrackedRun = unsafeExecutions;
    await runMigrations(sql, migrationsDir);
    expect(unsafeExecutions - beforeTrackedRun).toBe(1);
    ledger = await sql`SELECT name, source FROM waitlist.schema_migrations ORDER BY name`;
    expect(ledger).toHaveLength(6);
    expect(ledger.filter((row) => row.source === "baseline")).toHaveLength(5);
    expect(ledger.find((row) => row.name === "006_multi_admin.sql").source).toBe("applied");
    const [preserved] = await sql`SELECT id, email, provider, provider_subject, status, admin_slot FROM waitlist.admin_users`;
    expect(preserved).toEqual({
      id: admin.id,
      email: "owner@example.test",
      provider: "google",
      provider_subject: "stable-subject",
      status: "active",
      admin_slot: 1,
    });
    expect((await sql`SELECT to_regclass('waitlist.admin_users_single_active') AS old_index`)[0].old_index).toBeNull();
    expect((await sql`SELECT to_regclass('waitlist.admin_users_active_slot') AS active_index`)[0].active_index).toBe("waitlist.admin_users_active_slot");
    const adminConstraints = await sql`
      SELECT conname FROM pg_constraint
      WHERE conrelid = 'waitlist.admin_users'::regclass
        AND conname IN ('admin_users_slot_range', 'admin_users_active_needs_slot')
      ORDER BY conname`;
    expect(adminConstraints.map((row) => row.conname)).toEqual(["admin_users_active_needs_slot", "admin_users_slot_range"]);
    expect((await sql`
      SELECT (SELECT count(*) FROM waitlist.signups)::int AS signups,
             (SELECT count(*) FROM waitlist.admin_audit)::int AS audits,
             (SELECT count(*) FROM waitlist.email_deliveries)::int AS deliveries`)).toEqual([{
      signups: before[0].signups,
      audits: before[0].audits,
      deliveries: before[0].deliveries,
    }]);
  });

  it("refuses to run on an untracked legacy schema instead of replaying 001–005", async () => {
    await createLegacySchema();
    const before = unsafeExecutions;
    await expect(runMigrations(sql, migrationsDir)).rejects.toThrow("Untracked existing waitlist schema");
    expect(unsafeExecutions).toBe(before);
    expect((await sql`SELECT to_regclass('waitlist.schema_migrations') AS ledger`)[0].ledger).toBeNull();
    expect((await sql`SELECT count(*)::int AS count FROM information_schema.columns WHERE table_schema='waitlist' AND column_name='admin_slot'`)[0].count).toBe(0);
  });

  it("refuses schema drift without leaving a ledger", async () => {
    await createLegacySchema();
    await sql`ALTER TABLE waitlist.signups ALTER COLUMN email DROP NOT NULL`;
    await expect(baselineLegacy(sql, migrationsDir, verifyLegacySchema)).rejects.toThrow("waitlist.signups.email expected NOT NULL, found nullable");
    expect((await sql`SELECT to_regclass('waitlist.schema_migrations') AS ledger`)[0].ledger).toBeNull();
  });

  it("refuses conflicting baseline history without overwriting it", async () => {
    await createLegacySchema();
    await ensureLedger(sql);
    await sql`INSERT INTO waitlist.schema_migrations (name, checksum, source) VALUES ('001_waitlist_signups.sql', 'incorrect', 'applied')`;
    await expect(baselineLegacy(sql, migrationsDir, verifyLegacySchema)).rejects.toThrow("checksum mismatch for 001_waitlist_signups.sql");
    const rows = await sql`SELECT name, checksum, source FROM waitlist.schema_migrations`;
    expect(rows).toEqual([{ name: "001_waitlist_signups.sql", checksum: "incorrect", source: "applied" }]);
  });

  it("fails closed on runner checksum mismatch before running later migrations", async () => {
    const directory = await createMigrationFixture({
      "001_probe.sql": "CREATE TABLE waitlist.probe (id INTEGER PRIMARY KEY);",
      "002_later.sql": "CREATE TABLE waitlist.later_probe (id INTEGER PRIMARY KEY);",
    });
    try {
      await ensureLedger(sql);
      await sql`INSERT INTO waitlist.schema_migrations (name, checksum, source) VALUES ('001_probe.sql', 'wrong', 'applied')`;
      await expect(runMigrations(sql, directory)).rejects.toThrow("Checksum mismatch for 001_probe.sql");
      expect((await sql`SELECT to_regclass('waitlist.probe') AS probe, to_regclass('waitlist.later_probe') AS later`)[0]).toEqual({ probe: null, later: null });
      expect((await sql`SELECT checksum FROM waitlist.schema_migrations WHERE name='001_probe.sql'`)[0].checksum).toBe("wrong");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("rolls failed migrations back and retries them exactly once", async () => {
    const directory = await createMigrationFixture({
      "001_marker.sql": "CREATE TABLE waitlist.migration_marker (id INTEGER PRIMARY KEY);",
      "002_retry.sql": "CREATE TABLE waitlist.retry_marker (id INTEGER PRIMARY KEY); SELECT * FROM waitlist.missing_table;",
    });
    try {
      await expect(runMigrations(sql, directory)).rejects.toThrow("Migration 002_retry.sql failed");
      expect((await sql`SELECT to_regclass('waitlist.migration_marker') AS first, to_regclass('waitlist.retry_marker') AS second`)[0]).toEqual({ first: "waitlist.migration_marker", second: null });
      expect((await sql`SELECT count(*)::int AS count FROM waitlist.schema_migrations WHERE name='002_retry.sql'`)[0].count).toBe(0);

      await writeFile(join(directory, "002_retry.sql"), "CREATE TABLE waitlist.retry_marker (id INTEGER PRIMARY KEY);");
      await runMigrations(sql, directory);
      expect((await sql`SELECT count(*)::int AS count FROM waitlist.schema_migrations WHERE name='002_retry.sql'`)[0].count).toBe(1);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("assigns three active admins distinct slots, leaves disabled admins unseated, and enforces slot constraints", async () => {
    await createLegacySchema();
    await sql`DROP INDEX waitlist.admin_users_single_active`;
    await sql`INSERT INTO waitlist.admin_users (email, provider_subject) VALUES ('one@example.test', 'one'), ('two@example.test', 'two'), ('three@example.test', 'three')`;
    await sql`INSERT INTO waitlist.admin_users (email, provider_subject, status) VALUES ('disabled@example.test', 'disabled', 'disabled')`;
    await sql.unsafe(await readFile(join(migrationsDir, "006_multi_admin.sql"), "utf8"));
    const rows = await sql`SELECT status, admin_slot FROM waitlist.admin_users ORDER BY status, email`;
    expect(rows.filter((row) => row.status === "active").map((row) => row.admin_slot).sort()).toEqual([1, 2, 3]);
    expect(rows.find((row) => row.status === "disabled").admin_slot).toBeNull();
    await expect(sql`INSERT INTO waitlist.admin_users (email, provider_subject, admin_slot) VALUES ('duplicate@example.test', 'duplicate', 1)`).rejects.toThrow();
    await expect(sql`UPDATE waitlist.admin_users SET admin_slot = 4 WHERE email = 'one@example.test'`).rejects.toThrow();
  });

  it("rolls migration 006 back when more than three active admins need slots", async () => {
    await createLegacySchema();
    await sql`DROP INDEX waitlist.admin_users_single_active`;
    await sql`INSERT INTO waitlist.admin_users (email, provider_subject) VALUES ('one@example.test', 'one'), ('two@example.test', 'two'), ('three@example.test', 'three'), ('four@example.test', 'four')`;
    await expect(sql.begin(async (tx) => tx.unsafe(await readFile(join(migrationsDir, "006_multi_admin.sql"), "utf8")))).rejects.toThrow();
    expect((await sql`SELECT column_name FROM information_schema.columns WHERE table_schema='waitlist' AND table_name='admin_users' AND column_name='admin_slot'`)).toHaveLength(0);
    expect((await sql`SELECT count(*)::int AS count FROM waitlist.admin_users WHERE status='active'`)[0].count).toBe(4);
  });

  afterAll(async () => {
    if (sql) await sql.end();
  });
});