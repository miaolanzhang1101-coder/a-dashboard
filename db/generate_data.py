#!/usr/bin/env python3
"""
Generate 731 days (2024-09-01 .. 2026-08-31) of plausible marketing data for an
independent boutique hotel: "The Marlow House", 74 rooms, coastal California.

Design principles
-----------------
1. Bookings are the source of truth. Every aggregate table (property KPIs,
   channel performance, feeder markets, campaign metrics) is DERIVED from the
   row-level bookings table, so every dashboard view reconciles.
2. Demand is modeled at the *arrival date* level, then booking dates are
   back-computed via a lead-time distribution. This makes both occupancy
   curves and booking-pace curves look right at the same time.
3. Deterministic: fixed RNG seed -> identical output on every run.

Baked-in, explainable patterns (things a reviewer should be able to "find"):
  * Annual seasonality: summer peak (Jul-Aug), shoulder spring/fall,
    January trough. Holiday spikes (Jul 4, Memorial/Labor Day, Thanksgiving,
    Christmas/NYE, Valentine's).
  * Weekly seasonality: leisure property -> Fri/Sat arrivals dominate.
  * Year-over-year growth: ~+8% demand, ~+5% ADR in year 2 (the marketing
    program is working).
  * Channel mix shift: OTA share slowly declines while Direct/Email grow
    (a classic "book direct" program narrative).
  * Campaigns: 14 flighted campaigns with budgets; during a flight, the
    campaign's channel gets a measurable lift in sessions and bookings, and a
    share of that channel's bookings is attributed to the campaign.
  * Feeder markets: LA-dominant drive market with market-specific seasonality
    (e.g. Phoenix over-indexes in summer heat-escape months).
  * Funnel consistency: sessions -> conversion rate -> bookings -> ADR ->
    revenue all hang together per channel.
"""

import numpy as np
import pandas as pd
from datetime import date, timedelta
from pathlib import Path

RNG = np.random.default_rng(42)
OUT = Path(__file__).parent / "data"
OUT.mkdir(exist_ok=True)

# ---------------------------------------------------------------- constants
WINDOW_START = date(2024, 9, 1)     # first day of published fact tables
WINDOW_END   = date(2026, 8, 31)    # 731 days inclusive
GEN_START    = WINDOW_START - timedelta(days=75)   # warm-up so edges look right
GEN_END      = WINDOW_END + timedelta(days=45)     # future arrivals already booked

ROOMS = 74
BASE_ARRIVALS_PER_DAY = 21.0        # bookings arriving on an average day
YOY_GROWTH = 0.08                   # demand growth in year 2
BASE_ADR = 232.0                    # blended average daily rate, year 1
ADR_YOY = 0.05
CANCEL_RATE = 0.115

# ---------------------------------------------------------------- dimensions
MARKETS = [
    # id, name, region, country, weight, summer_boost, winter_boost
    (1,  "Los Angeles",   "CA",  "US", 0.29, 1.00, 1.00),
    (2,  "San Francisco", "CA",  "US", 0.15, 1.00, 1.05),
    (3,  "San Diego",     "CA",  "US", 0.08, 0.95, 1.00),
    (4,  "Phoenix",       "AZ",  "US", 0.09, 1.45, 0.70),  # heat escape
    (5,  "Las Vegas",     "NV",  "US", 0.06, 1.20, 0.85),
    (6,  "Sacramento",    "CA",  "US", 0.06, 1.05, 1.00),
    (7,  "Seattle",       "WA",  "US", 0.05, 0.90, 1.30),  # winter sun
    (8,  "Dallas",        "TX",  "US", 0.05, 1.10, 0.95),
    (9,  "New York",      "NY",  "US", 0.07, 0.95, 1.20),
    (10, "Chicago",       "IL",  "US", 0.05, 0.95, 1.25),
    (11, "Vancouver",     "BC",  "CA", 0.03, 0.90, 1.25),
    (12, "London",        "ENG", "GB", 0.02, 1.05, 1.00),
]

CHANNELS = [
    # id, name, is_paid, on_site (traffic hits our website), conv_rate, base_share
    (1, "Direct / Organic", False, True,  0.024, 0.26),
    (2, "Paid Search",      True,  True,  0.031, 0.14),
    (3, "Paid Social",      True,  True,  0.008, 0.05),
    (4, "Email",            False, True,  0.047, 0.09),
    (5, "Metasearch",       True,  True,  0.036, 0.07),
    (6, "OTA",              False, False, np.nan, 0.33),   # Booking/Expedia
    (7, "Referral / PR",    False, True,  0.018, 0.06),
]
CH = {c[1]: c[0] for c in CHANNELS}

# Campaigns: (id, name, channel, objective, start, end, total_budget)
CAMPAIGNS = [
    (1,  "Fall Coastal Escape 2024",     "Paid Search", "bookings",    date(2024, 9, 9),  date(2024, 11, 3),  14000),
    (2,  "Holiday Lights Package 2024",  "Paid Social", "awareness",   date(2024, 11, 15), date(2024, 12, 28), 9000),
    (3,  "Winter Direct Booking Push",   "Metasearch",  "bookings",    date(2025, 1, 6),  date(2025, 2, 28),  11000),
    (4,  "Valentine's Getaway 2025",     "Email",       "bookings",    date(2025, 1, 27), date(2025, 2, 13),  1200),
    (5,  "Spring Break CA Drive 2025",   "Paid Search", "bookings",    date(2025, 3, 3),  date(2025, 4, 20),  16000),
    (6,  "Summer Peak Brand 2025",       "Paid Social", "awareness",   date(2025, 5, 12), date(2025, 8, 17),  22000),
    (7,  "Phoenix Heat Escape 2025",     "Paid Search", "bookings",    date(2025, 5, 26), date(2025, 8, 10),  13000),
    (8,  "Labor Day Flash Sale 2025",    "Email",       "bookings",    date(2025, 8, 18), date(2025, 8, 31),  1500),
    (9,  "Fall Wine Country 2025",       "Paid Search", "bookings",    date(2025, 9, 8),  date(2025, 11, 2),  17000),
    (10, "Holiday Lights Package 2025",  "Paid Social", "awareness",   date(2025, 11, 14), date(2025, 12, 27), 11000),
    (11, "Jan Direct Booking Push 2026", "Metasearch",  "bookings",    date(2026, 1, 5),  date(2026, 2, 27),  12500),
    (12, "Spring Break CA Drive 2026",   "Paid Search", "bookings",    date(2026, 3, 2),  date(2026, 4, 19),  18000),
    (13, "Summer Peak Brand 2026",       "Paid Social", "awareness",   date(2026, 5, 11), date(2026, 8, 16),  25000),
    (14, "Phoenix Heat Escape 2026",     "Paid Search", "bookings",    date(2026, 5, 25), date(2026, 8, 9),   15000),
]

HOLIDAYS = {  # date -> demand multiplier applied to arrivals near it
    date(2024, 11, 28): 1.35, date(2024, 12, 24): 1.30, date(2024, 12, 31): 1.55,
    date(2025, 2, 14): 1.40, date(2025, 5, 26): 1.45, date(2025, 7, 4): 1.60,
    date(2025, 9, 1): 1.45, date(2025, 11, 27): 1.35, date(2025, 12, 24): 1.30,
    date(2025, 12, 31): 1.55, date(2026, 2, 14): 1.40, date(2026, 5, 25): 1.45,
    date(2026, 7, 3): 1.60, date(2024, 9, 2): 1.40,
}

DOW_ARRIVAL = {0: 0.80, 1: 0.75, 2: 0.82, 3: 0.98, 4: 1.55, 5: 1.45, 6: 0.85}


# ---------------------------------------------------------------- helpers
def annual_curve(d: date) -> float:
    """Smooth seasonality: peak ~mid-July, trough ~mid-January."""
    doy = d.timetuple().tm_yday
    peak = np.cos(2 * np.pi * (doy - 197) / 365.25)      # 197 ≈ Jul 16
    return 1.0 + 0.38 * peak + 0.07 * np.cos(4 * np.pi * (doy - 100) / 365.25)


def holiday_mult(d: date) -> float:
    m = 1.0
    for h, boost in HOLIDAYS.items():
        gap = abs((d - h).days)
        if gap <= 3:
            m = max(m, 1 + (boost - 1) * (1 - gap / 4))
    return m


def yoy_mult(d: date, rate: float) -> float:
    years = (d - WINDOW_START).days / 365.25
    return (1 + rate) ** years


def channel_share(name: str, d: date) -> float:
    """Base mix + slow drift: OTA -> Direct/Email over two years."""
    base = dict((c[1], c[5]) for c in CHANNELS)[name]
    t = (d - WINDOW_START).days / 731.0          # 0 -> 1 over the window
    drift = {"OTA": -0.05, "Direct / Organic": 0.030, "Email": 0.012,
             "Metasearch": 0.008}.get(name, 0.0)
    return base + drift * t


def campaign_lift(channel_name: str, d: date):
    """(lift multiplier for the channel's demand, active campaign id or None)."""
    for cid, _, ch, obj, s, e, _ in CAMPAIGNS:
        if ch == channel_name and s <= d <= e:
            return (1.28 if obj == "bookings" else 1.16), cid
    return 1.0, None


# ---------------------------------------------------------------- bookings
def generate_bookings() -> pd.DataFrame:
    rows = []
    market_w = np.array([m[4] for m in MARKETS], dtype=float)
    booking_id = 1

    d = GEN_START
    while d <= GEN_END:
        season = annual_curve(d) * holiday_mult(d) * DOW_ARRIVAL[d.weekday()]
        demand = BASE_ARRIVALS_PER_DAY * season * yoy_mult(d, YOY_GROWTH)

        # channel-level expected arrivals (campaigns lift their channel)
        for _, cname, is_paid, on_site, conv, _ in [(c[0], c[1], c[2], c[3], c[4], c[5]) for c in CHANNELS]:
            lift, camp = campaign_lift(cname, d)
            lam = demand * channel_share(cname, d) * lift
            n = RNG.poisson(lam)
            if n == 0:
                continue

            # seasonal market mix
            mw = market_w.copy()
            month = d.month
            for i, m in enumerate(MARKETS):
                if month in (6, 7, 8):
                    mw[i] *= m[5]
                elif month in (12, 1, 2):
                    mw[i] *= m[6]
            # Phoenix Heat Escape campaigns skew the mix further
            if camp in (7, 14):
                mw[3] *= 2.6
            mw /= mw.sum()

            mkts = RNG.choice(len(MARKETS), size=n, p=mw)
            nights = np.clip(RNG.geometric(0.42, size=n), 1, 9)
            # weekend arrivals skew shorter, midweek can run longer
            if d.weekday() in (4, 5):
                nights = np.clip(nights, 1, 4)

            # lead time: longer for summer stays, shorter for OTA
            base_lead = 34 if d.month in (5, 6, 7, 8) else 22
            if cname == "OTA":
                base_lead *= 0.62
            leads = np.clip(RNG.gamma(2.0, base_lead / 2.0, size=n), 0, 180).astype(int)

            # ADR: seasonal + weekend premium + channel effect + YoY
            adr_season = 1 + 0.30 * (annual_curve(d) - 1) / 0.38
            adr_base = BASE_ADR * adr_season * yoy_mult(d, ADR_YOY)
            if d.weekday() in (4, 5):
                adr_base *= 1.12
            ch_adr = {"OTA": 0.97, "Email": 0.99, "Direct / Organic": 1.03,
                      "Referral / PR": 1.02}.get(cname, 1.0)
            adrs = np.round(RNG.normal(adr_base * ch_adr, 24, size=n), 2)
            adrs = np.clip(adrs, 119, 520)

            cancelled = RNG.random(n) < CANCEL_RATE
            camp_attr = (RNG.random(n) < 0.62) if camp else np.zeros(n, bool)

            for i in range(n):
                nts = int(nights[i])
                checkin = d
                bdate = d - timedelta(days=int(leads[i]))
                rows.append((
                    booking_id, bdate, checkin, checkin + timedelta(days=nts),
                    nts, 1, int(RNG.integers(1, 4)),
                    MARKETS[mkts[i]][0], CH[cname],
                    camp if camp_attr[i] else None,
                    round(float(adrs[i]) * nts, 2), float(adrs[i]),
                    int(leads[i]),
                    "cancelled" if cancelled[i] else "confirmed",
                ))
                booking_id += 1
        d += timedelta(days=1)

    df = pd.DataFrame(rows, columns=[
        "id", "booking_date", "checkin_date", "checkout_date", "nights",
        "rooms", "guests", "market_id", "channel_id", "campaign_id",
        "room_revenue", "adr", "lead_time_days", "status"])
    # keep bookings whose booking OR stay activity touches the window
    keep = (df["booking_date"] <= WINDOW_END) & (df["checkout_date"] >= WINDOW_START)
    return df[keep].reset_index(drop=True)


# ---------------------------------------------------------------- aggregates
def build_aggregates(bk: pd.DataFrame):
    days = pd.date_range(WINDOW_START, WINDOW_END, freq="D").date
    conf = bk[bk.status == "confirmed"]

    # --- occupancy: expand confirmed stays into room-nights
    stay = conf.loc[:, ["checkin_date", "nights", "room_revenue", "adr"]]
    nights_idx = stay.index.repeat(stay["nights"])
    occ = pd.DataFrame({
        "date": [ci + timedelta(days=k)
                 for ci, n in zip(stay["checkin_date"], stay["nights"])
                 for k in range(n)],
        "adr": stay.loc[nights_idx, "adr"].values,
    })
    occ = occ[(occ.date >= WINDOW_START) & (occ.date <= WINDOW_END)]
    occ_g = occ.groupby("date").agg(rooms_occupied=("adr", "size"),
                                    adr=("adr", "mean"))
    # cap at physical capacity (overflow days -> sold out)
    occ_g["rooms_occupied"] = occ_g["rooms_occupied"].clip(upper=ROOMS)

    made = bk[(bk.booking_date >= WINDOW_START) & (bk.booking_date <= WINDOW_END)]
    made_g = made.groupby("booking_date").agg(
        bookings_made=("id", "size"),
        cancellations=("status", lambda s: int((s == "cancelled").sum())))

    prop = pd.DataFrame({"date": days}).set_index("date")
    prop = prop.join(occ_g).join(made_g).fillna(0)
    prop["rooms_available"] = ROOMS
    prop["occupancy_rate"] = (prop.rooms_occupied / ROOMS).round(4)
    prop["adr"] = prop["adr"].round(2)
    prop["room_revenue"] = (prop.rooms_occupied * prop.adr).round(2)
    prop["revpar"] = (prop.room_revenue / ROOMS).round(2)
    prop = prop.reset_index()[["date", "rooms_available", "rooms_occupied",
                               "occupancy_rate", "adr", "revpar", "room_revenue",
                               "bookings_made", "cancellations"]]
    prop[["rooms_occupied", "bookings_made", "cancellations"]] = \
        prop[["rooms_occupied", "bookings_made", "cancellations"]].astype(int)

    # --- channel daily: bookings/revenue by booking date + funnel above it
    chan_rows = []
    conv = {c[0]: c[4] for c in CHANNELS}
    onsite = {c[0]: c[3] for c in CHANNELS}
    paid = {c[0]: c[2] for c in CHANNELS}
    g = made.groupby(["booking_date", "channel_id"]).agg(
        bookings=("id", "size"), revenue=("room_revenue", "sum")).reset_index()
    gmap = {(r.booking_date, r.channel_id): (r.bookings, r.revenue)
            for r in g.itertuples()}
    for d0 in days:
        season = annual_curve(d0) * yoy_mult(d0, YOY_GROWTH)
        for cid, cname, *_ in CHANNELS:
            b, rev = gmap.get((d0, cid), (0, 0.0))
            if onsite[cid]:
                cr = conv[cid]
                base_sessions = b / cr if b else 0
                # non-converting baseline traffic keeps sessions alive on slow days
                noise = RNG.normal(1, 0.08)
                sessions = int(max(0, base_sessions * noise
                                   + 55 * season * channel_share(cname, d0) / 0.2))
                users = int(sessions * RNG.uniform(0.78, 0.86))
            else:
                sessions, users = 0, 0
            spend = imp = clk = 0.0
            chan_rows.append((d0, cid, sessions, users, b, round(rev, 2),
                              spend, int(imp), int(clk)))
    chan = pd.DataFrame(chan_rows, columns=[
        "date", "channel_id", "sessions", "users", "bookings", "revenue",
        "spend", "impressions", "clicks"])

    # --- campaign daily: spend curve + attributed bookings, then push
    #     spend/clicks/impressions up into the channel table so it reconciles
    camp_attr = made[made.campaign_id.notna()].groupby(
        ["booking_date", "campaign_id"]).agg(
        bookings=("id", "size"), revenue=("room_revenue", "sum")).reset_index()
    amap = {(r.booking_date, int(r.campaign_id)): (r.bookings, r.revenue)
            for r in camp_attr.itertuples()}
    camp_rows = []
    cpc_by_channel = {"Paid Search": 1.9, "Paid Social": 0.55, "Metasearch": 1.1,
                      "Email": 0.0}
    ctr_by_channel = {"Paid Search": 0.042, "Paid Social": 0.011,
                      "Metasearch": 0.055, "Email": 0.24}
    for cid, name, chname, obj, s, e, budget in CAMPAIGNS:
        flight = pd.date_range(max(s, WINDOW_START), min(e, WINDOW_END)).date
        ndays = (e - s).days + 1
        daily_budget = budget / ndays
        for d0 in flight:
            spend = 0.0 if chname == "Email" else \
                round(max(0, RNG.normal(daily_budget, daily_budget * 0.18)), 2)
            cpc, ctr = cpc_by_channel[chname], ctr_by_channel[chname]
            clicks = int(spend / cpc) if cpc else int(RNG.normal(310, 40))
            imps = int(clicks / ctr) if ctr else 0
            b, rev = amap.get((d0, cid), (0, 0.0))
            sessions = int(clicks * RNG.uniform(0.82, 0.94))
            camp_rows.append((d0, cid, spend, imps, clicks, sessions, b,
                              round(rev, 2)))
            m = (chan.date == d0) & (chan.channel_id == CH[chname])
            chan.loc[m, "spend"] += spend
            chan.loc[m, "impressions"] += imps
            chan.loc[m, "clicks"] += clicks
    campd = pd.DataFrame(camp_rows, columns=[
        "date", "campaign_id", "spend", "impressions", "clicks", "sessions",
        "bookings", "revenue"])
    chan["spend"] = chan["spend"].round(2)

    # --- market daily
    mk = made.groupby(["booking_date", "market_id"]).agg(
        bookings=("id", "size"), revenue=("room_revenue", "sum")).reset_index()
    mk.columns = ["date", "market_id", "bookings", "revenue"]
    total_sessions = chan.groupby("date")["sessions"].sum()
    w = pd.Series({m[0]: m[4] for m in MARKETS})
    mk_full = []
    for d0 in days:
        ts = total_sessions.get(d0, 0)
        month = d0.month
        ww = w.copy()
        for m in MARKETS:
            if month in (6, 7, 8):
                ww[m[0]] *= m[5]
            elif month in (12, 1, 2):
                ww[m[0]] *= m[6]
        ww /= ww.sum()
        for m in MARKETS:
            mk_full.append((d0, m[0], int(ts * ww[m[0]] * RNG.normal(1, 0.06))))
    mkf = pd.DataFrame(mk_full, columns=["date", "market_id", "sessions"])
    mkt = mkf.merge(mk, on=["date", "market_id"], how="left").fillna(0)
    mkt["bookings"] = mkt["bookings"].astype(int)
    mkt["revenue"] = mkt["revenue"].round(2)

    return prop, chan, campd, mkt


# ---------------------------------------------------------------- main
def main():
    print("Generating bookings...")
    bk = generate_bookings()
    print(f"  {len(bk):,} bookings "
          f"({bk.booking_date.min()} .. {bk.booking_date.max()})")

    print("Building aggregates...")
    prop, chan, campd, mkt = build_aggregates(bk)

    pd.DataFrame(MARKETS, columns=["id", "name", "region", "country", "weight",
                                   "summer_idx", "winter_idx"]) \
        .drop(columns=["weight"]).to_csv(OUT / "markets.csv", index=False)
    pd.DataFrame([(c[0], c[1], c[2], c[3]) for c in CHANNELS],
                 columns=["id", "name", "is_paid", "is_website_channel"]) \
        .to_csv(OUT / "channels.csv", index=False)
    pd.DataFrame(CAMPAIGNS, columns=["id", "name", "channel", "objective",
                                     "start_date", "end_date", "total_budget"]) \
        .assign(channel_id=lambda x: x.channel.map(CH)) \
        .drop(columns=["channel"]) \
        [["id", "name", "channel_id", "objective", "start_date", "end_date",
          "total_budget"]].to_csv(OUT / "campaigns.csv", index=False)

    bk["campaign_id"] = bk["campaign_id"].astype("Int64")  # 1, not 1.0
    bk.to_csv(OUT / "bookings.csv", index=False)
    prop.to_csv(OUT / "daily_property_metrics.csv", index=False)
    chan.to_csv(OUT / "daily_channel_metrics.csv", index=False)
    campd.to_csv(OUT / "daily_campaign_metrics.csv", index=False)
    mkt.to_csv(OUT / "daily_market_metrics.csv", index=False)

    print(f"  property days : {len(prop)}")
    print(f"  channel rows  : {len(chan):,}")
    print(f"  campaign rows : {len(campd):,}")
    print(f"  market rows   : {len(mkt):,}")
    print(f"  avg occupancy : {prop.occupancy_rate.mean():.1%}")
    print(f"  total revenue : ${prop.room_revenue.sum():,.0f}")


if __name__ == "__main__":
    main()
