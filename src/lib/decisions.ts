import { cookies } from "next/headers";

export type Decision = "approved" | "dismissed";
export const STEER_COOKIE = "autumn_steer";

/** Read Approve / Not now decisions stored in the cookie (server only). */
export function readDecisions(): Record<string, Decision> {
  try {
    const raw = cookies().get(STEER_COOKIE)?.value;
    return raw ? (JSON.parse(raw) as Record<string, Decision>) : {};
  } catch {
    return {};
  }
}
