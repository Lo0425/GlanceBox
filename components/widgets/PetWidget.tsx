"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import WidgetCard from "@/components/WidgetCard";

const LEGACY_STORAGE_KEY = "console-dashboard-pet-v1";
const SPECIES = ["🐱", "🐶", "🐹", "🐲", "🐧"];
const SLEEP_ENERGY_THRESHOLD = 25;

interface PetState {
  name: string;
  species: string;
  hunger: number;
  happiness: number;
  energy: number;
  lastUpdate: number;
}

interface Pos {
  x: number; // percent across the stage
  y: number; // percent down the stage
}

// percent lost per real minute while the tab is closed or idle
const DECAY = { hunger: 1.2, happiness: 0.9, energy: 0.6 };

function clamp(n: number): number {
  return Math.max(0, Math.min(100, n));
}

function applyDecay(pet: PetState, now: number): PetState {
  const elapsedMin = Math.max(0, (now - pet.lastUpdate) / 60_000);
  return {
    ...pet,
    hunger: clamp(pet.hunger - DECAY.hunger * elapsedMin),
    happiness: clamp(pet.happiness - DECAY.happiness * elapsedMin),
    energy: clamp(pet.energy - DECAY.energy * elapsedMin),
    lastUpdate: now,
  };
}

function moodFor(pet: PetState): { label: string } {
  if (pet.energy < SLEEP_ENERGY_THRESHOLD) return { label: "Asleep" };
  const avg = (pet.hunger + pet.happiness + pet.energy) / 3;
  if (avg >= 70) return { label: "Thriving" };
  if (avg >= 40) return { label: "Doing okay" };
  if (avg >= 20) return { label: "Needs attention" };
  return { label: "Struggling" };
}

function randomPos(): Pos {
  return { x: 12 + Math.random() * 76, y: 15 + Math.random() * 70 };
}

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-faint font-mono uppercase tracking-wider">{label}</span>
        <span className="text-[10px] text-faint font-mono">{Math.round(value)}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-surfaceRaised overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default function PetWidget({ onRemove }: { onRemove?: () => void }) {
  const { status, getIdToken } = useAuth();
  const [pet, setPet] = useState<PetState | null>(null);
  const [pos, setPos] = useState<Pos>({ x: 50, y: 50 });
  const [facing, setFacing] = useState<1 | -1>(1);
  const [bounce, setBounce] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const loadedRef = useRef(false);

  // Loads from the signed-in user's account, falling back to the old
  // localStorage key (one-time migration) or a fresh pet if neither exists.
  // Decay is applied regardless of source, based on elapsed real time.
  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;

    (async () => {
      const now = Date.now();
      try {
        const token = await getIdToken();
        const res = await fetch("/api/user-data?key=pet", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const json = await res.json();
        if (cancelled) return;
        if (json.value) {
          loadedRef.current = true;
          setPet(applyDecay(json.value, now));
          return;
        }
      } catch {
        // fall through to legacy/default below
      }
      if (cancelled) return;

      const saved = window.localStorage.getItem(LEGACY_STORAGE_KEY);
      if (saved) {
        try {
          loadedRef.current = true;
          setPet(applyDecay(JSON.parse(saved), now));
          return;
        } catch {
          // corrupt legacy value -- fall through to default
        }
      }

      loadedRef.current = true;
      setPet({ name: "Widget", species: "🐱", hunger: 80, happiness: 80, energy: 80, lastUpdate: now });
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    if (!loadedRef.current || !pet || status !== "authenticated") return;
    (async () => {
      const token = await getIdToken();
      fetch("/api/user-data", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ key: "pet", value: pet }),
      }).catch(() => {});
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pet, status]);

  useEffect(() => {
    const id = setInterval(() => setPet((p) => (p ? applyDecay(p, Date.now()) : p)), 15_000);
    return () => clearInterval(id);
  }, []);

  // Autonomous wandering, independent of React re-renders: reads live energy
  // via a ref so a pet stat update (every 15s) doesn't reset this timer's cadence.
  const petRef = useRef(pet);
  petRef.current = pet;

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    function scheduleNext() {
      const asleep = (petRef.current?.energy ?? 100) < SLEEP_ENERGY_THRESHOLD;
      const delay = asleep ? 6000 + Math.random() * 4000 : 2500 + Math.random() * 3500;
      timeoutId = setTimeout(() => {
        if (!asleep) {
          setPos((prev) => {
            const next = randomPos();
            setFacing(next.x < prev.x ? -1 : 1);
            return next;
          });
        }
        scheduleNext();
      }, delay);
    }

    scheduleNext();
    return () => clearTimeout(timeoutId);
  }, []);

  function pat() {
    setBounce(true);
    setTimeout(() => setBounce(false), 400);
    setPos((prev) => {
      const next = randomPos();
      setFacing(next.x < prev.x ? -1 : 1);
      return next;
    });
    setPet((p) => (p ? { ...p, happiness: clamp(p.happiness + 4), lastUpdate: Date.now() } : p));
  }

  function feed() {
    setPet((p) => (p ? { ...p, hunger: clamp(p.hunger + 25), happiness: clamp(p.happiness + 3), lastUpdate: Date.now() } : p));
  }

  function play() {
    setPos(randomPos());
    setPet((p) =>
      p
        ? {
            ...p,
            happiness: clamp(p.happiness + 20),
            energy: clamp(p.energy - 10),
            hunger: clamp(p.hunger - 5),
            lastUpdate: Date.now(),
          }
        : p
    );
  }

  function rest() {
    setPet((p) => (p ? { ...p, energy: clamp(p.energy + 30), lastUpdate: Date.now() } : p));
  }

  if (!pet) {
    return (
      <WidgetCard eyebrow="Companion" title="Pet" onRemove={onRemove}>
        <div className="text-sm text-faint font-mono">Loading…</div>
      </WidgetCard>
    );
  }

  const mood = moodFor(pet);
  const asleep = pet.energy < SLEEP_ENERGY_THRESHOLD;

  return (
    <WidgetCard eyebrow={mood.label} title="Pet" onRemove={onRemove}>
      <div className="h-full flex flex-col gap-3">
        <div className="relative flex-1 min-h-[64px] rounded-lg border border-hairline bg-surfaceRaised/40 overflow-hidden">
          {/* position layer: only left/top animate here, so it never fights with the flip/bounce transform below */}
          <div
            className="absolute"
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              transform: "translate(-50%, -50%)",
              transition: "left 1.6s ease-in-out, top 1.6s ease-in-out",
            }}
          >
            {/* idle-bob layer: pure CSS animation, kept off its own inline transform so nothing overwrites it */}
            <div className={asleep ? "" : "animate-idle-bob"}>
              <button
                onClick={pat}
                title="Click to play"
                className="block text-4xl leading-none transition-transform duration-200 cursor-pointer"
                style={{ transform: `scaleX(${facing}) ${bounce ? "scale(1.3)" : "scale(1)"}` }}
              >
                {pet.species}
              </button>
            </div>
            {asleep && (
              <span className="absolute -top-4 left-full text-base animate-sleep-float pointer-events-none select-none">
                💤
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {editingName ? (
            <input
              autoFocus
              defaultValue={pet.name}
              onBlur={(e) => {
                setPet((p) => (p ? { ...p, name: e.target.value.trim() || "Widget" } : p));
                setEditingName(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
              className="flex-1 min-w-0 bg-surfaceRaised border border-hairline rounded px-2 py-1 text-sm text-ink outline-none focus:border-cyan/60"
            />
          ) : (
            <button
              onClick={() => setEditingName(true)}
              className="text-sm font-display font-medium text-ink hover:text-cyan transition-colors truncate"
            >
              {pet.name}
            </button>
          )}
          <div className="flex gap-1.5 ml-auto">
            {SPECIES.map((s) => (
              <button
                key={s}
                onClick={() => setPet((p) => (p ? { ...p, species: s } : p))}
                className={`text-sm w-5 h-5 flex items-center justify-center rounded transition-colors ${
                  pet.species === s ? "bg-surfaceRaised ring-1 ring-cyan/50" : "opacity-50 hover:opacity-100"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2.5 shrink-0">
          <StatBar label="Hunger" value={pet.hunger} color="bg-amber" />
          <StatBar label="Happiness" value={pet.happiness} color="bg-good" />
          <StatBar label="Energy" value={pet.energy} color="bg-cyan" />
        </div>

        <div className="flex gap-2 shrink-0">
          <button
            onClick={feed}
            className="flex-1 text-xs font-mono text-muted hover:text-amber border border-hairline hover:border-amber/50 rounded-lg px-2 py-1.5 transition-all duration-200 hover:shadow-glow-amber"
          >
            Feed
          </button>
          <button
            onClick={play}
            className="flex-1 text-xs font-mono text-muted hover:text-good border border-hairline hover:border-good/50 rounded-lg px-2 py-1.5 transition-all duration-200 hover:shadow-[0_0_0_1px_rgba(95,191,139,0.35),0_0_24px_rgba(95,191,139,0.18)]"
          >
            Play
          </button>
          <button
            onClick={rest}
            className="flex-1 text-xs font-mono text-muted hover:text-cyan border border-hairline hover:border-cyan/50 rounded-lg px-2 py-1.5 transition-all duration-200 hover:shadow-glow-cyan"
          >
            Rest
          </button>
        </div>
      </div>
    </WidgetCard>
  );
}
