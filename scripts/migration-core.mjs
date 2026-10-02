import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

export const BASELINE_MIGRATIONS = [
  "001_waitlist_signups.sql",
  "002_admin.sql",
  "003_waitlist_email_verification.sql",
  "004_rate_limits.sql",
  "005_email_deliveries.sql",
];

const canonicalSql = (value) => value.toLowerCase().replaceAll('"', "").replaceAll("'", "").replace(/::text/g, "").replace(/\s+/g, "");

export async function loadMigrations(directory) {
  const names = (await readdir(directory)).filter((name) => name.endsWith(".sql")).sort();
  return Promise.all(names.map(async (name) => {
    const body = await readFile(join(directory, name), "utf8");
    return { name, body, checksum: createHash("sha256").update(body).digest("hex") };
  }));
}

export async function loadBaselineMigrations(directory) {
  const all = await loadMigrations(directory);
  const byName = new Map(all.map((migration) => [migration.name, migration]));
  const missing = BASELINE_MIGRATIONS.filter((name) => !byName.has(name));
  if (missing.length) throw new Error(`Baseline migration files missing: ${missing.join(", ")}`);
  return BASELINE_MIGRATIONS.map((name) => byName.get(name));
}

export async function ensureLedger(tx) {
  await tx`CREATE SCHEMA IF NOT EXISTS waitlist`;
  await tx`
    CREATE TABLE IF NOT EXISTS waitlist.schema_migrations (
      name       TEXT        PRIMARY KEY,
      checksum   TEXT        NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      source     TEXT        NOT NULL DEFAULT 'applied'
    )`;
  await tx`ALTER TABLE waitlist.schema_migrations
    ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'applied'`;
  await tx`ALTER TABLE waitlist.schema_migrations ALTER COLUMN source SET NOT NULL`;
  await tx`DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'waitlist.schema_migrations'::regclass
        AND conname = 'schema_migrations_source_check'
    ) THEN
      ALTER TABLE waitlist.schema_migrations
        ADD CONSTRAINT schema_migrations_source_check
        CHECK (source IN ('applied', 'baseline'));
    END IF;
  END $$`;
  const [sourceConstraint] = await tx`
    SELECT pg_get_constraintdef(oid) AS definition
    FROM pg_constraint
    WHERE conrelid = 'waitlist.schema_migrations'::regclass
      AND conname = 'schema_migrations_source_check'`;
  if (!sourceConstraint || canonicalSql(sourceConstraint.definition) !== "check((source=any(array[applied,baseline])))") {
    throw new Error("Migration ledger source constraint has an incompatible definition.");
  }
}

export async function runMigrations(sql, directory) {
  const migrations = await loadMigrations(directory);
  if (migrations.length === 0) throw new Error("No migration SQL files found.");

  const [ledgerState] = await sql`SELECT to_regclass('waitlist.schema_migrations') IS NOT NULL AS exists`;
  let recorded = [];
  if (ledgerState.exists) {
    const columns = await sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'waitlist' AND table_name = 'schema_migrations'`;
    const hasName = columns.some((column) => column.column_name === "name");
    const hasChecksum = columns.some((column) => column.column_name === "checksum");
    if (!hasName || !hasChecksum) throw new Error("Migration ledger is missing its name or checksum column.");
    recorded = await sql`SELECT name, checksum FROM waitlist.schema_migrations ORDER BY name`;
  }

  // An empty history over existing tables is an untracked legacy database:
  // never guess, and never replay its migrations. Baselining is explicit.
  if (recorded.length === 0) {
    const [{ count }] = await sql`
      SELECT count(*)::int AS count FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'waitlist' AND c.relkind IN ('r', 'p') AND c.relname <> 'schema_migrations'`;
    if (count > 0) {
      throw new Error("Untracked existing waitlist schema; refusing to replay migrations. Review it and run db:baseline:legacy first.");
    }
  }

  const recordedByName = new Map(recorded.map((row) => [row.name, row]));
  const availableNames = new Set(migrations.map((migration) => migration.name));

  for (const row of recorded) {
    if (!availableNames.has(row.name)) {
      throw new Error(`Migration ledger contains ${row.name}, which is absent from db/migrations.`);
    }
  }

  // Validate every historical checksum before executing any pending migration.
  for (const migration of migrations) {
    const row = recordedByName.get(migration.name);
    if (row && row.checksum !== migration.checksum) {
      throw new Error(`Checksum mismatch for ${migration.name}; refusing to execute or modify migration history.`);
    }
  }

  await sql.begin(async (tx) => ensureLedger(tx));
  const rows = await sql`SELECT name, checksum, source FROM waitlist.schema_migrations ORDER BY name`;
  const applied = new Map(rows.map((row) => [row.name, row]));

  for (const migration of migrations) {
    if (applied.has(migration.name)) {
      console.log(`${migration.name} already recorded (${applied.get(migration.name).source})`);
      continue;
    }

    try {
      await sql.begin(async (tx) => {
        await tx.unsafe(migration.body);
        await tx`
          INSERT INTO waitlist.schema_migrations (name, checksum, source)
          VALUES (${migration.name}, ${migration.checksum}, 'applied')`;
      });
      console.log(`${migration.name} applied successfully`);
    } catch {
      throw new Error(`Migration ${migration.name} failed; its SQL and ledger entry were rolled back.`);
    }
  }
}

export async function baselineLegacy(sql, directory, verifyLegacySchema) {
  const migrations = await loadBaselineMigrations(directory);

  const alreadyBaselined = await sql.begin(async (tx) => {
    await verifyLegacySchema(tx);

    const [ledgerState] = await tx`
      SELECT to_regclass('waitlist.schema_migrations') IS NOT NULL AS exists`;
    if (ledgerState.exists) {
      const columns = await tx`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'waitlist' AND table_name = 'schema_migrations'`;
      const hasSource = columns.some((column) => column.column_name === "source");
      const existing = hasSource
        ? await tx`SELECT name, checksum, source FROM waitlist.schema_migrations ORDER BY name`
        : await tx`SELECT name, checksum, 'applied'::text AS source FROM waitlist.schema_migrations ORDER BY name`;

      const expectedNames = new Set(migrations.map((migration) => migration.name));
      const unexpected = existing.filter((row) => !expectedNames.has(row.name));
      if (unexpected.length) {
        throw new Error(`Baseline refused: migration ledger contains unexpected history (${unexpected.map((row) => row.name).join(", ")}).`);
      }
      for (const migration of migrations) {
        const row = existing.find((candidate) => candidate.name === migration.name);
        if (!row) continue;
        if (row.checksum !== migration.checksum) {
          throw new Error(`Baseline refused: checksum mismatch for ${migration.name}.`);
        }
        if (row.source !== "baseline") {
          throw new Error(`Baseline refused: ${migration.name} is recorded as ${row.source}, not baseline.`);
        }
      }
      if (existing.length && existing.length !== migrations.length) {
        throw new Error("Baseline refused: migration ledger contains a partial legacy baseline.");
      }
      await tx`ALTER TABLE waitlist.schema_migrations
        ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'applied'`;
      await tx`ALTER TABLE waitlist.schema_migrations ALTER COLUMN source SET NOT NULL`;
      await tx`DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'waitlist.schema_migrations'::regclass
            AND conname = 'schema_migrations_source_check'
        ) THEN
          ALTER TABLE waitlist.schema_migrations
            ADD CONSTRAINT schema_migrations_source_check
            CHECK (source IN ('applied', 'baseline'));
        END IF;
      END $$`;
      const [sourceConstraint] = await tx`
        SELECT pg_get_constraintdef(oid) AS definition
        FROM pg_constraint
        WHERE conrelid = 'waitlist.schema_migrations'::regclass
          AND conname = 'schema_migrations_source_check'`;
      if (!sourceConstraint || canonicalSql(sourceConstraint.definition) !== "check((source=any(array[applied,baseline])))") {
        throw new Error("Baseline refused: migration ledger source constraint has an incompatible definition.");
      }
      if (existing.length === migrations.length) return true;
    } else {
      await tx`CREATE TABLE waitlist.schema_migrations (
        name       TEXT        PRIMARY KEY,
        checksum   TEXT        NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        source     TEXT        NOT NULL CHECK (source IN ('applied', 'baseline'))
      )`;
    }

    for (const migration of migrations) {
      await tx`
        INSERT INTO waitlist.schema_migrations (name, checksum, source)
        VALUES (${migration.name}, ${migration.checksum}, 'baseline')`;
    }
    return false;
  });

  if (alreadyBaselined) {
    console.log("Legacy migrations already baselined; nothing to do.");
  } else {
    console.log("Legacy schema verification: PASS");
    for (const migration of migrations) console.log(`${migration.name} BASELINED`);
    console.log("No historical migration SQL executed.");
  }
}