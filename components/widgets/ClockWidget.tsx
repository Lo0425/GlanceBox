"use client";

import { useEffect, useState } from "react";
import WidgetCard from "@/components/WidgetCard";

export default function ClockWidget({ onRemove }: { onRemove?: () => void }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hh = now ? String(now.getHours()).padStart(2, "0") : "--";
  const mm = now ? String(now.getMinutes()).padStart(2, "0") : "--";
  const ss = now ? String(now.getSeconds()).padStart(2, "0") : "--";
  const tz = now
    ? Intl.DateTimeFormat().resolvedOptions().timeZone.split("/").pop()?.replace("_", " ")
    : "";

  return (
    <WidgetCard eyebrow="Local time" title="Clock" onRemove={onRemove}>
      <div className="h-full flex flex-col justify-center items-start gap-2">
        <div className="font-mono font-bold text-ink leading-none tabular-nums text-[clamp(2rem,6vw,4.2rem)] drop-shadow-[0_0_20px_rgba(79,224,214,0.15)]">
          {hh}
          <span className="text-cyan">:</span>
          {mm}
          <span className="text-faint text-[0.55em] align-top ml-1">{ss}</span>
        </div>
        <div className="text-xs text-muted font-mono uppercase tracking-wider">{tz}</div>
      </div>
    </WidgetCard>
  );
}
