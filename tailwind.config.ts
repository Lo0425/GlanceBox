import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      // Each color resolves through a CSS variable (defined per-theme in
      // globals.css, keyed off a `data-theme` attribute on <html>) instead of
      // a fixed hex value -- this is what lets every widget's existing
      // `bg-surface` / `text-cyan` / `border-hairline` / etc. classes repaint
      // for a different theme with zero changes to the components using
      // them. The `rgb(var(...) / <alpha-value>)` form (channels stored as
      // "R G B", not a hex string) is what preserves opacity-modifier syntax
      // like `bg-cyan/10` or `border-hairline/50`.
      colors: {
        base: "rgb(var(--color-base) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        surfaceRaised: "rgb(var(--color-surfaceRaised) / <alpha-value>)",
        hairline: "rgb(var(--color-hairline) / <alpha-value>)",
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        muted: "rgb(var(--color-muted) / <alpha-value>)",
        faint: "rgb(var(--color-faint) / <alpha-value>)",
        amber: "rgb(var(--color-amber) / <alpha-value>)",
        amberDim: "rgb(var(--color-amberDim) / <alpha-value>)",
        good: "rgb(var(--color-good) / <alpha-value>)",
        warn: "rgb(var(--color-warn) / <alpha-value>)",
        cyan: "rgb(var(--color-cyan) / <alpha-value>)",
        violet: "rgb(var(--color-violet) / <alpha-value>)",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      backgroundImage: {
        dotgrid:
          "radial-gradient(circle, rgb(var(--color-hairline)) 1px, transparent 1px)",
      },
      backgroundSize: {
        dotgrid: "22px 22px",
      },
      boxShadow: {
        "glow-amber": "0 0 0 1px rgb(var(--color-amber) / 0.35), 0 0 24px rgb(var(--color-amber) / 0.18)",
        "glow-cyan": "0 0 0 1px rgb(var(--color-cyan) / 0.35), 0 0 24px rgb(var(--color-cyan) / 0.18)",
        "glow-sm": "0 0 12px rgb(var(--color-amber) / 0.25)",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { opacity: "1", boxShadow: "0 0 0 0 rgba(79,224,214,0.5)" },
          "50%": { opacity: "0.6", boxShadow: "0 0 0 4px rgba(79,224,214,0)" },
        },
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        idleBob: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        sleepFloat: {
          "0%": { transform: "translateY(0)", opacity: "0" },
          "20%": { opacity: "1" },
          "100%": { transform: "translateY(-14px)", opacity: "0" },
        },
        bubbleRise: {
          "0%": { transform: "translateY(0) scale(0.7)", opacity: "0" },
          "15%": { opacity: "0.8" },
          "100%": { transform: "translateY(-90px) scale(1)", opacity: "0" },
        },
      },
      animation: {
        "pulse-glow": "pulseGlow 2.2s ease-in-out infinite",
        scan: "scan 6s linear infinite",
        "idle-bob": "idleBob 2.2s ease-in-out infinite",
        "sleep-float": "sleepFloat 2.4s ease-in-out infinite",
        "bubble-rise": "bubbleRise 3.4s ease-in infinite",
      },
    },
  },
  plugins: [],
};

export default config;
