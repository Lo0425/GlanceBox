"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

function StepHeader({ n, label }: { n: number; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-cyan/15 text-cyan text-[11px] font-mono shrink-0">
        {n}
      </span>
      <span className="text-sm text-ink font-display">{label}</span>
    </div>
  );
}

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="shrink-0 text-xs font-mono text-cyan hover:text-cyan/80 border border-cyan/30 hover:border-cyan/50 rounded px-2 py-1 transition-colors"
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}

const TERMINAL_HINT: Record<"windows" | "unix", string> = {
  windows: 'Press Win + X, then choose "Terminal" or "Windows PowerShell".',
  unix: 'macOS: press Cmd + Space, type "Terminal", press Enter. Linux: open your terminal app from the applications menu.',
};

export default function ClaudeSyncModal({
  onClose,
  onGenerate,
}: {
  onClose: () => void;
  onGenerate: () => Promise<string | null>;
}) {
  const [mounted, setMounted] = useState(false);
  const [key, setKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [platform, setPlatform] = useState<"windows" | "unix">("windows");
  const [showManual, setShowManual] = useState(false);
  const [autoCopied, setAutoCopied] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof navigator !== "undefined" && !/Win/i.test(navigator.platform || navigator.userAgent)) {
      setPlatform("unix");
    }
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const onceCommand = key
    ? `curl -O ${origin}/sync-claude-usage.mjs && GLANCEBOX_SYNC_KEY=${key} node sync-claude-usage.mjs`
    : "";

  const foreverCommandWindows = key
    ? [
        `$key = "${key}"`,
        `$dir = "$env:USERPROFILE\\GlanceBoxSync"`,
        `New-Item -ItemType Directory -Force -Path $dir | Out-Null`,
        `Invoke-WebRequest -Uri "${origin}/sync-claude-usage.mjs" -OutFile "$dir\\sync-claude-usage.mjs"`,
        `$action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c set GLANCEBOX_SYNC_KEY=$key&& node \`"$dir\\sync-claude-usage.mjs\`" >> \`"$dir\\sync-log.txt\`" 2>&1"`,
        `$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 15) -RepetitionDuration (New-TimeSpan -Days 3650)`,
        `Register-ScheduledTask -TaskName "GlanceBoxClaudeUsageSync" -Action $action -Trigger $trigger -Force`,
      ].join("\n")
    : "";

  const foreverCommandUnix = key
    ? `mkdir -p ~/glancebox-sync && curl -s -o ~/glancebox-sync/sync-claude-usage.mjs ${origin}/sync-claude-usage.mjs && (crontab -l 2>/dev/null; echo "*/15 * * * * GLANCEBOX_SYNC_KEY=${key} node ~/glancebox-sync/sync-claude-usage.mjs >> ~/glancebox-sync/sync-log.txt 2>&1") | crontab -`
    : "";

  const foreverCommand = platform === "windows" ? foreverCommandWindows : foreverCommandUnix;

  // Best-effort: copy the command the moment it's ready to read, so opening a
  // terminal and pasting is the only manual step left. Browsers can refuse a
  // clipboard write outside a direct user gesture (Safari especially) -- if
  // so this just silently no-ops and the visible Copy button still works.
  useEffect(() => {
    if (!foreverCommand || typeof navigator === "undefined" || !navigator.clipboard) return;
    setAutoCopied(false);
    navigator.clipboard.writeText(foreverCommand).then(
      () => setAutoCopied(true),
      () => setAutoCopied(false)
    );
  }, [foreverCommand]);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    const result = await onGenerate();
    if (result) setKey(result);
    else setError("Couldn't generate a sync key. Please try again.");
    setGenerating(false);
  }

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-hairline bg-surface shadow-glow-cyan p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-1">
          <div className="text-[11px] tracking-[0.2em] uppercase text-faint font-mono">Claude Code session</div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-faint hover:text-warn leading-none text-lg -mt-1 -mr-1 px-1"
          >
            ✕
          </button>
        </div>
        <h2 className="text-xl font-display font-bold text-ink mb-1.5">Sync from another device</h2>
        <p className="text-sm text-muted mb-6 leading-snug">
          Show your real Claude Code usage on this dashboard from any machine where you&apos;re logged in with{" "}
          <code className="text-ink">claude</code>. Your Claude credentials never leave that machine — only the
          usage numbers are sent here.
        </p>

        <div className="mb-6">
          <StepHeader n={1} label="Generate a personal sync key" />
          <div className="pl-7">
            {!key && (
              <>
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="text-sm font-mono text-ink bg-surfaceRaised border border-hairline hover:border-cyan/50 rounded-lg px-4 py-2 transition-all duration-200 hover:shadow-glow-cyan disabled:opacity-40"
                >
                  {generating ? "Generating…" : "Generate sync key"}
                </button>
                {error && <p className="mt-2 text-xs text-warn">{error}</p>}
              </>
            )}
            {key && (
              <>
                <p className="text-xs text-warn mb-2">
                  Save this now — it won&apos;t be shown again. Generating a new key retires this one.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 min-w-0 truncate rounded bg-base px-3 py-2 text-sm text-ink">{key}</code>
                  <CopyButton text={key} />
                </div>
              </>
            )}
          </div>
        </div>

        {key && (
          <>
            <div className="mb-6">
              <StepHeader n={2} label="Choose your operating system" />
              <div className="pl-7 flex gap-2">
                <button
                  onClick={() => setPlatform("windows")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider border transition-colors ${
                    platform === "windows"
                      ? "border-cyan/50 bg-cyan/10 text-cyan"
                      : "border-hairline text-faint hover:text-ink"
                  }`}
                >
                  Windows
                </button>
                <button
                  onClick={() => setPlatform("unix")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider border transition-colors ${
                    platform === "unix"
                      ? "border-cyan/50 bg-cyan/10 text-cyan"
                      : "border-hairline text-faint hover:text-ink"
                  }`}
                >
                  macOS / Linux
                </button>
              </div>
            </div>

            <div className="mb-5">
              <StepHeader n={3} label="Open a terminal and paste this" />
              <div className="pl-7">
                <p className="text-xs text-faint mb-1 leading-snug">
                  Sets up a recurring {platform === "windows" ? "Task Scheduler job" : "cron job"} that keeps syncing
                  every 15 minutes, forever — no terminal needs to stay open, and it survives restarts.
                </p>
                <p className="text-xs text-cyan/80 mb-2 leading-snug">{TERMINAL_HINT[platform]}</p>
                <div className="flex items-start gap-2">
                  <pre className="flex-1 min-w-0 whitespace-pre-wrap break-all rounded bg-base px-3 py-2 text-[11px] font-mono text-ink leading-relaxed">
                    {foreverCommand}
                  </pre>
                  <CopyButton text={foreverCommand} />
                </div>
                <p className="text-[11px] text-faint mt-1.5">
                  {autoCopied ? "✓ Already copied to your clipboard — just paste it." : "Click Copy, then paste it in."}
                </p>
              </div>
            </div>

            <div className="pl-7">
              <button
                onClick={() => setShowManual((v) => !v)}
                className="text-xs font-mono text-faint hover:text-ink transition-colors"
              >
                {showManual ? "Hide manual option" : "Prefer to sync manually instead? →"}
              </button>
              {showManual && (
                <div className="mt-2">
                  <p className="text-xs text-faint mb-2">Run this whenever you want a one-off fresh reading:</p>
                  <div className="flex items-start gap-2">
                    <code className="flex-1 min-w-0 break-all rounded bg-base px-3 py-2 text-[11px] font-mono text-ink">
                      {onceCommand}
                    </code>
                    <CopyButton text={onceCommand} />
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="text-sm font-mono text-faint hover:text-cyan border border-hairline hover:border-cyan/50 rounded-lg px-4 py-1.5 transition-all duration-200"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
