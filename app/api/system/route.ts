import { NextResponse } from "next/server";
import os from "os";
import { execFile } from "child_process";
import type { SystemStats } from "@/lib/types";

export const dynamic = "force-dynamic";

const CPU_SAMPLE_INTERVAL_MS = 500;
const NETWORK_SAMPLE_INTERVAL_MS = 2000;

function cpuSample() {
  return os
    .cpus()
    .map((c) => ({ ...c.times, total: c.times.user + c.times.nice + c.times.sys + c.times.idle + c.times.irq }));
}

// execFile with an argv array (no shell) avoids cmd.exe's quote-mangling of
// the nested PowerShell script that exec() with a single command string hits.
function execFileAsync(file: string, args: string[], timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(file, args, { timeout: timeoutMs }, (err, stdout) => {
      if (err) reject(err);
      else resolve(stdout.toString().trim());
    });
  });
}

async function networkTotalBytes(): Promise<number | null> {
  if (process.platform !== "win32") return null;
  try {
    // powershell.exe startup itself takes ~1.5-3s; this must never run on
    // the request path, only in the background sampler below.
    const out = await execFileAsync(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        "(Get-NetAdapterStatistics | ForEach-Object { $_.ReceivedBytes + $_.SentBytes } | Measure-Object -Sum).Sum",
      ],
      5000
    );
    const bytes = Number(out);
    return Number.isFinite(bytes) ? bytes : null;
  } catch {
    return null;
  }
}

// GET just reads this cache, so the route responds in microseconds and can
// safely be polled as fast as the client wants (e.g. every 100ms). Actual
// measurements happen on their own background timers, decoupled from
// request rate. Stored on globalThis so Next.js dev's module hot-reload
// doesn't spawn a second set of timers on top of the first.
type SystemCache = {
  stats: SystemStats;
  lastCpuSample: ReturnType<typeof cpuSample> | null;
  prevNet: { bytes: number; at: number } | null;
};

const globalKey = "__systemStatsCache__";
const g = globalThis as unknown as Record<string, SystemCache | undefined>;

if (!g[globalKey]) {
  g[globalKey] = {
    stats: {
      cpuPercent: null,
      ramPercent: null,
      ramUsedGB: null,
      ramTotalGB: null,
      netKBps: null,
      netAvailable: process.platform === "win32",
    },
    lastCpuSample: null,
    prevNet: null,
  };

  const cache = g[globalKey]!;

  setInterval(() => {
    const sample = cpuSample();
    if (cache.lastCpuSample) {
      let idleDiff = 0;
      let totalDiff = 0;
      for (let i = 0; i < sample.length; i++) {
        idleDiff += sample[i].idle - cache.lastCpuSample[i].idle;
        totalDiff += sample[i].total - cache.lastCpuSample[i].total;
      }
      if (totalDiff > 0) {
        cache.stats.cpuPercent = Math.max(0, Math.min(100, 100 * (1 - idleDiff / totalDiff)));
      }
    }
    cache.lastCpuSample = sample;

    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    cache.stats.ramPercent = totalMem > 0 ? (usedMem / totalMem) * 100 : null;
    cache.stats.ramUsedGB = usedMem / 1024 ** 3;
    cache.stats.ramTotalGB = totalMem / 1024 ** 3;
  }, CPU_SAMPLE_INTERVAL_MS);

  (async function pollNetwork() {
    const totalBytes = await networkTotalBytes();
    const now = Date.now();

    if (totalBytes !== null) {
      if (cache.prevNet) {
        const deltaBytes = totalBytes - cache.prevNet.bytes;
        const deltaSeconds = (now - cache.prevNet.at) / 1000;
        if (deltaSeconds > 0 && deltaBytes >= 0) {
          cache.stats.netKBps = deltaBytes / 1024 / deltaSeconds;
        }
      }
      cache.prevNet = { bytes: totalBytes, at: now };
      cache.stats.netAvailable = true;
      cache.stats.note = undefined;
    } else {
      cache.stats.netAvailable = false;
      cache.stats.note = "Network speed isn't available on this platform.";
    }

    setTimeout(pollNetwork, NETWORK_SAMPLE_INTERVAL_MS);
  })();
}

export async function GET() {
  const cache = g[globalKey]!;
  return NextResponse.json(cache.stats);
}
