"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import GridLayout, { Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import type { LayoutItem, WidgetId } from "@/lib/types";
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
import PetWidget from "@/components/widgets/PetWidget";
import UsageLimitsWidget from "@/components/widgets/UsageLimitsWidget";
import TripsWidget from "@/components/widgets/TripsWidget";
import UserMenu from "@/components/UserMenu";
import { useUserStorage } from "@/components/useUserStorage";

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
  pet: "Virtual pet",
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
  pet: { w: 5, h: 8, minW: 4, minH: 7 },
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
  pet: (onRemove) => <PetWidget onRemove={onRemove} />,
  usageLimits: (onRemove) => <UsageLimitsWidget onRemove={onRemove} />,
  trips: (onRemove) => <TripsWidget onRemove={onRemove} />,
};

export default function DashboardGrid() {
  const { user } = useAuth();
  const [layout, setLayout] = useUserStorage<LayoutItem[]>("layout", DEFAULT_LAYOUT, LEGACY_STORAGE_KEY);
  const [savedDefault, setSavedDefault] = useUserStorage<LayoutItem[] | null>("defaultLayout", null);
  const [justSaved, setJustSaved] = useState(false);
  const [width, setWidth] = useState(1200);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const dashboardTitle = user?.name ? `${user.name}'s Dashboard` : "Dashboard";

  useEffect(() => {
    const update = () => setWidth(document.getElementById("grid-container")?.clientWidth ?? 1200);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    if (!pickerOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [pickerOpen]);

  const items = useMemo(() => layout ?? DEFAULT_LAYOUT, [layout]);

  const handleLayoutChange = (next: Layout[]) => {
    setLayout(next as LayoutItem[]);
  };

  const resetLayout = () => {
    setLayout(savedDefault ?? DEFAULT_LAYOUT);
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
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-cyan animate-pulse-glow" />
            </span>
            <div className="text-[11px] tracking-[0.2em] uppercase text-faint font-mono">
              GlanceBox <span className="text-cyan/70">// live</span>
            </div>
          </div>
          <h1 className="text-2xl font-display font-bold bg-gradient-to-r from-ink via-ink to-cyan/80 bg-clip-text text-transparent">
            {dashboardTitle}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative" ref={pickerRef}>
            <button
              onClick={() => setPickerOpen((v) => !v)}
              className="text-xs font-mono text-muted hover:text-cyan border border-hairline hover:border-cyan/50 rounded-lg px-3 py-1.5 transition-all duration-200 hover:shadow-glow-cyan"
            >
              + Add widget
            </button>
            {pickerOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-lg border border-hairline bg-surface/95 backdrop-blur-md shadow-glow-cyan overflow-hidden z-10">
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
        <GridLayout
          className="layout"
          layout={items}
          cols={12}
          rowHeight={32}
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
      </div>
    </div>
  );
}
