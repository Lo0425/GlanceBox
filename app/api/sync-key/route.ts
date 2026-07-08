import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebaseAdmin";
import { createSyncKey } from "@/lib/syncKeys";

export const dynamic = "force-dynamic";

// Issues a sync key for the signed-in user, for use with the standalone
// local sync script (see public/sync-claude-usage.mjs) and
// /api/sync-claude-usage. Requires a normal Firebase ID token, same as
// /api/user-data -- this route is reached from inside the dashboard, not by
// the local script itself.
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    const key = await createSyncKey(decoded.uid);
    return NextResponse.json({ key });
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
}
