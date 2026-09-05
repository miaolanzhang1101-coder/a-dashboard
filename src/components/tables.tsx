import { change, int, money, pct, shortDate, nightsLabel } from "@/lib/format";
import type { CampaignRow, ChannelRow, Funnel as FunnelT, MarketRow, RecentBooking } from "@/lib/queries";
import { Bar, Delta, Help, Tag } from "./ui";

export function BookingsList({ rows, showCommission = false }: { rows: RecentBooking[]; showCommission?: boolean }) {
  if (!rows.length) return <p className="text-[13.5px] text-ink-2">No direct bookings in this period.</p>;
  return (
    <ul className="divide-y divide-line">
      {rows.map((b) => (
        <li key={b.id} className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
          <div className="min-w-0">
            <p className="truncate text-[13.5px] text-ink">{b.guests}-guest stay from {b.market}, {nightsLabel(b.nights)}</p>
            <p className="text-[12.5px] text-ink-3">{shortDate(b.checkIn)} → {shortDate(b.checkOut)} · via {b.channel}{b.campaign ? ` · ${b.campaign}` : ""}</p>
          </div>
          <div className="tnum shrink-0 text-right">
            <p className="text-[13.5px] font-medium text-ink">{money(b.revenue)}</p>
            {showCommission && <p className="text-[12px] text-up-ink">+{money(b.commissionAvoided)} kept</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function Ledger({ rows, total, showAllHref }: { rows: RecentBooking[]; total: number; showAllHref: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="data-table min-w-[820px]">
        <thead>
          <tr>
            <th>Booked</th><th>Stay</th><th>Guests</th><th>From</th><th>How they found you</th><th>Campaign</th>
            <th className="num">Revenue</th>
            <th className="num">Commission kept <Help text="What an OTA would have charged on this stay." /></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => (
            <tr key={b.id}>
              <td className="tnum whitespace-nowrap text-ink-2">{shortDate(b.bookedOn)}</td>
              <td className="whitespace-nowrap">{shortDate(b.checkIn)} → {shortDate(b.checkOut)} <span className="text-ink-3">· {nightsLabel(b.nights)}</span></td>
              <td className="tnum">{b.guests}</td>
              <td className="whitespace-nowrap">{b.market}, {b.region}</td>
              <td className="whitespace-nowrap">{b.channel}</td>
              <td className="max-w-[220px] truncate text-ink-2">{b.campaign ?? <span className="text-ink-3">—</span>}</td>
              <td className="num font-medium">{money(b.revenue)}</td>
              <td className="num text-up-ink">{money(b.commissionAvoided)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {total > rows.length && (
        <p className="mt-3 text-[12.5px] text-ink-3">Showing the {rows.length} most recent of {int(total)} direct bookings. <a href={showAllHref} className="underline underline-offset-2 hover:text-ink">Show all {int(total)}</a></p>
      )}
    </div>
  );
}

function CompactRankList({ rows }: { rows: { key: string | number; name: string; region?: string; stays: number; revenue: number; delta: number | null }[] }) {
  return (
    <ul className="divide-y divide-line">
      {rows.map((r) => (
        <li key={r.key} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-2.5 py-2.5 first:pt-0 last:pb-0">
          <span className="min-w-0 truncate text-[13.5px] text-ink">{r.name}{r.region ? <span className="text-ink-3">, {r.region}</span> : null}</span>
          <span className="tnum w-7 text-right text-[12.5px] text-ink-3">{int(r.stays)}</span>
          <span className="tnum w-[68px] text-right text-[13.5px] font-medium text-ink">{money(r.revenue)}</span>
          <span className="flex w-12 justify-end"><Delta value={r.delta} /></span>
        </li>
      ))}
    </ul>
  );
}

export function MarketsTable({ rows, full = false }: { rows: MarketRow[]; full?: boolean }) {
  const shown = full ? rows : rows.slice(0, 5);
  const max = Math.max(...rows.map((r) => r.revenue), 1);
  if (!full)
    return <CompactRankList rows={shown.map((m) => ({ key: m.id, name: m.name, region: m.region, stays: m.bookings, revenue: m.revenue, delta: change(m.revenue, m.prevRevenue) }))} />;
  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th>Market</th>
            <th className="num">Visitors <Help text="Website sessions from this market." /></th>
            <th className="num">Stays</th>
            <th className="num">Revenue</th>
            <th className="num">Share</th>
            <th className="num">vs prior</th>
            <th className="hidden w-[24%] pl-4 md:table-cell" aria-label="Revenue bar" />
          </tr>
        </thead>
        <tbody>
          {shown.map((m) => (
            <tr key={m.id}>
              <td className="whitespace-nowrap"><span className="text-ink">{m.name}</span><span className="text-ink-3">, {m.region}{m.country !== "US" ? ` (${m.country})` : ""}</span></td>
              <td className="num text-ink-2">{int(m.sessions)}</td>
              <td className="num">{int(m.bookings)}</td>
              <td className="num font-medium">{money(m.revenue)}</td>
              <td className="num text-ink-2">{pct(m.share)}</td>
              <td className="num"><Delta value={change(m.revenue, m.prevRevenue)} /></td>
              <td className="hidden pl-4 md:table-cell"><Bar value={m.revenue} max={max} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ChannelsTable({ rows, full = false }: { rows: ChannelRow[]; full?: boolean }) {
  const direct = rows.filter((c) => c.isWebsite);
  const ota = rows.filter((c) => !c.isWebsite);
  const max = Math.max(...rows.map((r) => r.bookings), 1);
  const shown = full ? direct : direct.filter((c) => c.bookings > 0).slice(0, 4);
  if (!full)
    return <CompactRankList rows={shown.map((c) => ({ key: c.id, name: c.name, stays: c.bookings, revenue: c.revenue, delta: change(c.bookings, c.prevBookings) }))} />;
  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th>Channel</th>
            <th className="num">Visits</th>
            <th className="num">Stays</th>
            <th className="num">Books <Help text="Share of visits that turned into a booking. Email and returning guests convert best; social is for reach." /></th>
            <th className="num">Revenue</th>
            <th className="num">Spend</th>
            <th className="num">vs prior</th>
            <th className="hidden w-[20%] pl-4 md:table-cell" aria-label="Bookings bar" />
          </tr>
        </thead>
        <tbody>
          {shown.map((c) => <ChannelRowView key={c.id} c={c} max={max} />)}
          {ota.length > 0 && (
            <>
              <tr><td colSpan={8} className="pt-4 text-[12px] text-ink-3">Not direct — shown so you can see the whole picture</td></tr>
              {ota.map((c) => <ChannelRowView key={c.id} c={c} max={max} muted />)}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ChannelRowView({ c, max, muted = false }: { c: ChannelRow; max: number; muted?: boolean }) {
  return (
    <tr className={muted ? "text-ink-2" : ""}>
      <td className="whitespace-nowrap">{c.name} {c.isPaid && <Tag>paid</Tag>}</td>
      <td className="num text-ink-2">{int(c.sessions)}</td>
      <td className="num">{int(c.bookings)}</td>
      <td className="num text-ink-2">{c.conversion === null ? "—" : `${c.conversion.toFixed(1)}%`}</td>
      <td className="num font-medium">{money(c.revenue)}</td>
      <td className="num text-ink-2">{c.spend > 0 ? money(c.spend) : "—"}</td>
      <td className="num"><Delta value={change(c.bookings, c.prevBookings)} /></td>
      <td className="hidden pl-4 md:table-cell"><Bar value={c.bookings} max={max} tone={muted ? "muted" : "ink"} /></td>
    </tr>
  );
}

export function CampaignsTable({ rows, full = false }: { rows: CampaignRow[]; full?: boolean }) {
  if (!rows.length) return <p className="text-[13.5px] text-ink-2">No campaigns ran in this period.</p>;
  return (
    <div className="overflow-x-auto">
      <table className={`data-table ${full ? "min-w-[720px]" : ""}`}>
        <thead>
          <tr>
            <th>Campaign</th>
            {full && <th>Runs</th>}
            <th className="num">Spent</th>
            {full && <th className="num">Seen <Help text="Ad impressions — how many times the ad was shown." /></th>}
            {full && <th className="num">Clicked</th>}
            <th className="num">Stays</th>
            <th className="num">Revenue</th>
            <th className="num">Return <Help text="Revenue for every $1 spent. 3× means three dollars back per dollar in. Awareness campaigns aim for reach, not a high return." /></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id}>
              <td><p className="text-ink">{c.name}</p><p className="text-[12px] text-ink-3">{c.channel} · {c.objective === "awareness" ? "awareness" : "bookings"}</p></td>
              {full && <td className="tnum whitespace-nowrap text-[12.5px] text-ink-2">{shortDate(c.startDate)} – {shortDate(c.endDate)}</td>}
              <td className="num">{c.spend > 0 ? money(c.spend) : "—"}</td>
              {full && <td className="num text-ink-2">{int(c.impressions)}</td>}
              {full && <td className="num text-ink-2">{int(c.clicks)}</td>}
              <td className="num">{int(c.bookings)}</td>
              <td className="num font-medium">{money(c.revenue)}</td>
              <td className="num">{c.roas === null ? <span className="text-ink-3">no spend</span> : <span className={c.roas >= 3 ? "text-up-ink" : c.roas < 1 ? "text-ink-2" : "text-ink"}>{c.roas.toFixed(1)}×</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FunnelView({ f, full = false }: { f: FunnelT; full?: boolean }) {
  const steps = [
    { label: "People saw an ad", value: f.impressions, help: "Ad impressions across paid search, social and metasearch." },
    { label: "Clicked through", value: f.clicks, help: "Clicks on those ads." },
    { label: "Visited your site", value: f.sessions, help: "All website visits, including people who came without an ad." },
    { label: "Booked direct", value: f.bookings, help: "Confirmed bookings on your own channels." },
  ];
  const max = Math.max(f.impressions, 1);
  return (
    <div>
      <ol className="space-y-3">
        {steps.map((s, i) => (
          <li key={s.label} className="grid grid-cols-[150px_1fr_90px] items-center gap-3 text-[13.5px]">
            <span className="flex items-center gap-1.5 text-ink-2">{s.label} <Help text={s.help} /></span>
            <div className="h-2 rounded-full bg-canvas"><div className={`h-2 rounded-full ${i === 3 ? "bg-accent" : "bg-ink"}`} style={{ width: `${Math.max(1.5, (Math.log10(Math.max(s.value, 1)) / Math.log10(max)) * 100)}%` }} /></div>
            <span className="tnum text-right font-medium text-ink">{int(s.value)}</span>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-[12px] text-ink-3">Bars use a log scale so each step stays visible.</p>
      {full && (
        <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-line pt-4 text-[13px] sm:grid-cols-4">
          <Metric label="Click-through rate" value={f.ctr === null ? "—" : `${f.ctr.toFixed(1)}%`} help="Clicks divided by impressions. Brand ads run high; discovery ads run low." />
          <Metric label="Site conversion" value={f.siteConversion === null ? "—" : `${f.siteConversion.toFixed(1)}%`} help="Visits that became a booking. Around 2–3% is healthy for an independent hotel." />
          <Metric label="Unique visitors" value={int(f.users)} help="Distinct people who visited, as opposed to total visits." />
          <Metric label="Pages per visit" value="—" help="Not carried in this database yet." />
        </dl>
      )}
    </div>
  );
}

function Metric({ label, value, help }: { label: string; value: string; help: string }) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-ink-2">{label} <Help text={help} /></dt>
      <dd className="tnum mt-0.5 text-[16px] font-medium text-ink">{value}</dd>
    </div>
  );
}

export function VisitorsTable({ rows }: { rows: MarketRow[] }) {
  const sorted = [...rows].sort((a, b) => b.sessions - a.sessions);
  const max = Math.max(...sorted.map((r) => r.sessions), 1);
  return (
    <table className="data-table">
      <thead><tr><th>City</th><th>Region</th><th>Country</th><th className="num">Visitors</th><th className="hidden w-[26%] pl-4 md:table-cell" aria-label="Visitor bar" /></tr></thead>
      <tbody>
        {sorted.map((m) => (
          <tr key={m.id}>
            <td>{m.name}</td>
            <td className="text-ink-2">{m.region}</td>
            <td className="text-ink-2">{m.country === "US" ? "United States" : m.country === "CA" ? "Canada" : m.country === "GB" ? "United Kingdom" : m.country}</td>
            <td className="num">{int(m.sessions)}</td>
            <td className="hidden pl-4 md:table-cell"><Bar value={m.sessions} max={max} tone="muted" /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
