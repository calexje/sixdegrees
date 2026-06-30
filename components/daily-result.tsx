"use client";

import { useEffect, useState } from "react";
import { loadStats } from "@/lib/stats";

function msToNextUtcMidnight(): number {
  const now = new Date();
  const next = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1
  );
  return next - now.getTime();
}

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

// Shown when today's Daily is already complete: a summary + a countdown to the
// next puzzle, instead of a replayable board.
export default function DailyResult({
  puzzleNumber,
  origin,
  target,
  moves,
  hints,
}: {
  puzzleNumber?: number;
  origin: string;
  target: string;
  moves: number;
  hints: number;
}) {
  const [stats, setStats] = useState<{
    gamesPlayed: number;
    currentStreak: number;
  } | null>(null);
  const [remaining, setRemaining] = useState<
    number | null
  >(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setStats(loadStats());
    setRemaining(msToNextUtcMidnight());
    const id = setInterval(
      () => setRemaining(msToNextUtcMidnight()),
      1000
    );
    return () => clearInterval(id);
  }, []);

  async function copy() {
    const hintText =
      hints > 0
        ? ` with ${hints} hint${hints === 1 ? "" : "s"}`
        : "";
    const text =
      `I solved footylinks${puzzleNumber ? ` #${puzzleNumber}` : ""} (${origin} → ${target}) in ${moves} moves${hintText}!\n${window.location.href}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <div className="max-w-md mx-auto text-center">
      <h2 className="text-2xl font-bold mb-1">
        footylinks
        {puzzleNumber ? ` #${puzzleNumber}` : ""}
      </h2>
      <p className="text-lg mb-4 font-semibold text-primary-700 dark:text-primary-400">
        ✅ Solved
      </p>

      <p className="mb-2">
        You connected <strong>{origin}</strong> to{" "}
        <strong>{target}</strong> in{" "}
        <strong>{moves}</strong> moves
        {hints > 0
          ? ` with ${hints} hint${hints === 1 ? "" : "s"}`
          : ""}
        .
      </p>

      {stats && (
        <p className="text-sm text-muted mb-4">
          Streak {stats.currentStreak} · Played{" "}
          {stats.gamesPlayed}
        </p>
      )}

      <div className="border border-border rounded-lg p-4 mb-4">
        <p className="text-sm text-muted">
          Next Daily in
        </p>
        <p className="text-2xl font-bold tabular-nums">
          {remaining === null
            ? "—"
            : formatCountdown(remaining)}
        </p>
      </div>

      <button
        onClick={copy}
        className="px-4 py-2 rounded-lg bg-primary-500 text-black font-semibold hover:bg-primary-600 transition"
      >
        {copied ? "Copied!" : "Copy results"}
      </button>

      <p className="text-xs text-muted mt-4">
        Come back tomorrow, or try Expert, Practice or
        Create a Challenge.
      </p>
    </div>
  );
}
