"use client";

import { useEffect, useState } from "react";
import WidgetCard from "@/components/WidgetCard";

export default function DateWidget({ onRemove }: { onRemove?: () => void }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const weekday = now?.toLocaleDateString(undefined, { weekday: "long" });
  const monthDay = now?.toLocaleDateString(undefined, { month: "long", day: "numeric" });
  const year = now?.getFullYear();

  const startOfYear = now ? new Date(now.getFullYear(), 0, 1) : null;
  const dayOfYear =
    now && startOfYear
      ? Math.ceil((now.getTime() - startOfYear.getTime()) / 86_400_000)
      : 0;
  const totalDays = now && now.getFullYear() % 4 === 0 ? 366 : 365;
  const pct = Math.min(100, Math.round((dayOfYear / totalDays) * 100));

  return (
    <WidgetCard eyebrow={year ? String(year) : ""} title="Date" onRemove={onRemove}>
      <div className="h-full flex flex-col justify-center gap-3">
        <div>
          <div className="text-xs text-amber font-mono uppercase tracking-wider">
            {weekday}
          </div>
          <div className="text-2xl font-display font-medium text-ink">{monthDay}</div>
        </div>
        <div>
          <div className="h-1.5 rounded-full bg-surfaceRaised overflow-hidden">
            <div
              className="h-full bg-amber rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-1.5 text-xs text-ink/70 font-mono">
            Day {dayOfYear} of {totalDays} &middot; {pct}% through the year
          </div>
        </div>
      </div>
    </WidgetCard>
  );
}
