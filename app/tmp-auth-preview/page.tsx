"use client";

import { useEffect, useState } from "react";
import { signInWithCustomToken } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebaseClient";
import DashboardGrid from "@/components/DashboardGrid";

export default function TmpAuthPreview() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) return;
    signInWithCustomToken(getFirebaseAuth(), token)
      .then(() => setReady(true))
      .catch((err) => console.error("SIGNIN ERROR", err));
  }, []);

  if (!ready) return <div className="text-ink p-10">Signing in…</div>;

  return (
    <main className="min-h-screen px-6 py-8 md:px-10 md:py-10 max-w-[1600px] mx-auto">
      <DashboardGrid />
    </main>
  );
}
