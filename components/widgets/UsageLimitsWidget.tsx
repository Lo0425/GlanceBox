"use client";

import { useEffect, useState } from "react";
import WidgetCard from "@/components/WidgetCard";
import { useAuth } from "@/components/AuthProvider";
import type { UsageLimitsData, UsageLimitWindow } from "@/lib/types";

type Severity = "good" | "amber" | "warn";

function severityFor(pct: number): Severity {
  if (pct >= 90) return "warn";
  if (pct >= 70) return "amber";
  return "good";
}

const SEVERITY: Record<Severity, { fill: string; track: string; text: string; glow: string; label: string }> = {
  good: {
    fill: "bg-good",
    track: "bg-good/15",
    text: "text-good",
    glow: "shadow-[0_0_14px_rgba(95,191,139,0.35)]",
    label: "Normal",
  },
  amber: {
    fill: "bg-amber",
    track: "bg-amber/15",
    text: "text-amber",
    glow: "shadow-glow-amber",
    label: "Elevated",
  },
  warn: {
    fill: "bg-warn",
    track: "bg-warn/15",
    text: "text-warn",
    glow: "shadow-[0_0_14px_rgba(224,104,90,0.4)]",
    label: "Near limit",
  },
};

function formatResetsAt(resetsAt: string | null, longRange: boolean): string {
  if (!resetsAt) return "—";
  const target = new Date(resetsAt).getTime();
  const diffMs = target - Date.now();
  if (diffMs <= 0) return "Resetting now";

  if (!longRange) {
    const totalMin = Math.round(diffMs / 60_000);
    const hours = Math.floor(totalMin / 60);
    const mins = totalMin % 60;
    if (hours > 0) return `Resets in ${hours} hr ${mins} min`;
    return `Resets in ${mins} min`;
  }

  const date = new Date(target);
  return `Resets ${date.toLocaleDateString(undefined, { weekday: "short" })} ${date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
}

function LimitMeter({
  label,
  window,
  longRange,
}: {
  label: string;
  window: UsageLimitWindow | null;
  longRange: boolean;
}) {
  if (!window) {
    return (
      <div>
        <div className="text-sm text-ink font-display mb-1.5">{label}</div>
        <div className="h-2 rounded-full bg-surfaceRaised" />
        <div className="mt-1 text-[11px] text-faint font-mono">no data</div>
      </div>
    );
  }

  const pct = Math.round(window.percent);
  const s = SEVERITY[severityFor(pct)];

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${s.fill} ${s.glow}`} />
          <span className="text-sm text-ink font-display">{label}</span>
        </div>
        <span className={`text-[10px] font-mono uppercase tracking-wider ${s.text}`}>{s.label}</span>
      </div>

      <div className="flex items-baseline gap-2 mb-1.5">
        <span className="text-3xl font-display font-bold text-ink leading-none">{pct}%</span>
        <span className="text-[11px] text-faint font-mono">{formatResetsAt(window.resetsAt, longRange)}</span>
      </div>

      <div className={`h-2 rounded-full ${s.track} overflow-hidden`}>
        <div className={`h-full rounded-full transition-all duration-500 ${s.fill}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function UsageLimitsWidget({ onRemove }: { onRemove?: () => void }) {
  const { getIdToken } = useAuth();
  const [data, setData] = useState<UsageLimitsData | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [syncKey, setSyncKey] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [copiedWhich, setCopiedWhich] = useState<"once" | "forever" | null>(null);
  const [platform, setPlatform] = useState<"windows" | "unix">("windows");

  useEffect(() => {
    if (typeof navigator !== "undefined" && !/Win/i.test(navigator.platform || navigator.userAgent)) {
      setPlatform("unix");
    }
  }, []);

  // Live data only ever exists on the machine where `claude` is logged in --
  // a Netlify-hosted instance has no local Claude Code session, so it can
  // never see `available: true` from /api/usage-limits directly. Whenever
  // that route DOES get a live reading, it mirrors it into Firestore (see
  // that route's mirrorToFirestore); this widget falls back to reading that
  // mirrored snapshot via /api/user-data so a deployed instance still shows
  // (slightly stale) real numbers instead of just "unavailable".
  async function loadOnce(): Promise<UsageLimitsData> {
    const token = await getIdToken();
    const authHeader: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await fetch("/api/usage-limits", { headers: authHeader });
      const json: UsageLimitsData = await res.json();
      if (json.available) return json;

      try {
        const mirrorRes = await fetch("/api/user-data?key=claudeUsage", { headers: authHeader });
        const mirrorJson = await mirrorRes.json();
        const mirrored: UsageLimitsData | null = mirrorJson.value ?? null;
        if (mirrored?.available && mirrored.asOf) {
          const minutes = Math.round((Date.now() - new Date(mirrored.asOf).getTime()) / 60_000);
          const ageLabel = minutes <= 0 ? "under a minute ago" : `${minutes} min ago`;
          return {
            ...mirrored,
            stale: true,
            note: `Synced from your local machine ${ageLabel}. ${json.note ?? ""}`.trim(),
          };
        }
      } catch {
        // fall through to the original (unavailable) response
      }

      return json;
    } catch {
      return { available: false, fiveHour: null, sevenDay: null, note: "Couldn't reach the usage-limits API." };
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const json = await loadOnce();
      if (!cancelled) {
        setData(json);
        setLastFetched(new Date());
      }
    }
    load();
    const id = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleManualRefresh() {
    setRefreshing(true);
    const json = await loadOnce();
    setData(json);
    setLastFetched(new Date());
    setRefreshing(false);
  }

  // Generates a hashed, revocable sync key so a local script (see
  // public/sync-claude-usage.mjs) can push usage numbers into this account
  // without ever handing GlanceBox the user's actual Claude credentials.
  async function handleGenerateSyncKey() {
    setGeneratingKey(true);
    setSyncError(null);
    try {
      const token = await getIdToken();
      const res = await fetch("/api/sync-key", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setSyncKey(json.key);
    } catch {
      setSyncError("Couldn't generate a sync key. Please try again.");
    } finally {
      setGeneratingKey(false);
    }
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const syncCommand = syncKey
    ? `curl -O ${origin}/sync-claude-usage.mjs && GLANCEBOX_SYNC_KEY=${syncKey} node sync-claude-usage.mjs`
    : "";

  // "Run forever" commands set up the same thing this project's own machine
  // uses: a recurring task (Task Scheduler / cron) that re-runs the sync
  // script every 15 minutes indefinitely, with no terminal left open.
  const foreverCommandWindows = syncKey
    ? [
        `$key = "${syncKey}"`,
        `$dir = "$env:USERPROFILE\\GlanceBoxSync"`,
        `New-Item -ItemType Directory -Force -Path $dir | Out-Null`,
        `Invoke-WebRequest -Uri "${origin}/sync-claude-usage.mjs" -OutFile "$dir\\sync-claude-usage.mjs"`,
        `$action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c set GLANCEBOX_SYNC_KEY=$key&& node \`"$dir\\sync-claude-usage.mjs\`" >> \`"$dir\\sync-log.txt\`" 2>&1"`,
        `$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 15) -RepetitionDuration (New-TimeSpan -Days 3650)`,
        `Register-ScheduledTask -TaskName "GlanceBoxClaudeUsageSync" -Action $action -Trigger $trigger -Force`,
      ].join("\n")
    : "";

  const foreverCommandUnix = syncKey
    ? `mkdir -p ~/glancebox-sync && curl -s -o ~/glancebox-sync/sync-claude-usage.mjs ${origin}/sync-claude-usage.mjs && (crontab -l 2>/dev/null; echo "*/15 * * * * GLANCEBOX_SYNC_KEY=${syncKey} node ~/glancebox-sync/sync-claude-usage.mjs >> ~/glancebox-sync/sync-log.txt 2>&1") | crontab -`
    : "";

  const foreverCommand = platform === "windows" ? foreverCommandWindows : foreverCommandUnix;

  function copyToClipboard(text: string, which: "once" | "forever") {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedWhich(which);
      setTimeout(() => setCopiedWhich(null), 1500);
    });
  }

  return (
    <WidgetCard eyebrow="Claude Code session" title="Your usage limits" onRemove={onRemove}>
      <div className="h-full flex flex-col gap-5">
        {!data && <div className="text-sm text-faint font-mono">Loading…</div>}

        {data && !data.available && <div className="text-[12px] text-faint font-mono leading-snug">{data.note}</div>}

        {data?.available && (
          <>
            <LimitMeter label="Current session" window={data.fiveHour} longRange={false} />
            <LimitMeter label="Weekly limit" window={data.sevenDay} longRange={true} />
          </>
        )}

        <div className="mt-auto flex items-center justify-between">
          <span className="text-[10px] text-faint font-mono">
            {data?.stale && data.asOf
              ? `As of ${new Date(data.asOf).toLocaleTimeString()} (cached)`
              : lastFetched
                ? `Updated ${lastFetched.toLocaleTimeString()}`
                : ""}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSyncOpen((v) => !v)}
              className="text-[10px] font-mono text-faint hover:text-cyan transition-colors"
            >
              {syncOpen ? "Hide sync" : "Sync from another device"}
            </button>
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="text-[10px] font-mono text-faint hover:text-cyan transition-colors disabled:opacity-40"
            >
              {refreshing ? "Refreshing…" : "↻ Refresh"}
            </button>
          </div>
        </div>

        {syncOpen && (
          <div className="rounded-lg border border-hairline bg-surfaceRaised/40 p-3 text-[11px] font-mono leading-snug">
            {!syncKey && (
              <>
                <p className="text-faint mb-2">
                  Run a small local script on any machine to sync its Claude Code usage into this account. Your
                  Claude credentials never leave that machine — only the usage numbers are sent.
                </p>
                <button
                  onClick={handleGenerateSyncKey}
                  disabled={generatingKey}
                  className="text-cyan hover:text-cyan/80 transition-colors disabled:opacity-40"
                >
                  {generatingKey ? "Generating…" : "Generate sync key →"}
                </button>
                {syncError && <p className="mt-2 text-warn">{syncError}</p>}
              </>
            )}
            {syncKey && (
              <>
                <p className="text-warn mb-2">
                  Save this now — it won&apos;t be shown again. Generating a new key retires this one.
                </p>
                <div className="flex items-center gap-2 mb-3">
                  <code className="flex-1 min-w-0 truncate rounded bg-base px-2 py-1 text-ink">{syncKey}</code>
                </div>

                <div className="flex items-center gap-2 mb-1.5">
                  <button
                    onClick={() => setPlatform("windows")}
                    className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider transition-colors ${
                      platform === "windows" ? "bg-cyan/15 text-cyan" : "text-faint hover:text-ink"
                    }`}
                  >
                    Windows
                  </button>
                  <button
                    onClick={() => setPlatform("unix")}
                    className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider transition-colors ${
                      platform === "unix" ? "bg-cyan/15 text-cyan" : "text-faint hover:text-ink"
                    }`}
                  >
                    macOS / Linux
                  </button>
                </div>
                <p className="text-faint mb-1">
                  Run once on the machine where Claude Code is logged in — sets up a recurring{" "}
                  {platform === "windows" ? "Task Scheduler job" : "cron job"} that keeps syncing every 15 min,
                  forever, with no terminal left open:
                </p>
                <div className="flex items-start gap-2 mb-3">
                  <pre className="flex-1 min-w-0 whitespace-pre-wrap break-all rounded bg-base px-2 py-1 text-ink">
                    {foreverCommand}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(foreverCommand, "forever")}
                    className="shrink-0 text-cyan hover:text-cyan/80 transition-colors"
                  >
                    {copiedWhich === "forever" ? "Copied ✓" : "Copy"}
                  </button>
                </div>

                <p className="text-faint mb-1">Or just sync once, manually, whenever you want a fresh reading:</p>
                <div className="flex items-start gap-2">
                  <code className="flex-1 min-w-0 break-all rounded bg-base px-2 py-1 text-ink">{syncCommand}</code>
                  <button
                    onClick={() => copyToClipboard(syncCommand, "once")}
                    className="shrink-0 text-cyan hover:text-cyan/80 transition-colors"
                  >
                    {copiedWhich === "once" ? "Copied ✓" : "Copy"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </WidgetCard>
  );
}
