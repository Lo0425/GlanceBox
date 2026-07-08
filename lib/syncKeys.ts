import crypto from "crypto";
import { getAdminDb } from "@/lib/firebaseAdmin";

// Sync keys let a local script push data (currently just Claude usage
// numbers) into a user's account without ever handing that script a Firebase
// ID token or, more importantly, without GlanceBox ever storing the user's
// actual Anthropic credentials. Only a hash of the key is stored -- like a
// GitHub personal access token -- since we only ever need to verify a
// presented key, never recover the original value.
const COLLECTION = "syncKeys";

function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export async function createSyncKey(uid: string): Promise<string> {
  const db = getAdminDb();

  // Only one live key per user -- generating a new one invalidates the old.
  const existing = await db.collection(COLLECTION).where("uid", "==", uid).get();
  await Promise.all(existing.docs.map((doc) => doc.ref.delete()));

  const key = `gbx_${crypto.randomBytes(24).toString("base64url")}`;
  await db.collection(COLLECTION).doc(hashKey(key)).set({ uid, createdAt: new Date().toISOString() });
  return key;
}

export async function resolveSyncKey(key: string): Promise<string | null> {
  const snap = await getAdminDb().collection(COLLECTION).doc(hashKey(key)).get();
  const data = snap.data();
  return data?.uid ?? null;
}
