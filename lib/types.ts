export type WidgetId =
  | "clock"
  | "date"
  | "weather"
  | "todo"
  | "calendar"
  | "notes"
  | "pomodoro"
  | "system"
  | "news"
  | "calculator"
  | "pet"
  | "usageLimits"
  | "trips";

export interface LayoutItem {
  i: WidgetId;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}

export interface WeatherData {
  temperatureC: number;
  weatherCode: number;
  isDay: boolean;
  city: string;
}

export interface TodoItem {
  id: string;
  text: string;
  done: boolean;
  archived?: boolean;
}

export interface EventItem {
  id: string;
  title: string;
  at: number;
}

export interface FlightLeg {
  id: string;
  from: string;
  to: string;
  date: string;
  departTime?: string;
  arriveTime?: string;
}

export interface TripItem {
  id: string;
  name: string;
  legs: FlightLeg[];
}

export interface AssignmentItem {
  id: string;
  title: string;
  subject: string;
  dueDate: string;
  done: boolean;
}

export interface SystemStats {
  cpuPercent: number | null;
  ramPercent: number | null;
  ramUsedGB: number | null;
  ramTotalGB: number | null;
  netKBps: number | null;
  netAvailable: boolean;
  note?: string;
}

export interface NewsItem {
  id: number;
  title: string;
  url: string;
  score: number;
  time: number;
}

export interface NewsData {
  available: boolean;
  items: NewsItem[];
  note?: string;
}

export interface UsageLimitWindow {
  percent: number;
  resetsAt: string | null;
}

export interface UsageLimitsData {
  available: boolean;
  fiveHour: UsageLimitWindow | null;
  sevenDay: UsageLimitWindow | null;
  note?: string;
  stale?: boolean;
  asOf?: string;
}
