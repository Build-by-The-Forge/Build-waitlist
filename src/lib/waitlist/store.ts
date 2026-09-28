import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import postgres from "postgres";

export type SignupInput = { email: string; emailNormalized: string; source: string | null };
export type SignupResult = "created" | "duplicate";

export interface WaitlistStore {
  add(input: SignupInput): Promise<SignupResult>;
}

class PostgresStore implements WaitlistStore {
  constructor(private sql: postgres.Sql) {}

  async add({ email, emailNormalized, source }: SignupInput): Promise<SignupResult> {
    // The UNIQUE constraint is the source of truth, so there is no read-then-write race.
    const rows = await this.sql`
      INSERT INTO waitlist_signups (email, email_normalized, source)
      VALUES (${email}, ${emailNormalized}, ${source})
      ON CONFLICT (email_normalized) DO NOTHING
      RETURNING id
    `;
    return rows.length > 0 ? "created" : "duplicate";
  }
}

/** Development-only store so the form works without a database. */
class FileStore implements WaitlistStore {
  private dir = join(process.cwd(), ".data");
  private path = join(this.dir, "waitlist.json");
  private queue: Promise<unknown> = Promise.resolve();

  add(input: SignupInput): Promise<SignupResult> {
    const run = this.queue.then(async (): Promise<SignupResult> => {
      let rows: (SignupInput & { createdAt: string })[] = [];
      try {
        rows = JSON.parse(await readFile(this.path, "utf8"));
      } catch {
        // First signup: the file does not exist yet.
      }
      if (rows.some((r) => r.emailNormalized === input.emailNormalized)) return "duplicate";
      rows.push({ ...input, createdAt: new Date().toISOString() });
      await mkdir(this.dir, { recursive: true });
      await writeFile(this.path, JSON.stringify(rows, null, 2));
      return "created";
    });
    this.queue = run.catch(() => undefined);
    return run;
  }
}

let store: WaitlistStore | undefined;

export function getWaitlistStore(): WaitlistStore {
  if (store) return store;
  const url = process.env.DATABASE_URL;
  if (url) {
    store = new PostgresStore(postgres(url, { max: 5, idle_timeout: 20, connect_timeout: 10 }));
  } else if (process.env.NODE_ENV !== "production") {
    store = new FileStore();
  } else {
    // Refuse rather than silently dropping signups.
    throw new Error("DATABASE_URL is not set; persistent storage is required in production.");
  }
  return store;
}
