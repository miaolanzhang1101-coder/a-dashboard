"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { readDecisions, STEER_COOKIE, type Decision } from "@/lib/decisions";

export type { Decision };

function write(current: Record<string, Decision>) {
  cookies().set(STEER_COOKIE, JSON.stringify(current), { path: "/", maxAge: 60 * 60 * 24 * 90, sameSite: "lax" });
  revalidatePath("/");
  revalidatePath("/source");
}

/**
 * Persist Approve / Not now without touching the database schema.
 * Swap for an insert into a `recommendation_decisions` table when ready.
 */
export async function decideRecommendation(id: string, decision: Decision) {
  const current = readDecisions();
  current[id] = decision;
  write(current);
}

export async function undoRecommendation(id: string) {
  const current = readDecisions();
  delete current[id];
  write(current);
}
