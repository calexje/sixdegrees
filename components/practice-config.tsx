"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useNav } from "./nav-context";
import { leagueName } from "@/lib/leagues";
import { OBSCURITY_LABELS } from "@/lib/prominence";

export default function PracticeConfig({
  leagues,
  bounds,
  current,
}: {
  leagues: string[];
  bounds: { min: number; max: number };
  current: {
    leagues: string[];
    seasonFrom?: number;
    seasonTo?: number;
    obscurity: number;
  };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setPending } = useNav();
  const [isPending, startTransition] = useTransition();
  useEffect(() => {
    setPending(isPending);
  }, [isPending, setPending]);

  // No leagues in the URL means "all".
  const [selected, setSelected] = useState<Set<string>>(
    () =>
      new Set(
        current.leagues.length ? current.leagues : leagues
      )
  );
  const [from, setFrom] = useState(
    current.seasonFrom ?? bounds.min
  );
  const [to, setTo] = useState(current.seasonTo ?? bounds.max);
  const [obscurity, setObscurity] = useState(
    current.obscurity
  );

  function toggle(code: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function buildUrl() {
    const params = new URLSearchParams();
    params.set("mode", "practice");
    // Omit when all leagues are selected (the default).
    if (selected.size > 0 && selected.size < leagues.length) {
      params.set("leagues", [...selected].sort().join(","));
    }
    if (from > bounds.min) params.set("from_season", String(from));
    if (to < bounds.max) params.set("to_season", String(to));
    if (obscurity !== 5) {
      params.set("obscurity", String(obscurity));
    }
    return `/?${params.toString()}`;
  }

  function newPuzzle() {
    const url = buildUrl();
    const currentUrl = `/?${searchParams.toString()}`;
    startTransition(() => {
      // Same filters → just regenerate; changed → navigate.
      if (url === currentUrl) router.refresh();
      else router.push(url);
    });
  }

  const noLeagues = selected.size === 0;

  return (
    <div className="border border-border rounded-lg p-4 mb-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Practice setup</h3>
        <button
          onClick={newPuzzle}
          disabled={noLeagues || isPending}
          className="px-4 py-2 rounded-lg bg-primary-500 text-black font-semibold hover:bg-primary-600 transition disabled:opacity-50"
        >
          New puzzle
        </button>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold">Leagues</span>
          <div className="flex gap-2">
            <button
              onClick={() => setSelected(new Set(leagues))}
              className="text-xs rounded-lg border border-border px-2 py-1 hover:bg-surface-100 dark:hover:bg-surface-800"
            >
              All
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="text-xs rounded-lg border border-border px-2 py-1 hover:bg-surface-100 dark:hover:bg-surface-800"
            >
              None
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {leagues.map((code) => (
            <label
              key={code}
              className="flex items-center gap-2 text-sm"
            >
              <input
                type="checkbox"
                className="accent-primary-500"
                checked={selected.has(code)}
                onChange={() => toggle(code)}
              />
              {leagueName(code)}
            </label>
          ))}
        </div>
        {noLeagues && (
          <p className="text-xs text-warning-500 mt-1">
            Select at least one league.
          </p>
        )}
      </div>

      <div>
        <span className="text-sm font-semibold">Seasons</span>
        <div className="flex items-center gap-2 mt-1 text-sm">
          <input
            type="number"
            min={bounds.min}
            max={bounds.max}
            value={from}
            onChange={(e) => setFrom(Number(e.target.value))}
            className="w-24 rounded-lg border border-border bg-background px-2 py-1"
          />
          <span className="text-muted">to</span>
          <input
            type="number"
            min={bounds.min}
            max={bounds.max}
            value={to}
            onChange={(e) => setTo(Number(e.target.value))}
            className="w-24 rounded-lg border border-border bg-background px-2 py-1"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">
            Obscurity
          </span>
          <span className="text-xs text-muted">
            {obscurity} · {OBSCURITY_LABELS[obscurity]}
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={5}
          step={1}
          value={obscurity}
          onChange={(e) => setObscurity(Number(e.target.value))}
          className="w-full mt-1 accent-primary-500"
        />
      </div>
    </div>
  );
}
