"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.58-5.17 3.58-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.61H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.39l4-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.34.61 4.58 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.61l4 3.11C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}

export default function LoginScreen() {
  const { signInWithGoogle } = useAuth();
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    setError(null);
    try {
      await signInWithGoogle();
    } catch (e) {
      const code = e && typeof e === "object" && "code" in e ? String((e as { code: unknown }).code) : null;
      setError(code ? `Sign-in failed: ${code}` : "Sign-in failed. Please try again.");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm relative rounded-2xl border border-hairline bg-surface/90 backdrop-blur-sm p-8 shadow-glow-cyan text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-cyan animate-pulse-glow" />
          </span>
          <div className="text-[11px] tracking-[0.2em] uppercase text-faint font-mono">GlanceBox // locked</div>
        </div>
        <h1 className="text-2xl font-display font-bold bg-gradient-to-r from-ink via-ink to-cyan/80 bg-clip-text text-transparent mb-1">
          GlanceBox
        </h1>
        <p className="text-sm text-faint mb-6">Sign in to access your dashboard.</p>
        <button
          onClick={handleSignIn}
          className="w-full flex items-center justify-center gap-3 rounded-lg border border-hairline bg-surfaceRaised px-4 py-2.5 text-sm font-medium text-ink hover:border-cyan/50 hover:shadow-glow-cyan transition-all duration-200"
        >
          <GoogleIcon />
          Sign in with Google
        </button>
        {error && <p className="mt-3 text-xs text-warn font-mono">{error}</p>}
      </div>
    </main>
  );
}
