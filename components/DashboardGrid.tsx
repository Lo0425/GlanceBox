"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import GridLayout, { Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import type { LayoutItem, ThemeId, WidgetId } from "@/lib/types";
import { DEFAULT_THEME, THEMES } from "@/lib/themes";
import ClockWidget from "@/components/widgets/ClockWidget";
import DateWidget from "@/components/widgets/DateWidget";
import WeatherWidget from "@/components/widgets/WeatherWidget";
import TodoWidget from "@/components/widgets/TodoWidget";
import CalendarWidget from "@/components/widgets/CalendarWidget";
import NotesWidget from "@/components/widgets/NotesWidget";
import PomodoroWidget from "@/components/widgets/PomodoroWidget";
import SystemWidget from "@/components/widgets/SystemWidget";
import NewsWidget from "@/components/widgets/NewsWidget";
import CalculatorWidget from "@/components/widgets/CalculatorWidget";
import AquariumWidget from "@/components/widgets/AquariumWidget";
import UsageLimitsWidget from "@/components/widgets/UsageLimitsWidget";
import TripsWidget from "@/components/widgets/TripsWidget";
import UserMenu from "@/components/UserMenu";
import { useUserStorage } from "@/components/useUserStorage";
import { useClickOutside } from "@/components/useClickOutside";

const LEGACY_STORAGE_KEY = "console-dashboard-layout-v1";

const WIDGET_LABELS: Record<WidgetId, string> = {
  clock: "Clock",
  date: "Date",
  weather: "Weather",
  todo: "To-do",
  calendar: "Calendar / Upcoming events",
  notes: "Quick notes",
  pomodoro: "Pomodoro timer",
  system: "System monitor",
  news: "News headlines",
  calculator: "Calculator",
  aquarium: "Aquarium",
  usageLimits: "Your usage limits",
  trips: "Trips & Deadlines",
};

const WIDGET_DEFAULT_SIZE: Record<WidgetId, Pick<LayoutItem, "w" | "h" | "minW" | "minH">> = {
  clock: { w: 3, h: 4, minW: 3, minH: 3 },
  date: { w: 3, h: 4, minW: 3, minH: 3 },
  weather: { w: 3, h: 4, minW: 3, minH: 3 },
  todo: { w: 5, h: 12, minW: 3, minH: 4 },
  calendar: { w: 4, h: 6, minW: 3, minH: 4 },
  notes: { w: 4, h: 12, minW: 3, minH: 3 },
  pomodoro: { w: 3, h: 5, minW: 3, minH: 4 },
  system: { w: 3, h: 5, minW: 3, minH: 4 },
  news: { w: 4, h: 6, minW: 3, minH: 4 },
  calculator: { w: 4, h: 8, minW: 3, minH: 7 },
  aquarium: { w: 5, h: 8, minW: 4, minH: 7 },
  usageLimits: { w: 3, h: 6, minW: 3, minH: 5 },
  trips: { w: 4, h: 11, minW: 3, minH: 8 },
};

const DEFAULT_LAYOUT: LayoutItem[] = [
  { i: "clock", x: 0, y: 0, ...WIDGET_DEFAULT_SIZE.clock },
  { i: "date", x: 3, y: 0, ...WIDGET_DEFAULT_SIZE.date },
  { i: "weather", x: 6, y: 0, ...WIDGET_DEFAULT_SIZE.weather },
  { i: "system", x: 9, y: 0, ...WIDGET_DEFAULT_SIZE.system },
  { i: "pomodoro", x: 9, y: 5, ...WIDGET_DEFAULT_SIZE.pomodoro },
  { i: "usageLimits", x: 9, y: 10, ...WIDGET_DEFAULT_SIZE.usageLimits },
  { i: "todo", x: 0, y: 4, ...WIDGET_DEFAULT_SIZE.todo },
  { i: "notes", x: 5, y: 4, ...WIDGET_DEFAULT_SIZE.notes },
];

const ALL_WIDGET_IDS = Object.keys(WIDGET_LABELS) as WidgetId[];

// The virtual-pet widget was replaced by the aquarium -- rewrite any
// previously saved layout slot so it keeps its old position/size instead of
// silently disappearing (WIDGET_FACTORY no longer has a "pet" entry).
function migrateLayout(list: LayoutItem[]): LayoutItem[] {
  return list.map((item) => ((item.i as string) === "pet" ? { ...item, i: "aquarium" as WidgetId } : item));
}

// Below these container widths, dragging/resizing a 12-column grid on a
// touchscreen is fiddly and the columns get too narrow to be useful -- so
// phone and tablet get a simple, non-draggable stacked layout instead of
// react-grid-layout. Desktop/laptop keeps the existing full drag-and-resize
// grid untouched.
const TABLET_BREAKPOINT = 1024;
const PHONE_BREAKPOINT = 640;
const ROW_HEIGHT = 32;
const ROW_MARGIN = 20;
// Widgets sized tall on desktop (e.g. todo/notes at h:12) rely on sitting
// next to other columns to justify that height -- stacked full-width on
// mobile, that just becomes a wall of empty space above an internally
// scrollable list. Cap it; the list content itself already scrolls.
const STACKED_MAX_H = 8;

// Widgets whose content is an unbounded list (todos, upcoming events, news
// headlines, trips/assignments) can easily hold more items than fit in the
// capped height above -- on desktop that's fine because the user can just
// resize the grid item, but stacked mode has no resize handle at all, so a
// fixed height there silently hides real data behind a tiny, easy-to-miss
// nested scrollbar. For these, stackedPixelHeight is used as a floor
// (minHeight) instead of a hard cap (height), so the widget grows to show
// everything and the *page* scrolls instead of a nested box.
const STACKED_FLEXIBLE_HEIGHT = new Set<WidgetId>(["todo", "calendar", "news", "trips"]);

function stackedPixelHeight(h: number): number {
  const capped = Math.min(h, STACKED_MAX_H);
  return capped * ROW_HEIGHT + Math.max(0, capped - 1) * ROW_MARGIN;
}

const WIDGET_FACTORY: Record<WidgetId, (onRemove: () => void) => React.ReactNode> = {
  clock: (onRemove) => <ClockWidget onRemove={onRemove} />,
  date: (onRemove) => <DateWidget onRemove={onRemove} />,
  weather: (onRemove) => <WeatherWidget onRemove={onRemove} />,
  todo: (onRemove) => <TodoWidget onRemove={onRemove} />,
  calendar: (onRemove) => <CalendarWidget onRemove={onRemove} />,
  notes: (onRemove) => <NotesWidget onRemove={onRemove} />,
  pomodoro: (onRemove) => <PomodoroWidget onRemove={onRemove} />,
  system: (onRemove) => <SystemWidget onRemove={onRemove} />,
  news: (onRemove) => <NewsWidget onRemove={onRemove} />,
  calculator: (onRemove) => <CalculatorWidget onRemove={onRemove} />,
  aquarium: (onRemove) => <AquariumWidget onRemove={onRemove} />,
  usageLimits: (onRemove) => <UsageLimitsWidget onRemove={onRemove} />,
  trips: (onRemove) => <TripsWidget onRemove={onRemove} />,
};

export default function DashboardGrid() {
  const { user } = useAuth();
  const [layout, setLayout] = useUserStorage<LayoutItem[]>("layout", DEFAULT_LAYOUT, LEGACY_STORAGE_KEY);
  const [savedDefault, setSavedDefault] = useUserStorage<LayoutItem[] | null>("defaultLayout", null);
  const [theme, setTheme] = useUserStorage<ThemeId>("theme", DEFAULT_THEME);
  const [justSaved, setJustSaved] = useState(false);
  // DashboardGrid only ever mounts client-side (app/page.tsx gates it behind
  // Firebase auth, which always starts in a "loading" state server-side), so
  // reading window.innerWidth in the initializer is safe -- no hydration
  // mismatch, and it avoids a flash of the wrong layout on mobile.
  const [width, setWidth] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 1200));
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const themePickerRef = useRef<HTMLDivElement>(null);

  const dashboardTitle = user?.name ? `${user.name}'s Dashboard` : "Dashboard";

  useEffect(() => {
    const update = () => setWidth(document.getElementById("grid-container")?.clientWidth ?? 1200);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useClickOutside(pickerRef, () => setPickerOpen(false), pickerOpen);
  useClickOutside(themePickerRef, () => setThemePickerOpen(false), themePickerOpen);

  // The whole page's colors are CSS variables keyed off this attribute (see
  // app/globals.css) -- applying it to <html> means it's in scope for
  // everything, including the fixed-position body background glow that sits
  // behind (not inside) this component's own tree.
  useEffect(() => {
    document.documentElement.dataset.theme = theme ?? DEFAULT_THEME;
  }, [theme]);

  const items = useMemo(() => migrateLayout(layout ?? DEFAULT_LAYOUT), [layout]);

  const breakpoint = width < PHONE_BREAKPOINT ? "phone" : width < TABLET_BREAKPOINT ? "tablet" : "desktop";

  // Stacked (non-grid) modes don't have meaningful x/y drag positions, but
  // still read the stored order top-to-bottom, left-to-right so a layout
  // arranged on desktop shows up in roughly the same order on mobile.
  const stackedItems = useMemo(() => [...items].sort((a, b) => a.y - b.y || a.x - b.x), [items]);

  const handleLayoutChange = (next: Layout[]) => {
    setLayout(next as LayoutItem[]);
  };

  const resetLayout = () => {
    setLayout(migrateLayout(savedDefault ?? DEFAULT_LAYOUT));
  };

  const saveAsDefault = () => {
    setSavedDefault(layout ?? DEFAULT_LAYOUT);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1500);
  };

  const removeWidget = (id: WidgetId) => {
    setLayout((prev) => (prev ?? DEFAULT_LAYOUT).filter((item) => item.i !== id));
  };

  const addWidget = (id: WidgetId) => {
    setLayout((prev) => {
      const current = prev ?? DEFAULT_LAYOUT;
      if (current.some((item) => item.i === id)) return current;
      const maxY = current.reduce((m, item) => Math.max(m, item.y + item.h), 0);
      return [...current, { i: id, x: 0, y: maxY, ...WIDGET_DEFAULT_SIZE[id] }];
    });
    setPickerOpen(false);
  };

  const availableToAdd = ALL_WIDGET_IDS.filter((id) => !items.some((item) => item.i === id));

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-x-4 gap-y-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-cyan animate-pulse-glow" />
            </span>
            <div className="text-[11px] tracking-[0.2em] uppercase text-faint font-mono">
              GlanceBox <span className="text-cyan/70">// live</span>
            </div>
          </div>
          <h1 className="text-xl sm:text-2xl font-display font-bold bg-gradient-to-r from-ink via-ink to-cyan/80 bg-clip-text text-transparent">
            {dashboardTitle}
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative" ref={themePickerRef}>
            <button
              onClick={() => setThemePickerOpen((v) => !v)}
              className="text-xs font-mono text-muted hover:text-cyan border border-hairline hover:border-cyan/50 rounded-lg px-3 py-1.5 transition-all duration-200 hover:shadow-glow-cyan"
            >
              Theme
            </button>
            {themePickerOpen && (
              <div className="absolute right-0 mt-2 w-64 max-w-[80vw] rounded-lg border border-hairline bg-surface/95 backdrop-blur-md shadow-glow-cyan overflow-hidden z-10">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setTheme(t.id);
                      setThemePickerOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 text-left px-3 py-2 text-sm transition-colors ${
                      (theme ?? DEFAULT_THEME) === t.id ? "bg-surfaceRaised text-cyan" : "text-ink hover:bg-surfaceRaised hover:text-cyan"
                    }`}
                  >
                    <span className="flex gap-0.5 shrink-0">
                      {t.swatch.map((hex, i) => (
                        <span key={i} className="w-2 h-2 rounded-full" style={{ backgroundColor: hex }} />
                      ))}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block truncate">{t.label}</span>
                      <span className="block text-[11px] text-faint truncate">{t.description}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="relative" ref={pickerRef}>
            <button
              onClick={() => setPickerOpen((v) => !v)}
              className="text-xs font-mono text-muted hover:text-cyan border border-hairline hover:border-cyan/50 rounded-lg px-3 py-1.5 transition-all duration-200 hover:shadow-glow-cyan"
            >
              + Add widget
            </button>
            {pickerOpen && (
              <div className="absolute right-0 mt-2 w-56 max-w-[80vw] rounded-lg border border-hairline bg-surface/95 backdrop-blur-md shadow-glow-cyan overflow-hidden z-10">
                {availableToAdd.length === 0 && (
                  <div className="px-3 py-2 text-xs text-faint font-mono">All widgets added</div>
                )}
                {availableToAdd.map((id) => (
                  <button
                    key={id}
                    onClick={() => addWidget(id)}
                    className="w-full flex items-center gap-2 text-left px-3 py-2 text-sm text-ink hover:bg-surfaceRaised hover:text-cyan transition-colors"
                  >
                    <span className="w-1 h-1 rounded-full bg-cyan/60 shrink-0" />
                    {WIDGET_LABELS[id]}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={saveAsDefault}
            className="text-xs font-mono text-muted hover:text-cyan border border-hairline hover:border-cyan/50 rounded-lg px-3 py-1.5 transition-all duration-200 hover:shadow-glow-cyan"
          >
            {justSaved ? "Saved ✓" : "Save as default"}
          </button>
          <button
            onClick={resetLayout}
            className="text-xs font-mono text-muted hover:text-amber border border-hairline hover:border-amber/50 rounded-lg px-3 py-1.5 transition-all duration-200 hover:shadow-glow-amber"
          >
            Reset layout
          </button>
          <UserMenu />
        </div>
      </div>

      <div id="grid-container">
        {breakpoint === "desktop" ? (
          <GridLayout
            className="layout"
            layout={items}
            cols={12}
            rowHeight={ROW_HEIGHT}
            width={width}
            margin={[20, 20]}
            draggableHandle=".widget-drag-handle"
            onLayoutChange={handleLayoutChange}
            compactType="vertical"
          >
            {items.map((item) => (
              <div key={item.i}>{WIDGET_FACTORY[item.i](() => removeWidget(item.i))}</div>
            ))}
          </GridLayout>
        ) : (
          // Phone/tablet: dragging and resizing a narrow multi-column grid on
          // a touchscreen is more frustrating than useful, so widgets just
          // stack in their stored reading order instead. Still uses each
          // widget's stored height so proportions roughly match the desktop
          // arrangement.
          <div className={breakpoint === "tablet" ? "grid grid-cols-2 gap-5" : "flex flex-col gap-5"}>
            {stackedItems.map((item) => {
              const px = stackedPixelHeight(item.h);
              const style = STACKED_FLEXIBLE_HEIGHT.has(item.i) ? { minHeight: px } : { height: px };
              return (
                <div key={item.i} style={style}>
                  {WIDGET_FACTORY[item.i](() => removeWidget(item.i))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
