# BUILD Waitlist

The waitlist landing page for **BUILD**: *your learning journey, intelligently connected.*

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Framer Motion · Postgres

## Quick start

```bash
npm install
cp .env.example .env.local   # optional in development
npm run dev                  # http://localhost:3000
```

Without `DATABASE_URL`, development signups are written to `.data/waitlist.json` (git-ignored), so the form works with no setup.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint (flat config, `eslint-config-next`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit tests (email normalization, rate limiter) |
| `npm run db:migrate` | Applies `db/migrations/*.sql` to `DATABASE_URL` (idempotent) |

## Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Production | Canonical URL for metadata, sitemap, and the API's origin check |
| `DATABASE_URL` | Production | Postgres connection string. The API returns 500 in production without it rather than drop signups |
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

`POST /api/waitlist` with `{ "email": string, "source"?: string }` returns `{ "status": "created" | "duplicate" | "invalid" | "rate_limited" | "error" }`.

- **Validation:** server-side format and length checks, JSON-only, 2 KB body cap.
- **Normalization:** lowercased; Gmail dots and `+tags` collapsed. `UNIQUE(email_normalized)` in the database is the source of truth, so concurrent duplicates can't race.
- **Abuse controls:** Origin check (same host or allow-list), per-IP rate limit (5/min, 20/hour), honeypot field, and a minimum time-to-submit. Bots get a fake success.
- The rate limiter is **in-memory per instance**. On serverless or multi-instance hosting, add a platform or edge rate limit, or back it with Redis or Postgres.
- **Source:** which Join button led to the signup (`hero`, `navbar`, `mobile_menu`), else `final_cta`.
- Data lives in the `waitlist` schema, separate from BUILD platform tables. `db/roles.sql` creates a least-privilege `waitlist_app` role for `DATABASE_URL`.

## Admin dashboard

`/admin/waitlist` shows totals, sources, a searchable and paginated list, and a CSV export. Sign in at `/admin/login`.

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
2. Set `NEXT_PUBLIC_SITE_URL` to the production origin.
3. Configure admin sign-in (see [First-time setup](#first-time-setup)) and bootstrap your admin account.
4. Add an analytics script in `src/app/layout.tsx` once a provider is chosen.
5. Have the privacy and terms pages (`/privacy`, `/terms`) reviewed before launch.
