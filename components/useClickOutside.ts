"use client";

import { useEffect, type RefObject } from "react";

// Closes a dropdown/panel when the user clicks anywhere outside `ref`. Shared
// by DashboardGrid's "+ Add widget" and theme pickers, which otherwise had to
// duplicate this exact mousedown-listener effect.
export function useClickOutside(ref: RefObject<HTMLElement | null>, onOutside: () => void, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [enabled, onOutside, ref]);
}
