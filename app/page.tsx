"use client";

import { useAuth } from "@/components/AuthProvider";
import DashboardGrid from "@/components/DashboardGrid";
import LoginScreen from "@/components/LoginScreen";

export default function Home() {
  const { status } = useAuth();

  if (status === "loading") {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-faint font-mono">Loading…</div>
      </main>
    );
  }

  if (status === "unauthenticated") {
    return <LoginScreen />;
  }

  return (
    <main className="min-h-screen px-6 py-8 md:px-10 md:py-10 max-w-[1600px] mx-auto">
      <DashboardGrid />
    </main>
  );
}
