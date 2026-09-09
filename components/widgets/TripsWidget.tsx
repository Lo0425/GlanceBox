"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import WidgetCard from "@/components/WidgetCard";
import { useUserStorage } from "@/components/useUserStorage";
import type { TripItem, FlightLeg, AssignmentItem } from "@/lib/types";

type Tab = "trips" | "assignments";

function todayMidnight(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysUntil(dateStr: string): number {
  const target = new Date(`${dateStr}T00:00:00`);
  return Math.round((target.getTime() - todayMidnight().getTime()) / 86_400_000);
}

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatTime(timeStr?: string): string {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function formatLeg(dateStr: string, departTime?: string, arriveTime?: string): string {
  let s = formatDate(dateStr);
  if (departTime) s += ` · ${formatTime(departTime)}`;
  if (arriveTime) s += ` → ${formatTime(arriveTime)}`;
  return s;
}

// Defends against trips saved under the previous (single outbound/return
// leg) data shape, which had no `legs` array -- treats them as empty-leg
// trips instead of crashing, rather than attempting a lossy reconstruction.
function normalizeTrip(raw: TripItem): TripItem {
  return Array.isArray(raw.legs) ? raw : { id: raw.id, name: raw.name ?? "Trip", legs: [] };
}

function tripDateRange(trip: TripItem): { start: string | null; end: string | null } {
  if (trip.legs.length === 0) return { start: null, end: null };
  const dates = [...trip.legs.map((l) => l.date)].sort();
  return { start: dates[0], end: dates[dates.length - 1] };
}

function Tabs({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  return (
    <div className="flex gap-1 mb-3 shrink-0">
      {(["trips", "assignments"] as Tab[]).map((t) => (
        <button
          key={t}
          onClick={() => setTab(t)}
          className={`flex-1 text-xs font-mono uppercase tracking-wider py-1.5 rounded-lg border transition-all duration-200 ${
            tab === t
              ? "border-cyan/50 text-cyan bg-surfaceRaised shadow-glow-cyan"
              : "border-hairline text-faint hover:text-ink"
          }`}
        >
          {t === "trips" ? "Trips" : "Assignments"}
        </button>
      ))}
    </div>
  );
}

const inputClass =
  "bg-surfaceRaised border border-hairline rounded-lg px-3 py-2 text-sm text-ink placeholder:text-faint outline-none focus:border-cyan/60 transition-colors";
const smallInputClass =
  "bg-surfaceRaised border border-hairline rounded-lg px-2 py-1.5 text-xs text-ink placeholder:text-faint outline-none focus:border-cyan/60 transition-colors";
const addButtonClass =
  "text-xs font-mono text-muted hover:text-cyan border border-hairline hover:border-cyan/50 rounded-lg px-3 py-2 transition-all duration-200 hover:shadow-glow-cyan shrink-0";
const rowClass = "group flex items-center gap-2.5 rounded-lg px-3 py-2 hover:bg-surfaceRaised";
const deleteButtonClass =
  "text-faint hover:text-warn opacity-0 group-hover:opacity-100 transition-opacity text-xs shrink-0";

function AddLegForm({ onAdd }: { onAdd: (leg: Omit<FlightLeg, "id">) => void }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState("");
  const [departTime, setDepartTime] = useState("");
  const [arriveTime, setArriveTime] = useState("");

  function submit() {
    if (!from.trim() || !to.trim() || !date) return;
    onAdd({ from: from.trim(), to: to.trim(), date, departTime: departTime || undefined, arriveTime: arriveTime || undefined });
    setFrom("");
    setTo("");
    setDate("");
    setDepartTime("");
    setArriveTime("");
  }

  return (
    <div className="flex flex-col gap-1.5 pl-6 pr-3 pt-1">
      <div className="flex gap-1.5">
        <input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="From" className={`flex-1 min-w-0 ${smallInputClass}`} />
        <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="To" className={`flex-1 min-w-0 ${smallInputClass}`} />
      </div>
      {/* flex-wrap + a real min-width per input -- a native date/time control
          needs room to render its own text without clipping, so cramming all
          three plus the Add button onto one row (as min-w-0 previously
          allowed) squeezed them below that and cut off their contents on
          narrow screens. Wrapping to a second line beats that. */}
      <div className="flex flex-wrap gap-1.5">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={`flex-1 min-w-[132px] ${smallInputClass}`}
        />
        <input
          type="time"
          value={departTime}
          onChange={(e) => setDepartTime(e.target.value)}
          title="Departure time"
          className={`flex-1 min-w-[104px] ${smallInputClass}`}
        />
        <input
          type="time"
          value={arriveTime}
          onChange={(e) => setArriveTime(e.target.value)}
          title="Arrival time"
          className={`flex-1 min-w-[104px] ${smallInputClass}`}
        />
        <button onClick={submit} className={`${addButtonClass} flex-1`}>
          Add
        </button>
      </div>
    </div>
  );
}

function TripsTab({
  trips,
  setTrips,
}: {
  trips: TripItem[];
  setTrips: Dispatch<SetStateAction<TripItem[] | null>>;
}) {
  const [name, setName] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function createTrip() {
    const label = name.trim();
    if (!label) return;
    const id = crypto.randomUUID();
    setTrips((prev) => [...(prev ?? []), { id, name: label, legs: [] }]);
    setName("");
    setExpandedId(id);
  }

  function removeTrip(id: string) {
    setTrips((prev) => (prev ?? []).filter((t) => t.id !== id));
    setExpandedId((cur) => (cur === id ? null : cur));
  }

  function addLeg(tripId: string, leg: Omit<FlightLeg, "id">) {
    setTrips((prev) =>
      (prev ?? []).map((t) => (t.id === tripId ? { ...t, legs: [...t.legs, { id: crypto.randomUUID(), ...leg }] } : t))
    );
  }

  function removeLeg(tripId: string, legId: string) {
    setTrips((prev) =>
      (prev ?? []).map((t) => (t.id === tripId ? { ...t, legs: t.legs.filter((l) => l.id !== legId) } : t))
    );
  }

  const upcoming = trips
    .filter((t) => {
      const { end } = tripDateRange(t);
      return end === null || daysUntil(end) >= 0;
    })
    .sort((a, b) => {
      const aStart = tripDateRange(a).start ?? "9999-99-99";
      const bStart = tripDateRange(b).start ?? "9999-99-99";
      return aStart.localeCompare(bStart);
    });

  return (
    <div className="h-full flex flex-col gap-3">
      <div className="flex gap-2 shrink-0">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") createTrip();
          }}
          placeholder="New trip name…"
          className={`flex-1 min-w-0 ${inputClass}`}
        />
        <button onClick={createTrip} className={addButtonClass}>
          + Trip
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1.5 pt-1">
        {upcoming.length === 0 && <div className="text-sm text-faint font-mono py-2">No upcoming trips.</div>}
        {upcoming.map((t) => {
          const { start, end } = tripDateRange(t);
          const startIn = start ? daysUntil(start) : null;
          const label = start === null ? "Empty" : startIn! > 0 ? `In ${startIn}d` : "Ongoing";
          const expanded = expandedId === t.id;
          const sortedLegs = [...t.legs].sort((a, b) => a.date.localeCompare(b.date));

          return (
            <div key={t.id} className="rounded-lg">
              <div className={`${rowClass} cursor-pointer`} onClick={() => setExpandedId(expanded ? null : t.id)}>
                <span className={`text-faint transition-transform ${expanded ? "rotate-90" : ""}`}>›</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-ink truncate">{t.name}</div>
                  <div className="text-[11px] text-faint font-mono">
                    {start && end
                      ? `${formatDate(start)} – ${formatDate(end)} · ${t.legs.length} flight${t.legs.length === 1 ? "" : "s"}`
                      : "No flights added"}
                  </div>
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan shrink-0">{label}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTrip(t.id);
                  }}
                  className={deleteButtonClass}
                  aria-label="Delete trip"
                >
                  ✕
                </button>
              </div>

              {expanded && (
                <div className="flex flex-col gap-1 pb-2">
                  {sortedLegs.map((leg) => (
                    <div key={leg.id} className="group flex items-center gap-2 pl-6 pr-3">
                      <div className="flex-1 min-w-0 text-[11px] font-mono">
                        <div className="truncate">
                          <span className="text-cyan">{leg.from}</span>
                          <span className="text-faint"> → </span>
                          <span className="text-cyan">{leg.to}</span>
                        </div>
                        {/* Its own line, full row width -- the departure/arrival
                            time is the whole point of this row, so it must
                            never share space with (and get truncated behind)
                            the from/to labels above. */}
                        <div className="text-faint">{formatLeg(leg.date, leg.departTime, leg.arriveTime)}</div>
                      </div>
                      <button
                        onClick={() => removeLeg(t.id, leg.id)}
                        className="text-faint hover:text-warn opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        aria-label="Delete leg"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <AddLegForm onAdd={(leg) => addLeg(t.id, leg)} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AssignmentsTab({
  assignments,
  setAssignments,
}: {
  assignments: AssignmentItem[];
  setAssignments: Dispatch<SetStateAction<AssignmentItem[] | null>>;
}) {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [dueDate, setDueDate] = useState("");

  function addAssignment() {
    const name = title.trim();
    if (!name || !dueDate) return;
    setAssignments((prev) => [
      ...(prev ?? []),
      { id: crypto.randomUUID(), title: name, subject: subject.trim(), dueDate, done: false },
    ]);
    setTitle("");
    setSubject("");
    setDueDate("");
  }

  function toggle(id: string) {
    setAssignments((prev) => (prev ?? []).map((a) => (a.id === id ? { ...a, done: !a.done } : a)));
  }

  function remove(id: string) {
    setAssignments((prev) => (prev ?? []).filter((a) => a.id !== id));
  }

  const sorted = [...assignments].sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return (
    <div className="h-full flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Assignment…"
            className={`flex-1 min-w-0 ${inputClass}`}
          />
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className={`w-24 shrink-0 ${inputClass}`}
          />
        </div>
        <div className="flex gap-2">
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className={`flex-1 min-w-0 ${inputClass}`}
          />
          <button onClick={addAssignment} className={addButtonClass}>
            Add
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1.5 pt-1">
        {sorted.length === 0 && <div className="text-sm text-faint font-mono py-2">Nothing due.</div>}
        {sorted.map((a) => {
          const remaining = daysUntil(a.dueDate);
          const urgency = a.done ? "text-faint" : remaining <= 0 ? "text-warn" : remaining <= 2 ? "text-amber" : "text-faint";
          const label = a.done ? "Done" : remaining < 0 ? "Overdue" : remaining === 0 ? "Due today" : `${remaining}d left`;
          return (
            <div key={a.id} className={rowClass}>
              <button
                onClick={() => toggle(a.id)}
                className={`w-4 h-4 rounded-full border shrink-0 transition-colors ${
                  a.done ? "bg-good border-good" : "border-faint"
                }`}
                aria-label={a.done ? "Mark incomplete" : "Mark complete"}
              />
              <div className="flex-1 min-w-0">
                <div className={`text-sm truncate ${a.done ? "text-faint line-through" : "text-ink"}`}>{a.title}</div>
                <div className="text-[11px] text-faint font-mono">
                  {a.subject ? `${a.subject} · ` : ""}
                  {formatDate(a.dueDate)}
                </div>
              </div>
              <span className={`text-[10px] font-mono uppercase tracking-wider shrink-0 ${urgency}`}>{label}</span>
              <button onClick={() => remove(a.id)} className={deleteButtonClass} aria-label="Delete">
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function TripsWidget({ onRemove }: { onRemove?: () => void }) {
  const [tab, setTab] = useState<Tab>("trips");
  const [trips, setTrips] = useUserStorage<TripItem[]>("trips", []);
  const [assignments, setAssignments] = useUserStorage<AssignmentItem[]>("assignments", []);

  return (
    <WidgetCard eyebrow="Planner" title="Trips & Deadlines" onRemove={onRemove}>
      <div className="h-full flex flex-col">
        <Tabs tab={tab} setTab={setTab} />
        <div className="flex-1 min-h-0">
          {tab === "trips" && <TripsTab trips={(trips ?? []).map(normalizeTrip)} setTrips={setTrips} />}
          {tab === "assignments" && <AssignmentsTab assignments={assignments ?? []} setAssignments={setAssignments} />}
        </div>
      </div>
    </WidgetCard>
  );
}
