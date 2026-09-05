#!/usr/bin/env python3
"""
Seed a Postgres database (Supabase, Neon, RDS, local — anything with a
DATABASE_URL) with the generated hotel marketing dataset.

Usage:
    export DATABASE_URL="postgresql://user:pass@host:5432/dbname"
    python seed.py                 # applies schema + loads all CSVs
    python seed.py --skip-schema   # data only

Idempotent: schema.sql drops & recreates tables, so a re-run gives a clean,
identical state. Loading uses COPY, so the full ~34k-row dataset seeds in
seconds even over a WAN connection.
"""

import argparse
import os
import sys
import time
from pathlib import Path

import psycopg

HERE = Path(__file__).parent
DATA = HERE / "data"
SCHEMA = HERE / "sql" / "schema.sql"

# load order respects foreign keys
TABLES = [
    ("markets",                "markets.csv"),
    ("channels",               "channels.csv"),
    ("campaigns",              "campaigns.csv"),
    ("bookings",               "bookings.csv"),
    ("daily_property_metrics", "daily_property_metrics.csv"),
    ("daily_channel_metrics",  "daily_channel_metrics.csv"),
    ("daily_campaign_metrics", "daily_campaign_metrics.csv"),
    ("daily_market_metrics",   "daily_market_metrics.csv"),
]

VALIDATIONS = [
    ("row counts per table",
     """select 'bookings' t, count(*) n from bookings
        union all select 'daily_property_metrics', count(*) from daily_property_metrics
        union all select 'daily_channel_metrics', count(*) from daily_channel_metrics
        union all select 'daily_campaign_metrics', count(*) from daily_campaign_metrics
        union all select 'daily_market_metrics', count(*) from daily_market_metrics
        order by 1"""),
    ("date coverage (expect >= 720 days)",
     "select min(date), max(date), count(*) days from daily_property_metrics"),
    ("channel fact reconciles with bookings fact (expect 0 mismatched days)",
     """select count(*) from (
          select b.booking_date
          from bookings b
          where b.booking_date between (select min(date) from daily_property_metrics)
                                   and (select max(date) from daily_property_metrics)
          group by b.booking_date
          having count(*) <> (select sum(bookings) from daily_channel_metrics c
                              where c.date = b.booking_date)) x"""),
    ("no orphaned foreign keys (expect 0)",
     """select (select count(*) from bookings b
                left join markets m on m.id = b.market_id where m.id is null)
             + (select count(*) from bookings b
                left join channels c on c.id = b.channel_id where c.id is null)
             + (select count(*) from daily_campaign_metrics d
                left join campaigns c on c.id = d.campaign_id where c.id is null)"""),
]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--skip-schema", action="store_true")
    ap.add_argument("--database-url", default=os.environ.get("DATABASE_URL"))
    args = ap.parse_args()

    if not args.database_url:
        print("error: set DATABASE_URL or pass --database-url", file=sys.stderr)
        return 1

    t0 = time.time()
    with psycopg.connect(args.database_url) as conn:
        with conn.cursor() as cur:
            if not args.skip_schema:
                print("Applying schema...")
                cur.execute(SCHEMA.read_text())

            for table, csv_name in TABLES:
                path = DATA / csv_name
                with cur.copy(
                    f"COPY {table} FROM STDIN WITH (FORMAT csv, HEADER true, NULL '')"
                ) as copy, open(path, "rb") as f:
                    while chunk := f.read(65536):
                        copy.write(chunk)
                cur.execute(f"select count(*) from {table}")
                print(f"  {table:<24} {cur.fetchone()[0]:>7,} rows")

        conn.commit()

        print("\nPost-load validations:")
        with conn.cursor() as cur:
            for label, sql in VALIDATIONS:
                cur.execute(sql)
                rows = cur.fetchall()
                print(f"  [{label}]")
                for r in rows:
                    print(f"    {r}")

    print(f"\nDone in {time.time() - t0:.1f}s")
    return 0


if __name__ == "__main__":
    sys.exit(main())
