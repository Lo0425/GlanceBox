import { NextRequest, NextResponse } from "next/server";
import { resolveSyncKey } from "@/lib/syncKeys";
import { setUserValue } from "@/lib/userStore";
import type { UsageLimitsData, UsageLimitWindow } from "@/lib/types";

export const dynamic = "force-dynamic";

// Deliberately narrow and separate from /api/user-data: a sync key can only
// ever write the "claudeUsage" value through this one route, nothing else.
// If a key ever leaked, the worst case is someone spoofing fake usage
// numbers on that account -- not touching todos, notes, layout, etc.
function isWindow(v: unknown): v is UsageLimitWindow {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as UsageLimitWindow).percent === "number" &&
    (typeof (v as UsageLimitWindow).resetsAt === "string" || (v as UsageLimitWindow).resetsAt === null)
  );
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const key = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!key) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const uid = await resolveSyncKey(key);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { fiveHour?: unknown; sevenDay?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const data: UsageLimitsData = {
    available: true,
    fiveHour: isWindow(body.fiveHour) ? body.fiveHour : null,
    sevenDay: isWindow(body.sevenDay) ? body.sevenDay : null,
    asOf: new Date().toISOString(),
  };

  await setUserValue(uid, "claudeUsage", data);
  return NextResponse.json({ ok: true });
}
