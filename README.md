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

## Analytics

`lib/analytics.ts` pushes events to `window.dataLayer` and forwards to Plausible or PostHog if their script is present. No vendor is bundled yet. Events: `page_view`, `hero_cta_click` (with `location`), `product_demo_view`, `waitlist_form_focus`, `waitlist_submit`, `waitlist_success`, `waitlist_duplicate`, and `waitlist_error` (with `reason`).

## Deploying

1. Provision Postgres and set `DATABASE_URL`, then run `npm run db:migrate`.
2. Set `NEXT_PUBLIC_SITE_URL` to the production origin.
3. Add an analytics script in `src/app/layout.tsx` once a provider is chosen.
4. Have the privacy and terms pages (`/privacy`, `/terms`) reviewed before launch.
