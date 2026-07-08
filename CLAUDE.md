# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install
npm run dev      # start dev server at http://localhost:3000
npm run build    # production build
npm run start    # run a production build
npm run lint     # next lint
```

There is no test suite configured in this repo (no test runner, no `*.test.*` files under app/components/lib).

Required env vars go in `.env.local` (no `.env.local.example` is currently present in the repo):

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` / `_AUTH_DOMAIN` / `_PROJECT_ID` / `_STORAGE_BUCKET` / `_MESSAGING_SENDER_ID` / `_APP_ID` | Firebase Web app config (`lib/firebaseClient.ts`), public by design. From Firebase Console → Project settings → General → Your apps. |
| `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` | Firebase Admin SDK service account (`lib/firebaseAdmin.ts`), server-only. From Firebase Console → Project settings → Service accounts → Generate new private key. `FIREBASE_PRIVATE_KEY` keeps its `\n` sequences escaped in the env file. |

The "Your usage limits" widget doesn't use an env var — it reads an OAuth token directly from the local Claude Code CLI's credentials file (see below), so it only shows real data when run on a machine where `claude` has been logged in.

`firebase-admin`'s dependency `jwks-rsa@4.x` pulls in `jose@6.x`, a pure-ESM package that `jwks-rsa` loads via a plain CJS `require()` — this crashes with `ERR_REQUIRE_ESM` on Netlify's Node runtime. `package.json` has an `overrides` entry pinning `jwks-rsa` to `^3.2.0` (which depends on the dual CJS/ESM `jose@4.x`) to work around it. Don't remove this override without confirming the underlying `jwks-rsa`/`jose` incompatibility has been fixed upstream.

## Architecture

This is a Next.js App Router dashboard of draggable/resizable widgets (`react-grid-layout`), gated behind Google sign-in via Firebase Authentication, where each widget's data persists per-user in Firestore instead of in `localStorage`.

### Auth and per-user persistence

- Sign-in is Google OAuth via Firebase Authentication, not NextAuth. `components/AuthProvider.tsx` wraps the app in a React context (`useAuth()`) backed by `onAuthStateChanged`; it exposes `status` (`"loading" | "authenticated" | "unauthenticated"`), `user`, `signInWithGoogle`, `signOutUser`, and `getIdToken`. `app/page.tsx` shows `LoginScreen` when unauthenticated and `DashboardGrid` when authenticated; there's no guest/anonymous mode.
- `lib/firebaseClient.ts` lazily initializes the Firebase Web SDK (`getFirebaseAuth()`) — deliberately lazy, because `getAuth()` validates config synchronously and `AuthProvider` wraps the root layout, so eager init would crash server-side rendering (and `next build`'s prerendering) whenever real Firebase config isn't present. Never call `getFirebaseAuth()`/`getAdminAuth()`/`getAdminDb()` at module scope — only from inside effects, event handlers, or request handlers.
- Every authenticated fetch to `/api/user-data` carries a Firebase ID token (`Authorization: Bearer <token>`, obtained via `getIdToken()`) instead of relying on a session cookie. `app/api/user-data/route.ts` verifies it server-side with `getAdminAuth().verifyIdToken()` (from `lib/firebaseAdmin.ts`) and uses the resulting Firebase `uid` as the storage key.
- Widget state (layout, todos, notes, events, pet, trips, assignments) is stored in Firestore per user, through a single endpoint: `app/api/user-data/route.ts` (GET/PUT with a `key` query param / body field). Keys are restricted to a fixed `ALLOWED_KEYS` allowlist — add new persisted keys there when a widget needs one.
- `lib/userStore.ts` reads/writes Firestore at `users/{uid}/data/{key}`, wrapping each value as `{ value }` since Firestore documents must be maps (several stored values, like `layout`, are bare arrays).
- On the client, `components/useUserStorage.ts` is the hook every widget uses instead of `useState` + `localStorage`: `useUserStorage<T>(key, defaultValue, legacyKey?)`. It fetches from `/api/user-data` on mount and PUTs on every change, attaching the ID token each time. `legacyKey` is a one-time migration path from an old `localStorage` key (from before this project stored data server-side) — pass it only when migrating an existing widget, not for new ones. `PetWidget` talks to `/api/user-data` directly (not through the hook) and follows the same token-attaching pattern.
- Widget data types live in `lib/types.ts` (e.g. `TodoItem`, `EventItem`, `TripItem`). Add new persisted shapes there.
- Firebase Auth's "Authorized domains" list (Console → Authentication → Settings) must include every origin sign-in is used from — `localhost` is included by default, but the Netlify domain needs to be added manually after deploying.

### Widget system

- `components/DashboardGrid.tsx` is the single source of truth for what widgets exist: `WIDGET_LABELS`, `WIDGET_DEFAULT_SIZE`, `DEFAULT_LAYOUT`, and `WIDGET_FACTORY` are all keyed by `WidgetId` (defined in `lib/types.ts`). Adding a new widget means: add the id to `WidgetId`, then add entries in all four of those maps/objects, then create the component under `components/widgets/`.
- Every widget is a `"use client"` component that renders itself inside the shared `WidgetCard` chrome (`components/WidgetCard.tsx`), which supplies the drag handle (`.widget-drag-handle`, referenced by `GridLayout`'s `draggableHandle`), corner brackets, title/eyebrow header, and the remove (✕) button. Widgets take an `onRemove?: () => void` prop and otherwise manage their own state/data fetching.
- Layout persistence (position/size) uses the same `useUserStorage` hook under the `"layout"` key, with `LEGACY_STORAGE_KEY` as its migration source from the pre-auth `localStorage`-only version of the app. "Save as default" / "Reset layout" write/read a separate `"defaultLayout"` key.
- The grid uses a 12-column layout with vertical compaction (`compactType="vertical"`); widget default sizes and `minW`/`minH` are tuned per widget in `WIDGET_DEFAULT_SIZE`.

### Server API routes (`app/api/*/route.ts`)

All routes are `export const dynamic = "force-dynamic"` since they're either user-scoped or poll live external state. Notable patterns to follow when adding similar routes:

- **`usage-limits/route.ts`**: calls Anthropic's *undocumented* `api/oauth/usage` endpoint using the local Claude Code CLI's OAuth token (via `lib/claudeAuth.ts`, which reads `~/.claude/.credentials.json` fresh on every call — it does not attempt to refresh tokens itself). Implements its own exponential backoff and last-known-good caching on `globalThis` (keyed by a `__usageLimitsCache__`-style global) to survive rate limits shared with other tools using the same login. Follow this cache-on-`globalThis` pattern for any other route that polls a rate-limited/undocumented external API. When it gets a genuinely live reading (only possible on the machine where `claude` is logged in — never on a deployed instance), it also mirrors that reading into Firestore under the caller's account (if a Firebase ID token was sent) so a deployed instance has something to fall back to.
- **`system/route.ts`**: samples CPU/RAM/network on background `setInterval`/`setTimeout` loops stored on `globalThis` (so Next.js dev's hot-reload doesn't spawn duplicate timers), and `GET` just reads the cache — this keeps the route safe to poll rapidly. Network stats shell out to PowerShell via `execFile` with an argv array (not a shell string) on Windows only.
- **`news/route.ts`**: simple pass-through/aggregation of the Hacker News public API, no auth or caching needed.
- **`user-data/route.ts`**: see Auth section above.
- **`sync-key/route.ts`** / **`sync-claude-usage/route.ts`**: see "Cross-device Claude usage sync" below.

When adding a new external-data widget, prefer this shape: a server route under `app/api/<name>/route.ts` that owns caching/backoff/auth concerns, and a client widget component that just polls it and renders `available`/`note`/loading states — don't call third-party or credential-gated APIs directly from client components.

### Cross-device Claude usage sync

Anthropic exposes no public API for a personal Claude Pro/Max account's usage percentage — it only exists via the undocumented endpoint above, authenticated with a local Claude Code session. To let the "Your usage limits" widget show real numbers on a machine other than the one running `claude` (e.g. a deployed instance, or a second computer), without ever having the server store anyone's actual Claude credentials:

- `lib/syncKeys.ts` issues opaque `gbx_`-prefixed keys and stores only their SHA-256 hash in a top-level `syncKeys/{hash}` Firestore collection (→ `{ uid, createdAt }`) — the same "hash what you verify, never store what you must reverse" pattern as a GitHub personal access token. Generating a new key for a user deletes their previous one (single live key per user).
- `POST /api/sync-key` (Firebase ID token required) issues a key for the signed-in user, called from the widget's "Sync from another device" panel.
- `POST /api/sync-claude-usage` (sync key required, via `resolveSyncKey`) is a deliberately narrow, separate endpoint from `/api/user-data` — it can only ever write the `claudeUsage` value, nothing else. A leaked sync key can at worst spoof fake usage numbers on that account, not touch todos/notes/layout.
- `public/sync-claude-usage.mjs` is a standalone, dependency-free Node script (served as a static file, so it's fetchable via `curl <site>/sync-claude-usage.mjs` without cloning the repo) that reads the local Claude Code session, calls the usage endpoint itself, and POSTs only the resulting numbers to `/api/sync-claude-usage` with the sync key — the actual Claude credential never leaves the machine it's read on. Keep this script dependency-free and copy-pasteable; don't make it import from `lib/`.
- The widget's polling (`UsageLimitsWidget.tsx`) tries live data first, then falls back to reading the mirrored/synced snapshot via `/api/user-data?key=claudeUsage`, marking it `stale` with an `asOf` timestamp either way (`UsageLimitsData` already has these fields for this purpose).

### Styling

Tailwind with a small custom dark theme defined in `tailwind.config.ts` (colors like `ink`, `surface`, `hairline`, `cyan`, `amber`, `good`, `warn`) and custom keyframe animations (`pulse-glow`, `scan`, `idle-bob`, `sleep-float`). Reuse these tokens rather than introducing new ad hoc colors — the whole UI (including `WidgetCard`'s corner-bracket/glow chrome) is built around this palette.

### Deployment

Configured for Netlify (`netlify.toml`, Node 20, `npm run build`; a site is already linked locally per `.netlify/state.json`). All the `NEXT_PUBLIC_FIREBASE_*` and `FIREBASE_*` env vars above must also be set in the Netlify site's environment variables (Site configuration → Environment variables) — they aren't read from `.env.local` in production.
