"use client";

import { useEffect, useState } from "react";
import WidgetCard from "@/components/WidgetCard";
import type { SystemStats } from "@/lib/types";

function barColor(pct: number): string {
  if (pct >= 90) return "bg-warn";
  if (pct >= 70) return "bg-amber";
  return "bg-good";
}

function StatBar({ label, pct, detail }: { label: string; pct: number | null; detail: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-sm text-ink">{label}</span>
        <span className="text-xs text-faint font-mono">{detail}</span>
      </div>
      <div className="h-1.5 rounded-full bg-surfaceRaised overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${pct === null ? "bg-surfaceRaised" : barColor(pct)}`}
          style={{ width: `${pct ?? 0}%` }}
        />
      </div>
    </div>
  );
}

export default function SystemWidget({ onRemove }: { onRemove?: () => void }) {
  const [data, setData] = useState<SystemStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/system");
        const json: SystemStats = await res.json();
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) {
          setData({
            cpuPercent: null,
            ramPercent: null,
            ramUsedGB: null,
            ramTotalGB: null,
            netKBps: null,
            netAvailable: false,
            note: "Couldn't reach the system stats API.",
          });
        }
      }
    }
    load();
    const id = setInterval(load, 100);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <WidgetCard eyebrow="Live" title="System monitor" onRemove={onRemove}>
      <div className="h-full flex flex-col gap-3 justify-center">
        <StatBar
          label="CPU"
          pct={data?.cpuPercent ?? null}
          detail={data?.cpuPercent != null ? `${Math.round(data.cpuPercent)}%` : "—"}
        />
        <StatBar
          label="RAM"
          pct={data?.ramPercent ?? null}
          detail={
            data?.ramPercent != null
              ? `${data.ramUsedGB!.toFixed(1)} / ${data.ramTotalGB!.toFixed(1)} GB`
              : "—"
          }
        />
        <div>
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-sm text-ink">Network</span>
            <span className="text-xs text-faint font-mono">
              {data?.netAvailable && data?.netKBps != null
                ? data.netKBps >= 1024
                  ? `${(data.netKBps / 1024).toFixed(1)} MB/s`
                  : `${data.netKBps.toFixed(0)} KB/s`
                : "—"}
            </span>
          </div>
          {!data?.netAvailable && data?.note && (
            <div className="text-[11px] text-faint font-mono leading-snug">{data.note}</div>
          )}
        </div>
      </div>
    </WidgetCard>
  );
}
