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
| `EMAIL_PROVIDER` | Production | Primary provider: `brevo` in production; unset or `console` in development (links go to the server log) |
| `BREVO_API_KEY` / `RESEND_API_KEY` | Production | Provider keys. With `EMAIL_PROVIDER=brevo`, setting `RESEND_API_KEY` enables Resend as the fallback |
| `EMAIL_FROM` / `EMAIL_FROM_NAME` | Production | Sender address on a domain verified in both providers, and display name (`BUILD`) |
| `EMAIL_FALLBACK_PROVIDER` | No | Override the fallback (`resend` or `brevo`) or disable it (`none`) |
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

### Brand

- **Logo:** `public/brand/build-mark.svg` is the vector mark (gradient "B" with a graduation cap and rising bars), redrawn from the supplied logo (`public/brand/build-logo-original.jpg`, kept as the reference). `build-mark-email.png` is a 4× raster for email clients, which block SVG. The favicon (`src/app/icon.svg`), Apple icon and Open Graph image derive from the same mark.
- **Components:** `Logo` (mark plus "BUILD" wordmark in `brand-ink`), `BuildMark` (the mark alone), and `BuildMarkSilhouette` (single-colour, for watermarks). Use the mark wherever the page stands for BUILD itself.
- **The spark ✦** now means only *BUILD's intelligence* (the BUILD AI pill and the AI chat avatar), never the brand.
- **Colour tokens:** `brand-blue` `#1f7bff`, `brand-indigo` `#4353f0`, `brand-violet` `#6a3be6` (the mark's gradient) and `brand-ink` `#10163a` (the wordmark).
- **Clear space and minimums:** keep at least half the mark's width clear around it; don't render it below 16 px tall. Don't recolour, rotate or stretch it; for one-colour contexts use `BuildMarkSilhouette`.

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
- **Email delivery:** see [Email architecture](#email-architecture). The waitlist code only knows it needs to send a verification email, not who delivers it.
- Data lives in the `waitlist` schema, separate from BUILD platform tables. `db/roles.sql` creates a least-privilege `waitlist_app` role for `DATABASE_URL`.

## Email architecture

```text
verification service ─► email router ─► Brevo (primary) ──────────────► inbox
                                        └─ transient failure ─► Resend (fallback) ─► inbox
```

- **Brevo carries all normal traffic; Resend is only for resilience.** This is not round-robin. Brevo's free-tier branding in emails is accepted for BUILD's current stage.
- `lib/email/` holds `brevo.ts` and `resend.ts` (plain HTTP adapters, no SDKs), `router.ts`, `classify.ts`, and a provider-independent template, so both providers send identical copy. Every adapter returns a classified result and never throws.
- **When the fallback is used.** Only when Brevo *provably didn't accept* the message: connection refused, DNS failure, connect timeout, HTTP 429, 500/502/503, or `not_enough_credits` (the daily quota is exhausted).
- **When it isn't:**
  - *Unknown* outcomes (our 10-second timeout, a reset mid-request, 504) might already be delivered, so the router doesn't try Resend. The person still sees "check your inbox"; if nothing arrives, the resend button works after the 60-second cooldown.
  - *Permanent* rejections (400/422, such as a bad recipient) would fail on Resend too. The person can retry immediately.
  - *Configuration* errors (401/403, missing key, unverified sender, unrecognized IP) are logged and not masked.
- **Duplicates.** Each claimed verification link is one logical email with a UUID. Resend receives it as an `Idempotency-Key`, so Resend deduplicates retries for 24 hours. Brevo has no idempotency support; the id goes in an `X-BUILD-Message-Id` header for tracing only. Not falling back after an unknown outcome is what keeps cross-provider duplicates rare. Exactly-once delivery isn't possible with Brevo, but a duplicate needs an ambiguous Brevo failure *and* a manual resend, and even then both links point to the same signup.
- **Tracking.** Every attempt goes into `waitlist.email_deliveries` (provider, sent/failed, failure class, provider message id; never tokens, URLs or content), along with one structured log line per attempt (`event: email_attempt`, `provider`, `result`, `failure_class`, `fallback`).

  ```sql
  -- How often is the fallback needed?
  SELECT provider, status, failure_class, count(*) FROM waitlist.email_deliveries
  WHERE created_at > now() - interval '7 days' GROUP BY 1, 2, 3 ORDER BY 4 DESC;
  ```

- **What never changes:** the public API never reveals which provider was used or whether a fallback happened. Rate limits, cooldowns, anti-enumeration, and token rules are enforced before any provider is called. Delivery never marks anyone verified; only clicking the link does.

### Testing real delivery

1. **Brevo:** create an account and a transactional API key. Add and verify a sender (or your domain) under *Senders, Domains & Dedicated IPs*. Under *Security → Authorised IPs*, deactivate IP blocking: Vercel's IPs change, so blocking would reject every send. Set `EMAIL_PROVIDER=brevo`, `BREVO_API_KEY`, `EMAIL_FROM` and `EMAIL_FROM_NAME=BUILD` in `.env.local`. Sign up with a real inbox, then check that the email arrives and that both the button and the raw link verify. Try resend too, and confirm there's still one row.
2. **Resend fallback:** add `RESEND_API_KEY`, then make Brevo fail *transiently* for a local run only. The easiest way is to point Brevo at an unreachable host by blocking `api.brevo.com` in your hosts file (`127.0.0.1 api.brevo.com`), which gives `ECONNREFUSED`, a transient failure. Sign up again: the email should arrive via Resend, logs should show `"fallback":"resend"`, and `email_deliveries` should hold a failed Brevo row and a sent Resend row. Remove the hosts entry afterwards.

### Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| `email_failed` on every signup, log says `BREVO_API_KEY is missing` | Key not set in this environment (on Vercel, check the environment scope) |
| Brevo `unauthorized` | Wrong key, or *Authorised IPs* is blocking the server's IP |
| Brevo `permission_denied` / `account_under_validation` | Sender or domain not verified, or the Brevo account still under review |
| Brevo `not_enough_credits`, emails arriving via Resend | Daily free quota used up; the fallback is doing its job |
| Resend 403 `validation_error` | Sending domain not verified in Resend |

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
3. Set up email (see below) and set `EMAIL_PROVIDER=brevo`, `BREVO_API_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_FROM_NAME` and `EMAIL_REPLY_TO`.
4. Configure admin sign-in (see [First-time setup](#first-time-setup)) and bootstrap your admin account.
5. Add an analytics script in `src/app/layout.tsx` once a provider is chosen.
6. Have the privacy and terms pages (`/privacy`, `/terms`) reviewed before launch.

### Vercel

Add these as encrypted environment variables, and keep Production and Preview/Development credentials separate: `DATABASE_URL`, `NEXT_PUBLIC_SITE_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `ADMIN_BOOTSTRAP_EMAIL`, `EMAIL_PROVIDER`, `BREVO_API_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_FROM_NAME`, `EMAIL_REPLY_TO`. None of these may use the `NEXT_PUBLIC_` prefix. Add the production Google OAuth redirect URI `https://<production-domain>/api/auth/callback/google`. Don't reuse local callback URLs. All verification state and rate limits live in Postgres, so nothing depends on instance memory or the filesystem.

### Email deliverability

Send from a BUILD domain or subdomain you control (for example `hello@mail.<domain>`), never a personal Gmail address or a provider's test sender. Use the **same sending identity in both providers**, so fallback emails look identical. In **Brevo** (*Senders, Domains & Dedicated IPs → Domains*) and in **Resend** (*Domains*), add the domain and publish the DNS records each gives you: **SPF** and **DKIM** for each, plus one **DMARC** record for the domain (start with `v=DMARC1; p=none; rua=mailto:<you>`). SPF allows only one TXT record per name, so combine both providers' `include:` entries into a single record. Send a test signup to a Gmail and an Outlook inbox before launch.

### Production cutover

Pre-launch rows are test data, and migration 003 marks every existing row `pending` rather than pretending it was verified. Before opening the waitlist publicly, remove test signups (and optionally reset rate-limit counters) as the database owner:

```sql
DELETE FROM waitlist.signups;        -- or: WHERE created_at < '<launch timestamp>'
DELETE FROM waitlist.rate_limits;
```
