"use client";

import { useEffect, useState } from "react";
import WidgetCard from "@/components/WidgetCard";
import { weatherIcon, weatherLabel } from "@/lib/weatherCodes";
import type { WeatherData } from "@/lib/types";

const DEFAULT_LAT = Number(process.env.NEXT_PUBLIC_DEFAULT_LAT ?? 1.4927);
const DEFAULT_LON = Number(process.env.NEXT_PUBLIC_DEFAULT_LON ?? 103.7414);
const DEFAULT_CITY = process.env.NEXT_PUBLIC_DEFAULT_CITY ?? "Current Location";

function Icon({ kind }: { kind: ReturnType<typeof weatherIcon> }) {
  const common = "w-10 h-10 text-amber";
  switch (kind) {
    case "sun":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common} stroke="currentColor" strokeWidth="1.6">
          <circle cx="12" cy="12" r="4.2" />
          <path strokeLinecap="round" d="M12 2.5v2.4M12 19.1v2.4M4.2 4.2l1.7 1.7M18.1 18.1l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.2 19.8l1.7-1.7M18.1 5.9l1.7-1.7" />
        </svg>
      );
    case "moon":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common} stroke="currentColor" strokeWidth="1.6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5Z" />
        </svg>
      );
    case "cloud-sun":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common} stroke="currentColor" strokeWidth="1.6">
          <circle cx="9" cy="9" r="3.2" />
          <path strokeLinecap="round" d="M9 3.2v1.4M9 12.8v1.2M3.8 9h1.3M13.9 9h1.2M5.4 5.4l.9.9M11.7 5.4l-.9.9" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 18.5h9.2a3.3 3.3 0 0 0 .5-6.6 4.6 4.6 0 0 0-8.7-1.4A3.6 3.6 0 0 0 8 18.5Z" />
        </svg>
      );
    case "cloud":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common} stroke="currentColor" strokeWidth="1.6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 18.5h10.9a3.6 3.6 0 0 0 .4-7.2 5 5 0 0 0-9.6-1.7A4 4 0 0 0 6.5 18.5Z" />
        </svg>
      );
    case "rain":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common} stroke="currentColor" strokeWidth="1.6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 14.8h10.2a3.4 3.4 0 0 0 .4-6.8 4.7 4.7 0 0 0-9-1.6A3.8 3.8 0 0 0 6.5 14.8Z" />
          <path strokeLinecap="round" d="M8.5 18.2 7.6 20M12 18.2l-.9 1.8M15.5 18.2l-.9 1.8" />
        </svg>
      );
    case "snow":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common} stroke="currentColor" strokeWidth="1.6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 14.8h10.2a3.4 3.4 0 0 0 .4-6.8 4.7 4.7 0 0 0-9-1.6A3.8 3.8 0 0 0 6.5 14.8Z" />
          <path strokeLinecap="round" d="M9 18.5v2.2M9 18.5l-1.4 1.1M9 18.5l1.4 1.1M15 18.5v2.2M15 18.5l-1.4 1.1M15 18.5l1.4 1.1" />
        </svg>
      );
    case "storm":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common} stroke="currentColor" strokeWidth="1.6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 13.8h10.2a3.4 3.4 0 0 0 .4-6.8 4.7 4.7 0 0 0-9-1.6A3.8 3.8 0 0 0 6.5 13.8Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="m13 14-2.6 4h2.2L11 21.8l4-5h-2.4Z" />
        </svg>
      );
    case "fog":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common} stroke="currentColor" strokeWidth="1.6">
          <path strokeLinecap="round" d="M4.5 10.5h11M4.5 14h15M4.5 17.5h9" />
        </svg>
      );
  }
}

export default function WeatherWidget({ onRemove }: { onRemove?: () => void }) {
  const [data, setData] = useState<WeatherData | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;

    async function loadFor(lat: number, lon: number, fallbackCity: string) {
      try {
        const [weatherRes, cityRes] = await Promise.allSettled([
          fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day&timezone=auto`
          ),
          fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`),
        ]);

        if (cancelled) return;

        if (weatherRes.status !== "fulfilled" || !weatherRes.value.ok) {
          setStatus("error");
          return;
        }
        const weatherJson = await weatherRes.value.json();

        let city = fallbackCity;
        if (cityRes.status === "fulfilled" && cityRes.value.ok) {
          const cityJson = await cityRes.value.json();
          city = cityJson.city || cityJson.locality || fallbackCity;
        }

        setData({
          temperatureC: weatherJson.current.temperature_2m,
          weatherCode: weatherJson.current.weather_code,
          isDay: weatherJson.current.is_day === 1,
          city,
        });
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => loadFor(pos.coords.latitude, pos.coords.longitude, DEFAULT_CITY),
        () => loadFor(DEFAULT_LAT, DEFAULT_LON, DEFAULT_CITY),
        { timeout: 6000 }
      );
    } else {
      loadFor(DEFAULT_LAT, DEFAULT_LON, DEFAULT_CITY);
    }

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <WidgetCard eyebrow={data?.city ?? "Locating…"} title="Weather" onRemove={onRemove}>
      <div className="h-full flex items-center justify-between">
        {status === "loading" && (
          <div className="text-sm text-muted font-mono">Fetching conditions…</div>
        )}
        {status === "error" && (
          <div className="text-sm text-warn font-mono">Couldn&apos;t load weather.</div>
        )}
        {status === "ready" && data && (
          <>
            <div>
              <div className="text-4xl font-display font-medium text-ink">
                {Math.round(data.temperatureC)}
                <span className="text-amber">°</span>
              </div>
              <div className="text-xs text-muted mt-1">{weatherLabel(data.weatherCode)}</div>
            </div>
            <Icon kind={weatherIcon(data.weatherCode, data.isDay)} />
          </>
        )}
      </div>
    </WidgetCard>
  );
}
