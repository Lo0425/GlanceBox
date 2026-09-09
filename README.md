# GlanceBox

A drag-and-drop, resizable dashboard built with Next.js (App Router) showing:

- **Clock** — live local time
- **Date** — today's date + progress through the year
- **Weather** — live temperature and conditions for your location (via browser geolocation), no API key needed
- **Your usage limits** — Claude Code's 5-hour / 7-day usage limits, plus To-do, Notes, Calendar, Pomodoro, System monitor, News, Calculator, Aquarium, and Trips widgets

Sign in with Google (via Firebase Authentication) to use the dashboard. Drag any widget by its header to rearrange it, or drag the bottom-right corner to resize. Your layout and widget data (todos, notes, etc.) are saved automatically to Firestore, scoped to your account. Click **Reset layout** to go back to the default arrangement.

## Important: about the "Your usage limits" widget

This reads your Claude Code session's 5-hour and 7-day usage limits from an **undocumented** endpoint that Claude Code / claude.ai itself uses internally — it isn't part of the public API and could change without notice. It works by reading the OAuth token from your local Claude Code CLI's credentials file (`~/.claude/.credentials.json`), so it only shows real data on a machine where you've logged in with `claude`. No API key or env var is needed for this widget; if no local session is found, or if the shared rate limit is hit, it shows a clearly-labeled unavailable/stale state instead.

## Getting started

```bash
npm install
# create .env.local with your Firebase config (see below)
npm run dev
```

Open http://localhost:3000.

### Environment variables (`.env.local`)

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` / `_AUTH_DOMAIN` / `_PROJECT_ID` / `_STORAGE_BUCKET` / `_MESSAGING_SENDER_ID` / `_APP_ID` | Yes | Firebase Web app config, from Firebase Console → Project settings → General → Your apps. Public by design. |
| `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` | Yes | Firebase Admin SDK service account, from Firebase Console → Project settings → Service accounts → Generate new private key. Server-only — used to verify sign-in tokens and read/write Firestore. |
| `NEXT_PUBLIC_DEFAULT_LAT` / `NEXT_PUBLIC_DEFAULT_LON` / `NEXT_PUBLIC_DEFAULT_CITY` | No | Fallback location for the Weather widget if geolocation is denied or unavailable. |

## Project structure

```
app/
  layout.tsx           Root layout
  page.tsx              Dashboard page (client component)
  globals.css           Theme tokens, dot-grid background, grid-layout overrides
  api/
    user-data/route.ts  Per-user widget data, verifies Firebase ID token, reads/writes Firestore
    usage-limits/route.ts  Claude Code usage limits (undocumented endpoint, local CLI OAuth token)
    system/route.ts     CPU/RAM/network stats
    news/route.ts       Hacker News headlines
components/
  AuthProvider.tsx      Firebase Auth context (useAuth: status, user, sign-in/out, ID token)
  LoginScreen.tsx        Google sign-in screen
  UserMenu.tsx           Signed-in user menu / sign-out
  DashboardGrid.tsx      react-grid-layout wiring + per-user persistence
  WidgetCard.tsx         Shared card chrome + drag handle
  useUserStorage.ts      Hook: persists widget state to Firestore via /api/user-data
  widgets/               One component per widget (Clock, Date, Weather, Todo, Notes, Aquarium, Trips, ...)
lib/
  firebaseClient.ts      Firebase Web SDK (lazy-initialized), used client-side
  firebaseAdmin.ts        Firebase Admin SDK (lazy-initialized), used server-side only
  userStore.ts            Firestore read/write for per-user widget data
  claudeAuth.ts            Reads local Claude Code CLI's OAuth token
  types.ts
  weatherCodes.ts          WMO weather code -> label/icon mapping
```

## Notes

- Weather comes from [Open-Meteo](https://open-meteo.com/) (free, no API key) plus a free reverse-geocoding lookup for the city name.
- Sign-in is Google via Firebase Authentication; per-user widget data lives in Firestore. The Admin SDK service account key never reaches the browser.
- Built on Next.js 15.5.19 (patched against the December 2025 React Server Components CVEs) — keep this dependency updated.
# PersonalDashboard
# PersonalDashboard
# PersonalDashboard
