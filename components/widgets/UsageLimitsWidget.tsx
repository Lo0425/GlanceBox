"use client";

import { useEffect, useState } from "react";
import WidgetCard from "@/components/WidgetCard";
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
  const [data, setData] = useState<UsageLimitsData | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/usage-limits");
        const json: UsageLimitsData = await res.json();
        if (!cancelled) {
          setData(json);
          setLastFetched(new Date());
        }
      } catch {
        if (!cancelled) {
          setData({ available: false, fiveHour: null, sevenDay: null, note: "Couldn't reach the usage-limits API." });
        }
      }
    }
    load();
    const id = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  async function handleManualRefresh() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/usage-limits");
      const json: UsageLimitsData = await res.json();
      setData(json);
      setLastFetched(new Date());
    } catch {
      setData({ available: false, fiveHour: null, sevenDay: null, note: "Couldn't reach the usage-limits API." });
    } finally {
      setRefreshing(false);
    }
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
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="text-[10px] font-mono text-faint hover:text-cyan transition-colors disabled:opacity-40"
          >
            {refreshing ? "Refreshing…" : "↻ Refresh"}
          </button>
        </div>
      </div>
    </WidgetCard>
  );
}
