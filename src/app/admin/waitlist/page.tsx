import Link from "next/link";
import { ChevronLeft, ChevronRight, Download, LogOut, Search } from "lucide-react";
import { signOut } from "@/auth";
import { Logo } from "@/components/ui/logo";
import { requireAdminPage } from "@/lib/admin/session";
import { PAGE_SIZE, parseListParams, STATUS_FILTERS, type StatusFilter } from "@/lib/admin/list-params";
import { listSignups, signupStats } from "@/lib/admin/signups";
import { cn } from "@/lib/utils";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

// BUILD's first users are in Nigeria; override with ADMIN_TIMEZONE if needed.
const TIME_ZONE = process.env.ADMIN_TIMEZONE || "Africa/Lagos";
const dateFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const zoneLabel =
  new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, timeZoneName: "short" })
    .formatToParts(new Date())
    .find((p) => p.type === "timeZoneName")?.value ?? TIME_ZONE;
const num = new Intl.NumberFormat("en");

function listHref({ q, page = 1, status }: { q: string; page?: number; status: StatusFilter }) {
  const sp = new URLSearchParams();
  if (q) sp.set("q", q);
  if (status !== "all") sp.set("status", status);
  if (page > 1) sp.set("page", String(page));
  const s = sp.toString();
  return `/admin/waitlist${s ? `?${s}` : ""}`;
}

function StatusBadge({ status }: { status: "pending" | "verified" }) {
  return status === "verified" ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-success-muted px-2.5 py-0.5 text-xs font-medium text-success">
      <span className="size-1.5 rounded-full bg-success" aria-hidden="true" /> Verified
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-medium text-foreground-muted">
      <span className="size-1.5 rounded-full bg-foreground-subtle" aria-hidden="true" /> Pending
    </span>
  );
}

export default async function AdminWaitlistPage({ searchParams }: Props) {
  const admin = await requireAdminPage();
  const params = parseListParams(await searchParams);
  const [stats, list] = await Promise.all([signupStats(), listSignups(params)]);
  const page = Math.min(params.page, list.pageCount);
  const from = list.total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, list.total);

  async function logout() {
    "use server";
    await signOut({ redirectTo: "/admin/login" });
  }

  // "Total" keeps its original meaning (every signup); Verified is the
  // confirmed waitlist. Any public-facing count should use Verified.
  const cards = [
    { label: "Total signups", value: stats.total },
    { label: "Verified", value: stats.verified },
    { label: "Pending", value: stats.pending },
    { label: "Today", value: stats.today },
    { label: "Last 7 days", value: stats.last7Days },
    { label: "Last 30 days", value: stats.last30Days },
  ];

  return (
    <>
      <header className="border-b border-border-subtle bg-surface">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="rounded-full bg-surface-muted px-2.5 py-1 font-mono text-[0.6875rem] tracking-[0.12em] text-foreground-muted uppercase">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-small text-foreground-muted sm:inline">{admin.email}</span>
            <form action={logout}>
              <button
                type="submit"
                className="inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-small font-medium ring-1 ring-border hover:ring-foreground/30"
              >
                <LogOut className="size-4" aria-hidden="true" /> Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Waitlist</h1>

        <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {cards.map((c) => (
            <div key={c.label} className="rounded-2xl bg-surface p-5 ring-1 ring-border-subtle">
              <dt className="text-small text-foreground-muted">{c.label}</dt>
              <dd className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{num.format(c.value)}</dd>
            </div>
          ))}
        </dl>

        {stats.bySource.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl bg-surface px-5 py-4 ring-1 ring-border-subtle">
            <span className="mr-1 text-small text-foreground-muted">By source</span>
            {stats.bySource.map((s) => (
              <span key={s.source} className="rounded-full bg-surface-muted px-3 py-1 text-small">
                <span className="font-mono">{s.source}</span>{" "}
                <span className="font-semibold tabular-nums">{num.format(s.count)}</span>
              </span>
            ))}
          </div>
        )}

        <section aria-labelledby="signups-heading" className="mt-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 id="signups-heading" className="sr-only">
              Signups
            </h2>
            <form action="/admin/waitlist" method="get" role="search" className="relative w-full sm:max-w-sm">
              <label htmlFor="q" className="sr-only">
                Search emails
              </label>
              {params.status !== "all" && <input type="hidden" name="status" value={params.status} />}
              <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-foreground-subtle" aria-hidden="true" />
              <input
                id="q"
                name="q"
                type="search"
                defaultValue={params.q}
                placeholder="Search emails…"
                maxLength={100}
                className="h-11 w-full rounded-full bg-surface pr-4 pl-11 text-[0.9375rem] ring-1 ring-border placeholder:text-foreground-subtle focus-visible:ring-2 focus-visible:ring-foreground focus-visible:outline-none"
              />
            </form>
            <a
              href="/api/admin/waitlist/export"
              download
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-[0.9375rem] font-medium text-primary-foreground hover:bg-[#262830]"
            >
              <Download className="size-4" aria-hidden="true" /> Export CSV
            </a>
          </div>
          <p className="mt-2 text-xs text-foreground-subtle">Exports contain personal data and are logged.</p>

          <nav aria-label="Filter by verification status" className="mt-5 flex gap-1 rounded-full bg-surface-muted p-1 text-small sm:w-fit">
            {STATUS_FILTERS.map((s) => (
              <Link
                key={s}
                href={listHref({ q: params.q, status: s })}
                aria-current={params.status === s ? "page" : undefined}
                className={cn(
                  "flex-1 rounded-full px-4 py-1.5 text-center font-medium capitalize transition-colors sm:flex-none",
                  params.status === s ? "bg-surface text-foreground shadow-sm ring-1 ring-border-subtle" : "text-foreground-muted hover:text-foreground",
                )}
              >
                {s}
              </Link>
            ))}
          </nav>

          <div className="mt-3 overflow-hidden rounded-2xl bg-surface ring-1 ring-border-subtle">
            {list.rows.length === 0 ? (
              <p className="px-6 py-16 text-center text-foreground-muted">
                {params.q ? (
                  <>No signups match &ldquo;{params.q}&rdquo;.</>
                ) : params.status !== "all" ? (
                  `No ${params.status} signups.`
                ) : (
                  "No signups yet. They'll appear here as people join."
                )}
              </p>
            ) : (
              <table className="w-full text-left text-[0.9375rem]">
                <thead className="border-b border-border-subtle bg-surface-muted/50 text-small text-foreground-muted">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-medium">
                      Email
                    </th>
                    <th scope="col" className="px-5 py-3 font-medium">
                      Status
                    </th>
                    <th scope="col" className="hidden px-5 py-3 font-medium sm:table-cell">
                      Joined ({zoneLabel})
                    </th>
                    <th scope="col" className="hidden px-5 py-3 font-medium md:table-cell">
                      Source
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {list.rows.map((r) => (
                    <tr key={r.id}>
                      <td className="px-5 py-3.5">
                        <span className="break-all">{r.email}</span>
                        <span className="mt-0.5 block text-xs text-foreground-subtle sm:hidden">
                          {dateFmt.format(r.createdAt)}
                          {r.source ? ` · ${r.source}` : ""}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <StatusBadge status={r.verificationStatus} />
                        {r.verifiedAt && (
                          <time dateTime={r.verifiedAt.toISOString()} className="sr-only">
                            {" "}
                            on {dateFmt.format(r.verifiedAt)}
                          </time>
                        )}
                      </td>
                      <td className="hidden px-5 py-3.5 whitespace-nowrap text-foreground-muted tabular-nums sm:table-cell">
                        <time dateTime={r.createdAt.toISOString()}>{dateFmt.format(r.createdAt)}</time>
                      </td>
                      <td className="hidden px-5 py-3.5 md:table-cell">
                        {r.source ? <span className="font-mono text-small text-foreground-muted">{r.source}</span> : <span className="text-foreground-subtle">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {list.total > 0 && (
            <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-small text-foreground-muted">
              <span className="tabular-nums">
                {num.format(from)}–{num.format(to)} of {num.format(list.total)}
              </span>
              <div className="flex gap-2">
                <PageLink href={listHref({ q: params.q, status: params.status, page: page - 1 })} disabled={page <= 1} label="Previous page">
                  <ChevronLeft className="size-4" aria-hidden="true" />
                </PageLink>
                <PageLink href={listHref({ q: params.q, status: params.status, page: page + 1 })} disabled={page >= list.pageCount} label="Next page">
                  <ChevronRight className="size-4" aria-hidden="true" />
                </PageLink>
              </div>
            </nav>
          )}
        </section>
      </main>
    </>
  );
}

function PageLink({ href, disabled, label, children }: { href: string; disabled: boolean; label: string; children: React.ReactNode }) {
  const cls = "grid size-9 place-items-center rounded-full ring-1 ring-border";
  if (disabled) {
    return (
      <span aria-disabled="true" aria-label={label} className={cn(cls, "opacity-40")}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} aria-label={label} className={cn(cls, "text-foreground hover:ring-foreground/30")}>
      {children}
    </Link>
  );
}
