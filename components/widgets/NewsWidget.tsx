"use client";

import { useEffect, useState } from "react";
import WidgetCard from "@/components/WidgetCard";
import { getCached, setCached } from "@/lib/clientCache";
import type { NewsData } from "@/lib/types";

const CACHE_KEY = "news";

export default function NewsWidget({ onRemove }: { onRemove?: () => void }) {
  // Seeded from the last fetch so a remount (e.g. DashboardGrid swapping
  // layouts at a responsive breakpoint) repaints instantly instead of
  // flashing back to "Loading..." while it refetches.
  const [data, setData] = useState<NewsData | null>(() => getCached(CACHE_KEY) ?? null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/news");
        const json: NewsData = await res.json();
        if (!cancelled) {
          setData(json);
          setCached(CACHE_KEY, json);
        }
      } catch {
        if (!cancelled) setData({ available: false, items: [], note: "Couldn't load headlines." });
      }
    }
    load();
    const id = setInterval(load, 10 * 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <WidgetCard eyebrow="Tech · Hacker News" title="Headlines" onRemove={onRemove}>
      <div className="h-full flex flex-col gap-2 overflow-y-auto">
        {!data && <div className="text-sm text-faint font-mono">Loading…</div>}
        {data && !data.available && (
          <div className="text-sm text-warn font-mono">{data.note}</div>
        )}
        {data?.items.map((item, idx) => (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-2.5 rounded-lg px-3 py-2 hover:bg-surfaceRaised transition-colors"
          >
            <span className="text-xs text-faint font-mono shrink-0 pt-0.5">{idx + 1}.</span>
            <div className="min-w-0">
              <div className="text-sm text-ink leading-snug">{item.title}</div>
              <div className="text-[11px] text-faint font-mono">{item.score} pts</div>
            </div>
          </a>
        ))}
      </div>
    </WidgetCard>
  );
}
