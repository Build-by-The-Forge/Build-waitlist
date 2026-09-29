import "server-only";
import type postgres from "postgres";
import { getSql } from "@/lib/db";
import { likePattern, PAGE_SIZE, type ListParams } from "./list-params";

export type Signup = { id: number; email: string; source: string | null; createdAt: Date };

export type SignupStats = {
  total: number;
  today: number;
  last7Days: number;
  last30Days: number;
  bySource: { source: string; count: number }[];
};

type Row = { id: string; email: string; source: string | null; created_at: Date };
const toSignup = (r: Row): Signup => ({ id: Number(r.id), email: r.email, source: r.source, createdAt: r.created_at });

function db(): postgres.Sql {
  const sql = getSql();
  if (!sql) throw new Error("The admin dashboard requires DATABASE_URL.");
  return sql;
}

export async function listSignups({ q, page }: ListParams): Promise<{ rows: Signup[]; total: number; pageCount: number }> {
  const sql = db();
  const where = q ? sql`WHERE email ILIKE ${likePattern(q)}` : sql``;
  const [{ count }] = await sql<{ count: string }[]>`SELECT count(*) FROM waitlist.signups ${where}`;
  const total = Number(count);
  const rows = await sql<Row[]>`
    SELECT id, email, source, created_at FROM waitlist.signups ${where}
    ORDER BY created_at DESC, id DESC
    LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`;
  return { rows: rows.map(toSignup), total, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function signupStats(): Promise<SignupStats> {
  const sql = db();
  const [totals] = await sql<{ total: string; today: string; d7: string; d30: string }[]>`
    SELECT
      count(*)                                                    AS total,
      count(*) FILTER (WHERE created_at >= date_trunc('day', now())) AS today,
      count(*) FILTER (WHERE created_at >= now() - interval '7 days')  AS d7,
      count(*) FILTER (WHERE created_at >= now() - interval '30 days') AS d30
    FROM waitlist.signups`;
  const sources = await sql<{ source: string; count: string }[]>`
    SELECT coalesce(source, 'unknown') AS source, count(*) FROM waitlist.signups
    GROUP BY 1 ORDER BY 2 DESC`;
  return {
    total: Number(totals.total),
    today: Number(totals.today),
    last7Days: Number(totals.d7),
    last30Days: Number(totals.d30),
    bySource: sources.map((s) => ({ source: s.source, count: Number(s.count) })),
  };
}

/** All signups oldest-first, streamed in batches so exports scale. */
export async function* allSignups(): AsyncGenerator<Signup[]> {
  const sql = db();
  const cursor = sql<Row[]>`SELECT id, email, source, created_at FROM waitlist.signups ORDER BY created_at, id`.cursor(500);
  for await (const batch of cursor) yield batch.map(toSignup);
}
