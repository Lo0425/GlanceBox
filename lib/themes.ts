import type { ThemeId } from "@/lib/types";

// One-line-per-theme metadata for the theme picker UI. The actual colors a
// theme applies live in app/globals.css as CSS variables keyed by
// `[data-theme="<id>"]` -- swatch here is just a preview hint (background /
// primary accent / secondary accent) so it's fine if it's a hand-picked
// sample rather than programmatically read back from the CSS.
export const THEMES: { id: ThemeId; label: string; description: string; swatch: [string, string, string] }[] = [
  {
    id: "terminal",
    label: "Terminal",
    description: "The original dark console look",
    swatch: ["#14161A", "#4FE0D6", "#E8A33D"],
  },
  {
    id: "colorful",
    label: "Colorful",
    description: "Vivid multi-hue accents",
    swatch: ["#16121F", "#22D3EE", "#FF9F43"],
  },
  {
    id: "sakura",
    label: "Sakura",
    description: "Soft cherry-blossom pink, light",
    swatch: ["#FDF3F6", "#F472B6", "#E8A05C"],
  },
  {
    id: "futuristic",
    label: "Futuristic",
    description: "Neon cyberpunk on near-black",
    swatch: ["#0A0E17", "#00F0FF", "#FFD23F"],
  },
  {
    id: "ocean",
    label: "Ocean",
    description: "Calm deep-sea blues and teal",
    swatch: ["#0B1B26", "#2FB8CE", "#E3A857"],
  },
  {
    id: "sunset",
    label: "Sunset",
    description: "Warm dusk oranges and pinks",
    swatch: ["#1C1220", "#FF6F91", "#FF9448"],
  },
  {
    id: "panda",
    label: "Panda",
    description: "Black, white, and bamboo green, light",
    swatch: ["#F5F5F2", "#3F8F6E", "#1E1E1E"],
  },
];

export const DEFAULT_THEME: ThemeId = "terminal";
