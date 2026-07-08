#!/usr/bin/env node
// GlanceBox: local Claude Code usage sync.
//
// Reads your local Claude Code session (the same one `claude` itself uses)
// and reports your 5-hour / 7-day usage percentage to your GlanceBox
// account. Your Claude credentials are read locally and used locally to
// call Anthropic's usage API -- only the resulting percentages are sent to
// GlanceBox, never your token.
//
// Requires Node 18+ and either `claude login` or `claude setup-token` to
// have been run at least once on this machine.
//
// Usage:
//   GLANCEBOX_SYNC_KEY=gbx_xxxxx node sync-claude-usage.mjs
//
// Get a sync key from the "Your usage limits" widget in GlanceBox.

import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const SYNC_KEY = process.env.GLANCEBOX_SYNC_KEY;
const GLANCEBOX_URL = process.env.GLANCEBOX_URL || "https://glancebox.netlify.app";
const CREDENTIALS_PATH = join(homedir(), ".claude", ".credentials.json");
const USAGE_URL = "https://api.anthropic.com/api/oauth/usage";

if (!SYNC_KEY) {
  console.error('Missing GLANCEBOX_SYNC_KEY. Get one from the "Your usage limits" widget in GlanceBox, then run:');
  console.error("  GLANCEBOX_SYNC_KEY=gbx_xxxxx node sync-claude-usage.mjs");
  process.exit(1);
}

async function getClaudeAccessToken() {
  let raw;
  try {
    raw = await readFile(CREDENTIALS_PATH, "utf8");
  } catch {
    throw new Error(`No Claude Code credentials found at ${CREDENTIALS_PATH}. Run \`claude login\` first.`);
  }
  const parsed = JSON.parse(raw);
  const token = parsed?.claudeAiOauth?.accessToken;
  if (!token) throw new Error("No Claude Code session found. Run `claude login` or `claude setup-token` first.");
  return token;
}

async function fetchUsage(token) {
  const res = await fetch(USAGE_URL, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    throw new Error(
      res.status === 401
        ? "Your Claude Code session has expired. Run `claude login` again."
        : `Usage API request failed (${res.status}).`
    );
  }
  const json = await res.json();
  return {
    fiveHour: json.five_hour ? { percent: json.five_hour.utilization, resetsAt: json.five_hour.resets_at } : null,
    sevenDay: json.seven_day ? { percent: json.seven_day.utilization, resetsAt: json.seven_day.resets_at } : null,
  };
}

async function pushToGlanceBox(data) {
  const res = await fetch(`${GLANCEBOX_URL}/api/sync-claude-usage`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${SYNC_KEY}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Sync to GlanceBox failed (${res.status}). ${text}`.trim());
  }
}

async function main() {
  const token = await getClaudeAccessToken();
  const data = await fetchUsage(token);
  await pushToGlanceBox(data);
  console.log(
    `Synced to GlanceBox: current session ${data.fiveHour?.percent ?? "?"}% · weekly ${data.sevenDay?.percent ?? "?"}%`
  );
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
