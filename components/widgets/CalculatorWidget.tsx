"use client";

import { useMemo, useState } from "react";
import WidgetCard from "@/components/WidgetCard";

type Mode = "standard" | "bits" | "bmi";

const MODES: { id: Mode; label: string }[] = [
  { id: "standard", label: "Std" },
  { id: "bits", label: "Bits" },
  { id: "bmi", label: "BMI" },
];

function ModeTabs({ mode, setMode }: { mode: Mode; setMode: (m: Mode) => void }) {
  return (
    <div className="flex gap-1 mb-3 shrink-0">
      {MODES.map((m) => (
        <button
          key={m.id}
          onClick={() => setMode(m.id)}
          className={`flex-1 text-xs font-mono uppercase tracking-wider py-1.5 rounded-lg border transition-all duration-200 ${
            mode === m.id
              ? "border-cyan/50 text-cyan bg-surfaceRaised shadow-glow-cyan"
              : "border-hairline text-faint hover:text-ink"
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- standard

type CalcOp = "+" | "-" | "×" | "÷";
type ButtonVariant = "num" | "op" | "fn" | "eq";

function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return "Error";
  return String(Math.round(n * 1e10) / 1e10);
}

function CalcButton({
  label,
  onClick,
  variant,
  span,
}: {
  label: string;
  onClick: () => void;
  variant: ButtonVariant;
  span?: boolean;
}) {
  const styles: Record<ButtonVariant, string> = {
    num: "bg-surfaceRaised border-hairline text-ink hover:border-cyan/40",
    op: "bg-surfaceRaised border-cyan/30 text-cyan hover:shadow-glow-cyan",
    fn: "bg-surfaceRaised border-hairline text-faint hover:text-warn",
    eq: "bg-amber/10 border-amber/50 text-amber hover:shadow-glow-amber",
  };
  return (
    <button
      onClick={onClick}
      className={`${span ? "col-span-2" : ""} rounded-lg border py-2 text-sm font-mono transition-all duration-150 active:scale-95 ${styles[variant]}`}
    >
      {label}
    </button>
  );
}

function StandardCalculator() {
  const [display, setDisplay] = useState("0");
  const [prev, setPrev] = useState<number | null>(null);
  const [op, setOp] = useState<CalcOp | null>(null);
  const [waiting, setWaiting] = useState(false);

  function inputDigit(d: string) {
    if (waiting) {
      setDisplay(d);
      setWaiting(false);
    } else {
      setDisplay(display === "0" ? d : display + d);
    }
  }

  function inputDecimal() {
    if (waiting) {
      setDisplay("0.");
      setWaiting(false);
      return;
    }
    if (!display.includes(".")) setDisplay(display + ".");
  }

  function clear() {
    setDisplay("0");
    setPrev(null);
    setOp(null);
    setWaiting(false);
  }

  function backspace() {
    if (waiting) return;
    setDisplay((d) => (d.length > 1 ? d.slice(0, -1) : "0"));
  }

  function compute(a: number, b: number, operator: CalcOp): number {
    switch (operator) {
      case "+":
        return a + b;
      case "-":
        return a - b;
      case "×":
        return a * b;
      case "÷":
        return b === 0 ? NaN : a / b;
    }
  }

  function handleOperator(nextOp: CalcOp) {
    const value = parseFloat(display);
    if (prev !== null && op && !waiting) {
      const result = compute(prev, value, op);
      setDisplay(formatNumber(result));
      setPrev(result);
    } else {
      setPrev(value);
    }
    setOp(nextOp);
    setWaiting(true);
  }

  function handleEquals() {
    if (prev === null || op === null) return;
    const value = parseFloat(display);
    setDisplay(formatNumber(compute(prev, value, op)));
    setPrev(null);
    setOp(null);
    setWaiting(true);
  }

  const buttons: { label: string; onClick: () => void; variant: ButtonVariant; span?: boolean }[] = [
    { label: "C", onClick: clear, variant: "fn" },
    { label: "⌫", onClick: backspace, variant: "fn" },
    { label: "%", onClick: () => setDisplay(formatNumber(parseFloat(display) / 100)), variant: "fn" },
    { label: "÷", onClick: () => handleOperator("÷"), variant: "op" },
    { label: "7", onClick: () => inputDigit("7"), variant: "num" },
    { label: "8", onClick: () => inputDigit("8"), variant: "num" },
    { label: "9", onClick: () => inputDigit("9"), variant: "num" },
    { label: "×", onClick: () => handleOperator("×"), variant: "op" },
    { label: "4", onClick: () => inputDigit("4"), variant: "num" },
    { label: "5", onClick: () => inputDigit("5"), variant: "num" },
    { label: "6", onClick: () => inputDigit("6"), variant: "num" },
    { label: "−", onClick: () => handleOperator("-"), variant: "op" },
    { label: "1", onClick: () => inputDigit("1"), variant: "num" },
    { label: "2", onClick: () => inputDigit("2"), variant: "num" },
    { label: "3", onClick: () => inputDigit("3"), variant: "num" },
    { label: "+", onClick: () => handleOperator("+"), variant: "op" },
    { label: "0", onClick: () => inputDigit("0"), variant: "num", span: true },
    { label: ".", onClick: inputDecimal, variant: "num" },
    { label: "=", onClick: handleEquals, variant: "eq" },
  ];

  return (
    <div className="h-full flex flex-col gap-3">
      <div className="flex-1 min-h-0 flex items-end justify-end px-1">
        <div className="text-2xl font-mono font-bold text-ink truncate">{display}</div>
      </div>
      <div className="grid grid-cols-4 gap-2 shrink-0">
        {buttons.map((b) => (
          <CalcButton key={b.label + b.variant} label={b.label} onClick={b.onClick} variant={b.variant} span={b.span} />
        ))}
      </div>
    </div>
  );
}

// -------------------------------------------------------------------- bits

const BIT_WIDTHS = [8, 16] as const;

function BitSwitch() {
  const [bits, setBits] = useState<(typeof BIT_WIDTHS)[number]>(8);
  const [value, setValue] = useState(0);

  const max = 2 ** bits - 1;

  function toggleBit(index: number) {
    setValue((v) => v ^ (1 << index));
  }

  function handleDecimalInput(raw: string) {
    const digitsOnly = raw.replace(/[^0-9]/g, "");
    const n = digitsOnly === "" ? 0 : parseInt(digitsOnly, 10);
    setValue(Math.max(0, Math.min(max, n)));
  }

  const hexDigits = Math.ceil(bits / 4);
  const hexStr = value.toString(16).toUpperCase().padStart(hexDigits, "0");

  return (
    <div className="h-full flex flex-col gap-3">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex gap-1">
          {BIT_WIDTHS.map((w) => (
            <button
              key={w}
              onClick={() => {
                setBits(w);
                setValue((v) => v & (2 ** w - 1));
              }}
              className={`text-[11px] font-mono px-2 py-1 rounded border transition-colors ${
                bits === w ? "border-cyan/50 text-cyan bg-surfaceRaised" : "border-hairline text-faint hover:text-ink"
              }`}
            >
              {w}-bit
            </button>
          ))}
        </div>
        <button
          onClick={() => setValue(0)}
          className="text-[11px] font-mono text-faint hover:text-warn transition-colors"
        >
          Clear
        </button>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 font-mono text-sm shrink-0">
        <span className="text-faint self-center">DEC</span>
        <input
          value={value}
          onChange={(e) => handleDecimalInput(e.target.value)}
          inputMode="numeric"
          className="bg-surfaceRaised border border-hairline rounded px-2 py-1 text-ink text-right outline-none focus:border-cyan/60 transition-colors"
        />
        <span className="text-faint self-center">HEX</span>
        <div className="bg-surfaceRaised border border-hairline rounded px-2 py-1 text-cyan text-right">
          0x{hexStr}
        </div>
      </div>

      <div className="flex-1 min-h-0 flex items-center justify-center">
        <div className="flex gap-1 flex-wrap justify-center">
          {Array.from({ length: bits }).map((_, i) => {
            const bitIndex = bits - 1 - i;
            const on = (value >> bitIndex) & 1;
            return (
              <button
                key={bitIndex}
                onClick={() => toggleBit(bitIndex)}
                title={`bit ${bitIndex}`}
                className={`w-6 h-8 rounded border text-[10px] font-mono flex items-center justify-center transition-all duration-150 ${
                  on
                    ? "bg-cyan/20 border-cyan text-cyan shadow-glow-cyan"
                    : "bg-surfaceRaised border-hairline text-faint hover:border-cyan/30"
                }`}
              >
                {on}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------- bmi

function BmiCalculator() {
  const [heightCm, setHeightCm] = useState("170");
  const [weightKg, setWeightKg] = useState("65");

  const bmi = useMemo(() => {
    const h = parseFloat(heightCm) / 100;
    const w = parseFloat(weightKg);
    if (!h || !w || h <= 0 || w <= 0) return null;
    return w / (h * h);
  }, [heightCm, weightKg]);

  const category = useMemo(() => {
    if (bmi === null) return null;
    if (bmi < 18.5) return { label: "Underweight", color: "text-cyan" };
    if (bmi < 25) return { label: "Normal", color: "text-good" };
    if (bmi < 30) return { label: "Overweight", color: "text-amber" };
    return { label: "Obese", color: "text-warn" };
  }, [bmi]);

  return (
    <div className="h-full flex flex-col gap-3 justify-center">
      <label className="flex flex-col gap-1">
        <span className="text-[11px] text-faint font-mono uppercase tracking-wider">Height (cm)</span>
        <input
          value={heightCm}
          onChange={(e) => setHeightCm(e.target.value)}
          inputMode="decimal"
          className="bg-surfaceRaised border border-hairline rounded-lg px-3 py-1.5 text-sm text-ink outline-none focus:border-cyan/60 transition-colors"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[11px] text-faint font-mono uppercase tracking-wider">Weight (kg)</span>
        <input
          value={weightKg}
          onChange={(e) => setWeightKg(e.target.value)}
          inputMode="decimal"
          className="bg-surfaceRaised border border-hairline rounded-lg px-3 py-1.5 text-sm text-ink outline-none focus:border-cyan/60 transition-colors"
        />
      </label>

      <div className="mt-1 text-center">
        <div className="text-4xl font-display font-bold text-ink">{bmi !== null ? bmi.toFixed(1) : "—"}</div>
        {category && (
          <div className={`text-xs font-mono uppercase tracking-wider mt-1 ${category.color}`}>{category.label}</div>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ widget

export default function CalculatorWidget({ onRemove }: { onRemove?: () => void }) {
  const [mode, setMode] = useState<Mode>("standard");

  return (
    <WidgetCard eyebrow="Toolbox" title="Calculator" onRemove={onRemove}>
      <div className="h-full flex flex-col">
        <ModeTabs mode={mode} setMode={setMode} />
        <div className="flex-1 min-h-0">
          {mode === "standard" && <StandardCalculator />}
          {mode === "bits" && <BitSwitch />}
          {mode === "bmi" && <BmiCalculator />}
        </div>
      </div>
    </WidgetCard>
  );
}
