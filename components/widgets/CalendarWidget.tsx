"use client";

import { useState } from "react";
import WidgetCard from "@/components/WidgetCard";
import { useUserStorage } from "@/components/useUserStorage";
import type { EventItem } from "@/lib/types";

const LEGACY_STORAGE_KEY = "console-dashboard-events-v1";

function formatWhen(at: number): string {
  const d = new Date(at);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();

  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (sameDay) return `Today · ${time}`;
  if (isTomorrow) return `Tomorrow · ${time}`;
  return `${d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} · ${time}`;
}

export default function CalendarWidget({ onRemove }: { onRemove?: () => void }) {
  const [events, setEvents] = useUserStorage<EventItem[]>("events", [], LEGACY_STORAGE_KEY);
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState("");

  function addEvent() {
    const text = title.trim();
    if (!text || !when) return;
    const at = new Date(when).getTime();
    if (Number.isNaN(at)) return;
    setEvents((prev) => [...(prev ?? []), { id: crypto.randomUUID(), title: text, at }]);
    setTitle("");
    setWhen("");
  }

  function remove(id: string) {
    setEvents((prev) => prev?.filter((e) => e.id !== id) ?? prev);
  }

  const now = Date.now();
  const upcoming = events?.filter((e) => e.at >= now).sort((a, b) => a.at - b.at) ?? null;

  return (
    <WidgetCard eyebrow="Upcoming" title="Calendar" onRemove={onRemove}>
      <div className="h-full flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Meeting, deadline…"
            className="bg-surfaceRaised border border-hairline rounded-lg px-3 py-2 text-sm text-ink placeholder:text-faint outline-none focus:border-cyan/60 transition-colors"
          />
          <div className="flex gap-2">
            <input
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              className="flex-1 min-w-0 bg-surfaceRaised border border-hairline rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-cyan/60 transition-colors"
            />
            <button
              onClick={addEvent}
              className="text-xs font-mono text-muted hover:text-cyan border border-hairline hover:border-cyan/50 rounded-lg px-3 py-2 transition-all duration-200 hover:shadow-glow-cyan shrink-0"
            >
              Add
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1.5 pt-1">
          {upcoming?.length === 0 && (
            <div className="text-sm text-faint font-mono py-2">No upcoming events.</div>
          )}
          {upcoming?.map((e) => (
            <div
              key={e.id}
              className="group flex items-center gap-2.5 rounded-lg px-3 py-2 hover:bg-surfaceRaised"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-ink truncate">{e.title}</div>
                <div className="text-[11px] text-faint font-mono">{formatWhen(e.at)}</div>
              </div>
              <button
                onClick={() => remove(e.id)}
                className="text-faint hover:text-warn opacity-0 group-hover:opacity-100 transition-opacity text-xs shrink-0"
                aria-label="Delete"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>
    </WidgetCard>
  );
}
