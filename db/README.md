# Marlow House — Hotel Marketing Analytics Database

A 730-day (2024-09-01 → 2026-08-31) seeded dataset for an independent 74-room
boutique hotel on the California coast, designed to back a marketing dashboard:
seasonality, campaign performance, feeder markets, bookings, revenue, visitor
behavior, and YoY trend comparisons.

Works against any Postgres — **Supabase and Neon free tiers included**.

## Quick start

```bash
pip install "psycopg[binary]" pandas numpy

# 1. (optional) regenerate the data — deterministic, seed=42
python generate_data.py

# 2. point at your database and seed it
#    Supabase: Project Settings → Database → Connection string (URI)
#    Neon:     Dashboard → Connection Details
export DATABASE_URL="postgresql://user:pass@host:5432/dbname"
python seed.py
```

`seed.py` applies `sql/schema.sql` (drop + recreate, so it's idempotent),
bulk-loads every CSV via `COPY` (~34k rows, <1s locally / a few seconds over
WAN), and finishes with reconciliation checks. Re-running produces an
identical clean state.

## Data model

Bookings are the source of truth; every aggregate is derived from them, so
every dashboard view reconciles (verified by `seed.py`'s post-load checks).

```
markets ─┐
channels ─┼─► bookings (18,690 rows, row-level fact)
campaigns ┘        │  derived by generate_data.py
                   ▼
   daily_property_metrics   (730)   occupancy, ADR, RevPAR, revenue, pace
   daily_channel_metrics  (5,110)   sessions → bookings → revenue funnel + spend
   daily_campaign_metrics   (788)   flighted spend, clicks, attributed bookings
   daily_market_metrics   (8,760)   feeder-market sessions/bookings/revenue
```

Dashboard-ready views: `v_monthly_summary`, `v_campaign_summary` (ROAS,
cost-per-booking), `v_market_summary` (booking share), `v_channel_monthly`
(conversion rate by channel).

## What makes the data believable (not noise)

- **Seasonality** — smooth annual curve peaking mid-July (89% occupancy,
  $328 ADR) and troughing in January (38%, $160), plus holiday spikes
  (July 4th, Memorial/Labor Day, Thanksgiving, NYE, Valentine's) and a
  leisure-property weekly rhythm (Fri/Sat arrivals ~1.5× midweek).
- **YoY growth** — ~+8% demand and +5% ADR in year two, so any
  "this year vs last year" comparison shows a coherent up-and-to-the-right
  story (Jul–Aug revenue: $1.25M → $1.34M).
- **Channel mix shift** — OTA share drifts 30.6% → 28.1% while Direct and
  Email grow: the classic "book direct" program narrative.
- **Campaigns** — 14 flighted campaigns over two years with budgets, daily
  spend/impressions/clicks, and probabilistic booking attribution. Performance
  varies meaningfully: Phoenix Heat Escape is the hero (~7–8× ROAS), awareness
  campaigns hover near 1×, email flash sales have zero media spend.
  Campaign flights visibly lift their channel's sessions and bookings.
- **Feeder markets** — LA-dominant drive market (27.5% of bookings) with
  market-specific seasonality: Phoenix over-indexes in summer (heat escape),
  Seattle/Chicago/NY over-index in winter (sun seekers).
- **Funnel consistency** — per-channel conversion rates (Email 4.7%,
  Paid Search 3.1%, Paid Social 0.8%) tie sessions to bookings; ADR carries
  seasonal, weekend, and channel effects; occupancy is computed by expanding
  actual confirmed stay-nights against 74 rooms (sell-out days cap at 100%).
- **Booking behavior** — gamma-distributed lead times that lengthen for
  summer stays (~30 days) vs winter (~19), shorter for OTA; 11% cancellation
  rate; stay lengths 1–9 nights skewing short on weekends.

## Repo layout

```
generate_data.py   # deterministic generator (numpy/pandas, seed=42)
seed.py            # schema + COPY loader + validations, any DATABASE_URL
sql/schema.sql     # tables, FKs, checks, indexes, dashboard views
data/*.csv         # generated output, committed for reproducibility
```
