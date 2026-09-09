"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import WidgetCard from "@/components/WidgetCard";
import { getCached, setCached } from "@/lib/clientCache";

const CACHE_KEY = "aquarium";
const SPECIES = ["🐠", "🐟", "🐡", "🐙", "🦑", "🦈"];
const MAX_FISH = 8;
// percent happiness lost per real minute while the tab is closed or idle
const HAPPINESS_DECAY_PER_MIN = 0.6;

interface Pos {
  x: number; // percent across the tank
  y: number; // percent down the tank
}

interface Fish {
  id: string;
  species: string;
  pos: Pos;
  facing: 1 | -1;
}

interface AquariumState {
  fish: Fish[];
  happiness: number;
  lastUpdate: number;
}

function clampPct(n: number): number {
  return Math.max(0, Math.min(100, n));
}

function randomPos(): Pos {
  return { x: 10 + Math.random() * 80, y: 12 + Math.random() * 70 };
}

function directionTo(next: number, prev: number): 1 | -1 {
  return next < prev ? -1 : 1;
}

function defaultAquarium(): AquariumState {
  return {
    fish: [
      { id: crypto.randomUUID(), species: "🐠", pos: randomPos(), facing: 1 },
      { id: crypto.randomUUID(), species: "🐡", pos: randomPos(), facing: -1 },
      { id: crypto.randomUUID(), species: "🐟", pos: randomPos(), facing: 1 },
    ],
    happiness: 75,
    lastUpdate: Date.now(),
  };
}

function applyDecay(state: AquariumState, now: number): AquariumState {
  const elapsedMin = Math.max(0, (now - state.lastUpdate) / 60_000);
  return { ...state, happiness: clampPct(state.happiness - HAPPINESS_DECAY_PER_MIN * elapsedMin), lastUpdate: now };
}

function moodFor(happiness: number): string {
  if (happiness >= 75) return "Thriving";
  if (happiness >= 45) return "Content";
  if (happiness >= 20) return "Needs feeding";
  return "Neglected";
}

export default function AquariumWidget({ onRemove }: { onRemove?: () => void }) {
  const { status, getIdToken } = useAuth();
  // Seeded from the last load so a remount (e.g. DashboardGrid swapping
  // layouts at a responsive breakpoint) repaints instantly instead of
  // flashing back to "Loading..." while it refetches.
  const [state, setState] = useState<AquariumState | null>(() => getCached(CACHE_KEY) ?? null);
  const [bounceId, setBounceId] = useState<string | null>(null);
  const [foodTop, setFoodTop] = useState<number | null>(null);
  const loadedRef = useRef(false);

  // Loads from the signed-in user's account, falling back to a fresh tank if
  // there's nothing saved yet. Decay is applied regardless, based on elapsed
  // real time since the last update.
  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;

    (async () => {
      const now = Date.now();
      try {
        const token = await getIdToken();
        const res = await fetch("/api/user-data?key=aquarium", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const json = await res.json();
        if (cancelled) return;
        if (json.value) {
          loadedRef.current = true;
          setState(applyDecay(json.value, now));
          return;
        }
      } catch {
        // fall through to default below
      }
      if (cancelled) return;
      loadedRef.current = true;
      setState(defaultAquarium());
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    if (!loadedRef.current || !state || status !== "authenticated") return;
    (async () => {
      const token = await getIdToken();
      fetch("/api/user-data", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ key: "aquarium", value: state }),
      }).catch(() => {});
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, status]);

  // Keeps the cross-remount cache current with every state this widget ever
  // reaches so the *next* remount repaints from the latest tank, not a stale one.
  useEffect(() => {
    if (state) setCached(CACHE_KEY, state);
  }, [state]);

  useEffect(() => {
    const id = setInterval(() => setState((s) => (s ? applyDecay(s, Date.now()) : s)), 15_000);
    return () => clearInterval(id);
  }, []);

  // Autonomous wandering: each tick nudges one random fish to a new spot, so
  // multiple fish drift independently without needing a timer per fish.
  useEffect(() => {
    const id = setInterval(() => {
      setState((s) => {
        if (!s || s.fish.length === 0) return s;
        const idx = Math.floor(Math.random() * s.fish.length);
        const next = randomPos();
        const fish = s.fish.map((f, i) => (i === idx ? { ...f, pos: next, facing: directionTo(next.x, f.pos.x) } : f));
        return { ...s, fish };
      });
    }, 1800);
    return () => clearInterval(id);
  }, []);

  function interact(id: string) {
    setBounceId(id);
    setTimeout(() => setBounceId((cur) => (cur === id ? null : cur)), 400);
    setState((s) => {
      if (!s) return s;
      const next = randomPos();
      const fish = s.fish.map((f) => (f.id === id ? { ...f, pos: next, facing: directionTo(next.x, f.pos.x) } : f));
      return { ...s, fish, happiness: clampPct(s.happiness + 3), lastUpdate: Date.now() };
    });
  }

  function feed() {
    // Drop a food pellet in from the top and let it sink -- two rAFs so the
    // browser paints the starting position before the CSS transition to the
    // sunk position kicks in, instead of collapsing straight to the end state.
    setFoodTop(6);
    requestAnimationFrame(() => requestAnimationFrame(() => setFoodTop(78)));
    setTimeout(() => setFoodTop(null), 1600);

    setState((s) => {
      if (!s) return s;
      // Most fish swim toward the food instead of continuing to wander.
      const fish = s.fish.map((f) =>
        Math.random() < 0.7
          ? { ...f, pos: { x: clampPct(50 + (Math.random() - 0.5) * 34), y: clampPct(62 + (Math.random() - 0.5) * 20) }, facing: 1 as const }
          : f
      );
      return { ...s, fish, happiness: clampPct(s.happiness + 15), lastUpdate: Date.now() };
    });
  }

  function addFish(species: string) {
    setState((s) => {
      if (!s || s.fish.length >= MAX_FISH) return s;
      const fish: Fish = { id: crypto.randomUUID(), species, pos: randomPos(), facing: Math.random() < 0.5 ? 1 : -1 };
      return { ...s, fish: [...s.fish, fish] };
    });
  }

  function removeFish(id: string) {
    setState((s) => (s ? { ...s, fish: s.fish.filter((f) => f.id !== id) } : s));
  }

  if (!state) {
    return (
      <WidgetCard eyebrow="Companion" title="Aquarium" onRemove={onRemove}>
        <div className="text-sm text-faint font-mono">Loading…</div>
      </WidgetCard>
    );
  }

  const atCap = state.fish.length >= MAX_FISH;

  return (
    <WidgetCard eyebrow={moodFor(state.happiness)} title="Aquarium" onRemove={onRemove}>
      <div className="h-full flex flex-col gap-3">
        <div className="relative flex-1 min-h-[80px] rounded-lg border border-hairline bg-gradient-to-b from-cyan/10 via-surfaceRaised/40 to-surfaceRaised/60 overflow-hidden">
          <span className="absolute bottom-1 left-[15%] w-1 h-1 rounded-full bg-cyan/30 animate-bubble-rise" style={{ animationDelay: "0s" }} />
          <span className="absolute bottom-1 left-[45%] w-1 h-1 rounded-full bg-cyan/30 animate-bubble-rise" style={{ animationDelay: "1.1s" }} />
          <span className="absolute bottom-1 left-[75%] w-1 h-1 rounded-full bg-cyan/30 animate-bubble-rise" style={{ animationDelay: "2.2s" }} />

          {state.fish.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-faint font-mono text-center px-4">
              The tank is empty. Add a fish below.
            </div>
          )}

          {state.fish.map((f) => (
            <div
              key={f.id}
              className="absolute"
              style={{
                left: `${f.pos.x}%`,
                top: `${f.pos.y}%`,
                transform: "translate(-50%, -50%)",
                transition: "left 1.8s ease-in-out, top 1.8s ease-in-out",
              }}
            >
              <div className="animate-idle-bob">
                <button
                  onClick={() => interact(f.id)}
                  title="Click to play"
                  className="block text-2xl leading-none cursor-pointer transition-transform duration-200"
                  style={{ transform: `scaleX(${f.facing}) ${bounceId === f.id ? "scale(1.35)" : "scale(1)"}` }}
                >
                  {f.species}
                </button>
              </div>
            </div>
          ))}

          {foodTop !== null && (
            <span
              className="absolute text-base"
              style={{
                left: "50%",
                top: `${foodTop}%`,
                transform: "translate(-50%, -50%)",
                transition: "top 1.3s ease-in, opacity 0.4s ease-in 1s",
                opacity: foodTop > 60 ? 0 : 1,
              }}
            >
              🟤
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={feed}
            className="text-xs font-mono text-muted hover:text-amber border border-hairline hover:border-amber/50 rounded-lg px-3 py-1.5 transition-all duration-200 hover:shadow-glow-amber"
          >
            Feed
          </button>
          <div className="flex gap-1 ml-auto">
            {SPECIES.map((s) => (
              <button
                key={s}
                onClick={() => addFish(s)}
                disabled={atCap}
                title={atCap ? "Tank is full" : `Add ${s}`}
                className="text-sm w-6 h-6 flex items-center justify-center rounded bg-surfaceRaised transition-colors hover:ring-1 hover:ring-cyan/50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 shrink-0">
          {state.fish.map((f) => (
            <div
              key={f.id}
              className="group flex items-center gap-1 pl-2 pr-1.5 py-0.5 rounded-full bg-surfaceRaised border border-hairline"
            >
              <span className="text-xs">{f.species}</span>
              <button
                onClick={() => removeFish(f.id)}
                className="text-faint hover:text-warn opacity-0 group-hover:opacity-100 transition-opacity text-[10px]"
                aria-label="Remove fish"
                title="Remove fish"
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
