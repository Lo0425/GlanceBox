import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebaseAdmin";
import { getUserValue, setUserValue } from "@/lib/userStore";

export const dynamic = "force-dynamic";

// Fixed allowlist -- keys come from request input, so this prevents writing
// to arbitrary storage paths.
const ALLOWED_KEYS = new Set([
  "layout",
  "defaultLayout",
  "todos",
  "notes",
  "events",
  "pet",
  "trips",
  "assignments",
  "claudeUsage",
]);

async function requireUserId(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const userId = await requireUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const key = req.nextUrl.searchParams.get("key");
  if (!key || !ALLOWED_KEYS.has(key)) {
    return NextResponse.json({ error: "invalid key" }, { status: 400 });
  }

  const value = await getUserValue(userId, key);
  return NextResponse.json({ value });
}

export async function PUT(req: NextRequest) {
  const userId = await requireUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { key?: string; value?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const { key, value } = body;
  if (!key || !ALLOWED_KEYS.has(key)) {
    return NextResponse.json({ error: "invalid key" }, { status: 400 });
  }

  await setUserValue(userId, key, value);
  return NextResponse.json({ ok: true });
}
