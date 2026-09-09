// Widgets remount whenever DashboardGrid switches between the desktop grid
// and the mobile/tablet stacked layout (crossing the 640/1024px breakpoints
// swaps the wrapping component, which unmounts everything below it). Without
// this, every widget would reset to its loading/empty state and refetch,
// producing a visible gap where already-loaded data disappears. This cache
// is keyed on globalThis (same rationale as the usage-limits route's cache)
// so it survives that remount -- and React Fast Refresh in dev -- for the
// life of the page; a real reload starts fresh.
const g = globalThis as unknown as { __glanceboxClientCache__?: Map<string, unknown> };
const cache = (g.__glanceboxClientCache__ ??= new Map<string, unknown>());

export function getCached<T>(key: string): T | undefined {
  return cache.has(key) ? (cache.get(key) as T) : undefined;
}

export function setCached<T>(key: string, value: T): void {
  cache.set(key, value);
}
