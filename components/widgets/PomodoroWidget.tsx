"use client";

import { useEffect, useRef, useState } from "react";
import WidgetCard from "@/components/WidgetCard";

const WORK_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;

export default function PomodoroWidget({ onRemove }: { onRemove?: () => void }) {
  const [mode, setMode] = useState<"work" | "break">("work");
  const [secondsLeft, setSecondsLeft] = useState(WORK_SECONDS);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(0);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s > 1) return s - 1;
        const finishedWork = modeRef.current === "work";
        setMode(finishedWork ? "break" : "work");
        if (finishedWork) setCompleted((c) => c + 1);
        return finishedWork ? BREAK_SECONDS : WORK_SECONDS;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  function reset() {
    setRunning(false);
    setMode("work");
    setSecondsLeft(WORK_SECONDS);
  }

  const total = mode === "work" ? WORK_SECONDS : BREAK_SECONDS;
  const pct = Math.round(((total - secondsLeft) / total) * 100);
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  return (
    <WidgetCard eyebrow={`${completed} completed today`} title="Pomodoro" onRemove={onRemove}>
      <div className="h-full flex flex-col justify-center items-center gap-3">
        <div className={`text-xs font-mono uppercase tracking-wider ${mode === "work" ? "text-amber" : "text-good"}`}>
          {mode === "work" ? "Focus" : "Break"}
        </div>
        <div
          className={`font-mono font-bold text-ink leading-none tabular-nums text-[clamp(2rem,6vw,3.6rem)] transition-[filter] ${
            running ? (mode === "work" ? "drop-shadow-[0_0_18px_rgba(232,163,61,0.35)]" : "drop-shadow-[0_0_18px_rgba(95,191,139,0.35)]") : ""
          }`}
        >
          {mm}:{ss}
        </div>
        <div className="w-full max-w-[180px] h-1.5 rounded-full bg-surfaceRaised overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${mode === "work" ? "bg-amber" : "bg-good"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex gap-2 mt-1">
          <button
            onClick={() => setRunning((r) => !r)}
            className={`text-xs font-mono text-ink border rounded-lg px-3 py-1.5 transition-all duration-200 ${
              mode === "work"
                ? "border-amber/50 hover:shadow-glow-amber"
                : "border-good/50 hover:shadow-[0_0_0_1px_rgba(95,191,139,0.35),0_0_24px_rgba(95,191,139,0.18)]"
            }`}
          >
            {running ? "Pause" : "Start"}
          </button>
          <button
            onClick={reset}
            className="text-xs font-mono text-muted hover:text-cyan border border-hairline hover:border-cyan/50 rounded-lg px-3 py-1.5 transition-all duration-200 hover:shadow-glow-cyan"
          >
            Reset
          </button>
        </div>
      </div>
    </WidgetCard>
  );
}
