export const PAGE_SIZE = 50;
const MAX_QUERY_LENGTH = 100;

export const STATUS_FILTERS = ["all", "verified", "pending"] as const;
export type StatusFilter = (typeof STATUS_FILTERS)[number];

export type ListParams = { q: string; page: number; status: StatusFilter };

type Raw = Record<string, string | string[] | undefined> | URLSearchParams;

function first(raw: Raw, key: string): string | undefined {
  if (raw instanceof URLSearchParams) return raw.get(key) ?? undefined;
  const v = raw[key];
  return Array.isArray(v) ? v[0] : v;
}

/** Normalizes ?q=, ?page= and ?status= from a page or API request. */
export function parseListParams(raw: Raw): ListParams {
  const q = (first(raw, "q") ?? "").trim().slice(0, MAX_QUERY_LENGTH);
  const n = Number.parseInt(first(raw, "page") ?? "1", 10);
  const page = Number.isFinite(n) && n >= 1 ? Math.min(n, 100_000) : 1;
  const s = first(raw, "status");
  const status = (STATUS_FILTERS as readonly string[]).includes(s ?? "") ? (s as StatusFilter) : "all";
  return { q, page, status };
}

/** Escapes LIKE wildcards so a search for "a_b" or "100%" matches literally. */
export function likePattern(q: string): string {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}
