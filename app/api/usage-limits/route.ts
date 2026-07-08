import { NextResponse } from "next/server";
import { getClaudeAccessToken } from "@/lib/claudeAuth";
import type { UsageLimitsData } from "@/lib/types";

export const dynamic = "force-dynamic";

// Undocumented endpoint used by Claude Code / claude.ai itself to render the
// "Your usage limits" panel. Confirmed working via manual test against a
// live OAuth token, but it isn't part of the public API -- it could change
// or disappear without notice. It also shares its rate-limit budget with
// every other consumer using the same OAuth token: Claude Code itself, and
// any other tool (e.g. a VS Code extension) polling the same endpoint. We
// can't control those other callers, so we back off hard on our own side.
const USAGE_URL = "https://api.anthropic.com/api/oauth/usage";

const BASE_INTERVAL_MS = 45_000;
const MAX_BACKOFF_MS = 10 * 60_000;

function unavailable(note: string): UsageLimitsData {
  return { available: false, fiveHour: null, sevenDay: null, note };
}

async function fetchFresh(): Promise<{ data: UsageLimitsData; rateLimited: boolean }> {
  const token = await getClaudeAccessToken();
  if (!token) {
    return {
      rateLimited: false,
      data: unavailable("No Claude Code session found. Log in with `claude` in a terminal, then reload."),
    };
  }

  try {
    const res = await fetch(USAGE_URL, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!res.ok) {
      if (res.status === 429) {
        // Anthropic has returned a Retry-After of "0" on this endpoint in
        // practice, which isn't a usable signal -- only surface it if it's
        // a genuinely positive number, and rely on our own backoff otherwise.
        const retryAfterHeader = res.headers.get("retry-after");
        const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : NaN;
        const retryNote =
          Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
            ? ` Anthropic says retry in ~${retryAfterSeconds}s;`
            : "";
        return {
          rateLimited: true,
          data: unavailable(
            `Rate limited by Anthropic's usage API.${retryNote} This endpoint's rate limit is shared with any other tool ` +
              "using the same Claude Code login (e.g. a VS Code extension polling it too) -- backing off automatically."
          ),
        };
      }
      return {
        rateLimited: false,
        data: unavailable(
          res.status === 401
            ? "Your Claude Code session has expired. Use `claude` in a terminal to refresh it, then reload."
            : `Usage API request failed (${res.status}).`
        ),
      };
    }

    const json = await res.json();
    return {
      rateLimited: false,
      data: {
        available: true,
        fiveHour: json.five_hour
          ? { percent: json.five_hour.utilization, resetsAt: json.five_hour.resets_at }
          : null,
        sevenDay: json.seven_day
          ? { percent: json.seven_day.utilization, resetsAt: json.seven_day.resets_at }
          : null,
      },
    };
  } catch {
    return { rateLimited: false, data: unavailable("Couldn't reach Anthropic's usage API.") };
  }
}

interface LastSuccess {
  data: UsageLimitsData;
  fetchedAt: number;
}

interface Cached {
  data: UsageLimitsData;
  nextAllowedAt: number;
  consecutiveFailures: number;
  lastSuccess: LastSuccess | null;
}

const globalKey = "__usageLimitsCache__";
const g = globalThis as unknown as Record<string, Cached | undefined>;

function ageLabel(fetchedAt: number, now: number): string {
  const minutes = Math.round((now - fetchedAt) / 60_000);
  return minutes <= 0 ? "under a minute ago" : `${minutes} min ago`;
}

export async function GET() {
  const now = Date.now();
  const cached = g[globalKey];

  if (cached && now < cached.nextAllowedAt) {
    return NextResponse.json(cached.data);
  }

  const { data, rateLimited } = await fetchFresh();
  const consecutiveFailures = rateLimited ? (cached?.consecutiveFailures ?? 0) + 1 : 0;
  const backoff = rateLimited
    ? Math.min(MAX_BACKOFF_MS, BASE_INTERVAL_MS * 2 ** consecutiveFailures)
    : BASE_INTERVAL_MS;

  let lastSuccess = cached?.lastSuccess ?? null;
  let responseData = data;

  if (data.available) {
    lastSuccess = { data, fetchedAt: now };
  } else if (lastSuccess) {
    // Rather than blank the widget out on every rate limit, keep showing the
    // last real numbers we got -- they're still a useful approximation for a
    // 5h/7d rolling window that doesn't move fast.
    responseData = {
      ...lastSuccess.data,
      stale: true,
      asOf: new Date(lastSuccess.fetchedAt).toISOString(),
      note: `${data.note} Showing numbers from ${ageLabel(lastSuccess.fetchedAt, now)}.`,
    };
  }

  g[globalKey] = { data: responseData, nextAllowedAt: now + backoff, consecutiveFailures, lastSuccess };
  return NextResponse.json(responseData);
}
