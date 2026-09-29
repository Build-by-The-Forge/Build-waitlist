# BUILD Waitlist

The waitlist landing page for **BUILD**: *your learning journey, intelligently connected.*

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Framer Motion · Postgres

## Quick start

```bash
npm install
cp .env.example .env.local   # then set DATABASE_URL to a development database
npm run db:migrate
npm run dev                  # http://localhost:3000
```

Signups need Postgres, because email verification relies on it. Point `DATABASE_URL` at a development database, never production. In development, leave `EMAIL_PROVIDER` unset: verification links are printed to the terminal instead of emailed.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint (flat config, `eslint-config-next`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit tests. Postgres integration tests also run when `TEST_DATABASE_URL` is set (use a disposable database) |
| `npm run db:migrate` | Applies `db/migrations/*.sql` to `DATABASE_URL` (idempotent) |

## Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Production | Canonical URL for metadata, sitemap, and the API's origin check |
| `DATABASE_URL` | Yes | Postgres connection string. Without it the API returns 500 rather than drop signups |
| `EMAIL_PROVIDER` | Production | `resend` in production; unset or `console` in development (links go to the server log) |
| `EMAIL_API_KEY` / `EMAIL_FROM` | Production | Resend API key, and a sender on a domain verified in Resend |
| `EMAIL_REPLY_TO` | Recommended | A monitored inbox for replies, such as deletion requests (the privacy page tells people to reply) |
| `VERIFICATION_TOKEN_TTL_HOURS` / `VERIFICATION_RESEND_COOLDOWN_SECONDS` / `VERIFICATION_MAX_SENDS_PER_DAY` | No | Defaults: 24, 60, 5 |
| `WAITLIST_ALLOWED_ORIGINS` | No | Extra comma-separated origins allowed to POST (e.g. preview deploys) |
| `AUTH_SECRET` | Admin | Signs admin sessions. Generate with `npx auth secret` |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Admin | Google OAuth client for admin sign-in |
| `ADMIN_BOOTSTRAP_EMAIL` | Admin (first run) | The one Google account allowed to become the first admin, only while `waitlist.admin_users` is empty |
| `AUTH_TRUST_HOST` | Self-hosting | Set to `true` behind your own proxy or host (not needed on Vercel) |
| `ADMIN_TIMEZONE` | No | Time zone for dashboard dates (default `Africa/Lagos`) |

## Page structure

`src/app/page.tsx` only composes sections, in story order:

```text
Navbar → Hero → FragmentedLearning → BuildExperience → IntelligentLearning → AiDemo
→ MoreThanAChatbot → ProductShowcase → LearningJourney → Community → Motivation
→ FutureLearning → WaitlistCTA → Footer
```

```text
src/
├── app/                 routes, metadata, OG image, icons, robots, sitemap, /api/waitlist
├── components/
│   ├── layout/          navbar, footer, legal page shell
│   ├── landing/         one file per section, plus waitlist-form and join-button
│   ├── visuals/         product-window, intelligence-canvas, knowledge-tree, practice-session
│   ├── motion/          Reveal/Stagger primitives, useScrollRange, MotionConfig provider
│   └── ui/              button, input, badge, card, container/section, logo
└── lib/                 site config, analytics, waitlist (validation, rate limit, storage)
```

### Design system

Tokens live in `src/app/globals.css` (`@theme`): surfaces, foregrounds, borders, a single ember accent (`accent` for fills, `accent-strong` for small text at AA contrast), and an `ink` palette for the dark vision section. The type scale is four utilities: `text-display`, `text-heading`, `text-body`, and `text-small`. Fonts: Geist (UI), Instrument Serif italic (emphasis), and Geist Mono (labels).

### Motion

- **Entering content is CSS, not JS.** `Reveal`, `Stagger`, and the `draw-*`, `wipe-down`, `grow-bar`, `dim-in`, and `rail-fill` classes use CSS scroll-driven animations (`animation-timeline: view()`, defined in `globals.css`). They cost no hydration, respect reduced motion, and fall back to static content where unsupported. An `overflow: hidden` ancestor is a scroll container and captures `view()`, so use `overflow-clip` on anything that hosts reveals.
- **Framer Motion (`m.*` under `LazyMotion strict`) is only for real interactivity:** the fragmented-learning scroll story, the AI demo, the practice session, the waitlist form, and the navbar menu.
- **Use `useScrollRange` for any Framer scroll-linked value.** Framer runs simple scroll transforms on the browser's native ScrollTimeline, where partial keyframe ranges wrap instead of clamping.
- **Avoid non-compositable infinite animations** (for example `stroke-dashoffset`). They restyle every frame. `OffscreenAnimationPauser` pauses looping CSS animations while they're off-screen.

### Product mockups

All product UI is illustrative, built from `ProductWindow`. The AI demo is scripted and labeled as such on the page. Nothing calls BUILD's AI service.

## Waitlist API

**A valid-looking email is not a confirmed member.** A signup is confirmed only when the owner clicks the link in the verification email.

```text
POST /api/waitlist ─► pending row + email (button and link) ─► GET /api/waitlist/verify?token= ─► verified
```

| Endpoint | Behavior |
| --- | --- |
| `POST /api/waitlist` `{ email, source? }` | `verification_sent` (new or still pending; never a second row), `duplicate` (already verified), `invalid`, `invalid_domain`, `email_failed` (row kept; retry allowed), `rate_limited`, `error` |
| `GET /api/waitlist/verify?token=` | Verifies atomically, then redirects to `/waitlist/verified?status=verified\|expired\|invalid` |
| `POST /api/waitlist/verify/resend` `{ email }` | Always answers `ok`, so it can't reveal who's on the list; only pending addresses get an email |

- **Validation:** server-side format and length checks, JSON-only, 2 KB body cap, plus a DNS check that the domain can receive mail. There is no mailbox probing; the email itself is the proof.
- **Normalization:** lowercased; Gmail dots and `+tags` collapsed. `UNIQUE(email_normalized)` in the database is the source of truth, so concurrent duplicates can't race.
- **Tokens:** 32 random bytes, SHA-256 hashed at rest (the raw token only exists in the email), single-use, 24-hour expiry. A new link invalidates the previous one. Verifying clears the hash.
- **Sending limits:** 60-second cooldown and 5 emails per address per 24 hours, enforced atomically in the database; throttled requests look identical to sent ones. A failed delivery keeps the pending row and lifts the cooldown.
- **Abuse controls:** Origin check (same host or allow-list), honeypot field, minimum time-to-submit (bots get a fake success), and per-IP limits (signup 5/min and 20/hour; resend 3/min and 10/hour plus 3/hour per address; verify 20/min). Limits live in `waitlist.rate_limits` under salted hashes, so they hold across Vercel's serverless instances and no raw IPs are stored.
- **Source:** which Join button led to the signup (`hero`, `navbar`, `mobile_menu`), else `final_cta`.
- **Email provider:** `lib/email` defines a small `EmailProvider` interface. Resend is implemented over its HTTP API; swap in Postmark, SES, and others by adding a provider there.
- Data lives in the `waitlist` schema, separate from BUILD platform tables. `db/roles.sql` creates a least-privilege `waitlist_app` role for `DATABASE_URL`.

## Admin dashboard

`/admin/waitlist` shows totals (Total, Verified, Pending, Today, 7 and 30 days), sources, an All / Verified / Pending filter, a searchable and paginated list with status badges, and a CSV export (including `verification_status` and `verified_at`, never token fields). Sign in at `/admin/login`. **Total** counts every signup; the confirmed waitlist is **Verified**, so use that for any public figure.

**Access model:** Google sign-in proves identity; it never grants access by itself. Only an **active** row in `waitlist.admin_users` does, matched by Google's stable account id (`sub`), not by email. There is no signup page. v1 allows exactly **one active admin**, enforced by a database index. Every admin page and API re-checks status in the database, so disabling an admin ends their session immediately. Sign-ins, refusals, and exports are written to `waitlist.admin_audit`.

**Admin API** (all require an active admin; 401 otherwise):

| Endpoint | Returns |
| --- | --- |
| `GET /api/admin/waitlist?q=&page=` | Paginated, searchable signups |
| `GET /api/admin/waitlist/stats` | Totals and counts by source |
| `GET /api/admin/waitlist/export` | CSV (audited; formula-like cells neutralized) |

### First-time setup

1. In Google Cloud Console, go to **APIs & Services → Credentials → Create OAuth client ID** (Web application). Add the authorized redirect URI `https://<your-domain>/api/auth/callback/google` (and `http://localhost:3000/api/auth/callback/google` for local use).
2. Set `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, and `ADMIN_BOOTSTRAP_EMAIL` to your own Google address.
3. Run `npm run db:migrate`, deploy, open `/admin/login`, and continue with that Google account. You become the admin. After that, `ADMIN_BOOTSTRAP_EMAIL` is ignored.

### Managing the admin (database owner)

Admins are changed deliberately in SQL, never by signing in:

```sql
-- Replace the admin: disable the current one, then provision the new email.
-- The new person becomes admin on their first Google sign-in with that address.
UPDATE waitlist.admin_users SET status = 'disabled' WHERE status = 'active';
INSERT INTO waitlist.admin_users (email) VALUES ('new.admin@gmail.com');

-- Temporarily revoke access (takes effect on their next request):
UPDATE waitlist.admin_users SET status = 'disabled' WHERE email = 'someone@gmail.com';

-- Review recent admin activity:
SELECT a.created_at, u.email, a.action, a.detail
FROM waitlist.admin_audit a LEFT JOIN waitlist.admin_users u ON u.id = a.admin_id
ORDER BY a.created_at DESC LIMIT 50;
```

## Analytics

`lib/analytics.ts` pushes events to `window.dataLayer` and forwards to Plausible or PostHog if their script is present. No vendor is bundled yet. Events: `page_view`, `hero_cta_click` (with `location`), `product_demo_view`, `waitlist_form_focus`, `waitlist_submit`, `waitlist_success`, `waitlist_duplicate`, and `waitlist_error` (with `reason`).

## Deploying

1. Provision Postgres. Run `npm run db:migrate` as the owner, then create the app role with `db/roles.sql` and point `DATABASE_URL` at it.
2. Set `NEXT_PUBLIC_SITE_URL` to the production origin. It's baked in at build time and used for verification links.
3. Set up email (see below) and set `EMAIL_PROVIDER=resend`, `EMAIL_API_KEY`, `EMAIL_FROM` and `EMAIL_REPLY_TO`.
4. Configure admin sign-in (see [First-time setup](#first-time-setup)) and bootstrap your admin account.
5. Add an analytics script in `src/app/layout.tsx` once a provider is chosen.
6. Have the privacy and terms pages (`/privacy`, `/terms`) reviewed before launch.

### Vercel

Add these as encrypted environment variables, and keep Production and Preview/Development credentials separate: `DATABASE_URL`, `NEXT_PUBLIC_SITE_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `ADMIN_BOOTSTRAP_EMAIL`, `EMAIL_PROVIDER`, `EMAIL_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`. Add the production Google OAuth redirect URI `https://<production-domain>/api/auth/callback/google`. Don't reuse local callback URLs. All verification state and rate limits live in Postgres, so nothing depends on instance memory or the filesystem.

### Email deliverability

Send from a BUILD domain or subdomain you control (for example `hello@mail.<domain>`), never a personal Gmail address. In Resend, add the domain and publish the DNS records it gives you: **SPF** and **DKIM** (required), plus a **DMARC** record (start with `v=DMARC1; p=none; rua=mailto:<you>`). Send a test signup to a Gmail and an Outlook inbox before launch.

### Production cutover

Pre-launch rows are test data, and migration 003 marks every existing row `pending` rather than pretending it was verified. Before opening the waitlist publicly, remove test signups (and optionally reset rate-limit counters) as the database owner:

```sql
DELETE FROM waitlist.signups;        -- or: WHERE created_at < '<launch timestamp>'
DELETE FROM waitlist.rate_limits;
```
