# Autumn — direct-booking dashboard for Marlow House

Two connected screens that answer one question for an independent hotel owner:
**is Autumn helping us get more direct bookings and revenue?**

| Screen | Route | Job |
|---|---|---|
| The Signal (overview) | `/` | One calm verdict in plain English, the stays and markets behind it, and 2–3 recommended moves with projected impact. |
| Booking attribution & revenue leakage | `/source` | Leads with where revenue *leaks* (OTA commission, wasted campaign spend, cancellations — each with a recovery move), then *attribution*: the booking ledger and channel / market / campaign breakdowns that prove the direct-revenue number. Website & audience detail is present but demoted behind disclosure. |

Both screens read live from Postgres. Nothing on the page is hardcoded.

## Layout

A persistent left sidebar acts as the command center (Stripe / Cloudbeds pattern):
brand, property switcher, and categorized navigation so any view is one click away.

```
Autumn
Marlow House · 74 rooms          <- property switcher
──────────────────────────────
  Overview                       <- screen 1
  Bookings                       <- screen 2 · attribution & leakage
  Marketing                      <- screen 2 · channels, campaigns, website
  Insights                       <- screen 2 · moves, trends, monthly
```

The nav is a flat four-item list. Bookings, Marketing and Insights all point at
sections of the detail screen, and scroll-spy tracks the active section as you move
through it. A slim content top bar carries the page title, the date range,
and the 30d / 90d / 12m period switch.


## Why the second screen is attribution + leakage

The brief asks the detail screen to go deeper into **one** area. Of the options,
booking attribution + revenue leakage is the deepest support for the overview's
headline claim: attribution proves the direct-revenue number reservation-by-
reservation and source-by-source ("do I believe it?"), while leakage reframes it
around the owner's real pain — money paid to OTAs, campaign spend below break-even,
and cancelled stays — each with a recovery path that links to a Steer move. Website
traffic and visitor behavior are a *different* area, so they are demoted behind one
disclosure rather than competing for the screen. Leakage is computed in
`src/lib/leakage.ts` from the same bookings and campaigns as everything else.

## Interaction design (the four innovations)

1. **Source Ledger drawer — the one-click trust move.** Clicking the direct-revenue
   figure on the overview slides a drawer in from the right with the exact reservations
   that make up that number (guest, dates, booking path, confirmation code, commission
   kept). It never navigates away, so context is kept. "Open the full ledger" links to
   the detail screen for all stays.

2. **Investigation Canvas.** When a channel dips meaningfully, an "Investigate the dip"
   button opens a focused diagnosis — the headline drop, where the softness is
   concentrated (ranked channels/markets), and what Autumn is doing — so the owner never
   has to sort through traffic tables themselves. Derived in `src/lib/opportunity.ts`.

3. **Growth vs Maintenance mode.** Layer 1 adapts. In growth mode it leads with lift and
   the plain-English verdict. When an operational alert exists (a broken channel
   connection, slowing pace / emerging booking gap), it switches to maintenance mode and
   leads with the alert. Detection is real (`deriveMode`); append `?view=maintenance` to
   preview the mode on data that is currently healthy.

4. **Ontological object model.** The dashboard reasons about `BookingOpportunity` objects
   (a channel or market with a health state: healthy / watch / degraded) rather than raw
   metric tables. The Signal aggregates their states; mode and investigation are derived
   from the degraded ones. See `buildOpportunities` in `src/lib/opportunity.ts`.

**CQRS in practice.** The read path (Signal + Source) is a pre-computed snapshot rendered
by server components, so the verdict loads instantly. The command path (the Steer's
Approve / Not now) fires a discrete server action independent of the display, with
optimistic UI — zero interface lag. A conversational NL console was deliberately *not*
added: this owner-operator wants answers pushed, not a query box to compose.

## Information architecture

```
The Signal   "Is this worth it? Can I relax?"       verdict + metric row on /
The Source   "Do I believe it — and where do I lose money?"  summarized on /, full on /source
The Steer    "What is Autumn doing about it?"        on both; decisions persist
```

The first layer is categorized so a hotel owner finds anything in one or two
clicks: the metric row and summary panels on `/` each link to the matching
full section on `/source`, and the sidebar jumps straight there.

## Stack

Next.js 14 (App Router, server components) · TypeScript · Tailwind · Recharts ·
[`postgres`](https://github.com/porsager/postgres) driver · Geist Sans (bundled, no font fetch at build).

## 1. Database

The `db/` folder is the seeded dataset (730 days, 2024-09-01 → 2026-08-31, 74-room
boutique hotel). It works on Supabase and Neon free tiers.

```bash
cd db
pip install "psycopg[binary]" pandas numpy
export DATABASE_URL="postgresql://user:pass@host:5432/dbname"   # Supabase / Neon URI
python seed.py            # applies sql/schema.sql, COPYs every CSV, runs reconciliation checks
```

Supabase tip: use the **Session** pooler URI (port 5432) for seeding and the
**Transaction** pooler URI (port 6543) in Vercel.

## 2. Run locally

```bash
npm install
cp .env.example .env      # set DATABASE_URL
npm run dev               # http://localhost:3000
```

`npm run build && npm start` for a production build. `npm run typecheck` for TS only.

## 3. Deploy (Vercel)

1. Push this repo to GitHub.
2. Import into Vercel — framework is auto-detected.
3. Add the `DATABASE_URL` environment variable.
4. Deploy. Both routes are server-rendered on demand; no build-time DB access.

No login is required.

## How the numbers are defined

- **Direct bookings** — confirmed bookings on channels where `channels.is_website_channel = true`
  (everything except OTA). This is the number Autumn is accountable for.
- **Direct revenue** — `bookings.room_revenue` on those stays.
- **Commission you kept** — direct revenue × `OTA_COMMISSION_RATE` (15%, in `src/lib/config.ts`).
  Stated in the UI so the owner knows it is an assumption.
- **Periods** anchor on the latest date in the database (not today) so the dashboard
  never shows an empty trailing window. `?period=30d|90d|12m`. Every metric shows
  "vs the previous period"; the Signal also compares to the same window last year.
- **Attention line** — the first website channel whose bookings fell ≥15% vs the prior
  period (with enough volume to matter), else OTA-share drift, else "All clear".
- **The Steer** — rule-based from the property's own history (`src/lib/narrative.ts`):
  extend a live campaign returning ≥3×, otherwise bring back last year's best
  next-season flight; open winter sun-seeker markets early; shift OTA share with a
  book-direct perk. Approve / Not now persists in a cookie via a server action —
  swap for a `recommendation_decisions` table when Autumn's team authors these by hand.

## Project layout

```
src/app/page.tsx            Screen 1 — The Signal
src/app/source/page.tsx     Screen 2 — Where it comes from
src/app/actions.ts          Approve / Not now server actions
src/lib/queries.ts          every SQL read, typed
src/lib/narrative.ts        verdict sentence, attention line, recommendations
src/lib/period.ts           period + comparison window math
src/components/             Signal, Steer, TrendChart, tables, ui primitives
db/                         schema, generator, CSVs, seed.py
docs/screenshots/           reference dashboard + redesigned screens
```

## Design notes

One typeface, tabular numerals everywhere numbers align. Deep navy ink on a cool
grey canvas; a single ember accent reserved for actions; green and red appear only
on deltas. The Signal is a typographic band, not a stat card, so the sentence leads
and the numbers support it. Every technical term has a `?` explainer in plain
language. Responsive to 390px; keyboard-focus visible; reduced motion respected.
