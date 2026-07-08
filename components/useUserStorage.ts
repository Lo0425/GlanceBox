"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";

// Persists a value under the signed-in user's account (via /api/user-data)
// instead of the browser's localStorage, so it follows the user across
// devices. `legacyKey`, if given, is a one-time migration source: if the
// server has nothing yet for `key`, we fall back to that old localStorage
// key so existing data isn't lost when a widget switches over to this hook.
export function useUserStorage<T>(key: string, defaultValue: T, legacyKey?: string) {
  const { status, getIdToken } = useAuth();
  const [value, setValue] = useState<T | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;

    (async () => {
      try {
        const token = await getIdToken();
        const res = await fetch(`/api/user-data?key=${key}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const json = await res.json();
        if (cancelled) return;

        if (json.value !== null && json.value !== undefined) {
          loadedRef.current = true;
          setValue(json.value);
          return;
        }

        if (legacyKey) {
          const legacyRaw = window.localStorage.getItem(legacyKey);
          if (legacyRaw) {
            loadedRef.current = true;
            try {
              // Most widgets JSON-encoded their localStorage value, but at
              // least one (notes) stored a plain string -- if it's not
              // valid JSON, use the raw string as-is rather than discarding it.
              setValue(JSON.parse(legacyRaw));
            } catch {
              setValue(legacyRaw as unknown as T);
            }
            return;
          }
        }

        loadedRef.current = true;
        setValue(defaultValue);
      } catch {
        if (!cancelled) {
          loadedRef.current = true;
          setValue(defaultValue);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, key]);

  useEffect(() => {
    if (!loadedRef.current || value === null || status !== "authenticated") return;
    (async () => {
      const token = await getIdToken();
      fetch("/api/user-data", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ key, value }),
      }).catch(() => {});
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, key, status]);

  return [value, setValue] as const;
}
