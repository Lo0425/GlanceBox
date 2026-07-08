import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        base: "#14161A",
        surface: "#1C1F25",
        surfaceRaised: "#22262E",
        hairline: "#2B2F37",
        ink: "#ECEDEF",
        muted: "#8A8F98",
        faint: "#888FA0",
        amber: "#E8A33D",
        amberDim: "#8A6428",
        good: "#5FBF8B",
        warn: "#E0685A",
        cyan: "#4FE0D6",
        violet: "#8B7CF0",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      backgroundImage: {
        dotgrid:
          "radial-gradient(circle, #2B2F37 1px, transparent 1px)",
      },
      backgroundSize: {
        dotgrid: "22px 22px",
      },
      boxShadow: {
        "glow-amber": "0 0 0 1px rgba(232,163,61,0.35), 0 0 24px rgba(232,163,61,0.18)",
        "glow-cyan": "0 0 0 1px rgba(79,224,214,0.35), 0 0 24px rgba(79,224,214,0.18)",
        "glow-sm": "0 0 12px rgba(232,163,61,0.25)",
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
      },
      animation: {
        "pulse-glow": "pulseGlow 2.2s ease-in-out infinite",
        scan: "scan 6s linear infinite",
        "idle-bob": "idleBob 2.2s ease-in-out infinite",
        "sleep-float": "sleepFloat 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
