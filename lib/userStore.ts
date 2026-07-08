import { getAdminDb } from "@/lib/firebaseAdmin";

// Each user's widget data lives at users/{uid}/data/{key}, one Firestore
// document per key -- wrapped in { value } since Firestore document data
// must be a map, not a bare array/scalar (several stored values, like
// `layout`, are arrays).
export async function getUserValue(userId: string, key: string): Promise<unknown> {
  const snap = await getAdminDb().collection("users").doc(userId).collection("data").doc(key).get();
  const data = snap.data();
  return data?.value ?? null;
}

export async function setUserValue(userId: string, key: string, value: unknown): Promise<void> {
  await getAdminDb().collection("users").doc(userId).collection("data").doc(key).set({ value });
}
