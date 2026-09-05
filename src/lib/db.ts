import postgres from "postgres";

declare global {
  // eslint-disable-next-line no-var
  var __autumnSql: ReturnType<typeof postgres> | undefined;
}

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env and point it at your Postgres database.");

// Reuse one client across hot reloads in dev. Dates and numerics come back as
// plain strings/numbers so server components can serialize them safely.
export const sql =
  globalThis.__autumnSql ??
  postgres(url, {
    ssl: url.includes("localhost") || url.includes("127.0.0.1") ? false : "require",
    max: 5,
    idle_timeout: 20,
    prepare: false,
    types: {
      date: { to: 1082, from: [1082], serialize: (v: string) => v, parse: (v: string) => v },
      numeric: { to: 1700, from: [1700], serialize: (v: number) => String(v), parse: (v: string) => Number(v) },
      bigint: { to: 20, from: [20], serialize: (v: number) => String(v), parse: (v: string) => Number(v) },
    },
  });
if (process.env.NODE_ENV !== "production") globalThis.__autumnSql = sql;
