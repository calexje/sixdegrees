"use client";

import { useEffect, useMemo, useState } from "react";
import { leagueName } from "@/lib/leagues";
import {
  difficultyFor,
  DIFFICULTY_CLASS,
} from "@/lib/difficulty";

type PlayerRef = {
  id: string;
  name: string;
};

type Validation = {
  loading: boolean;
  solvable: boolean;
  solutionDistance: number | null;
};

function PlayerSearch({
  label,
  optional,
  value,
  onChange,
}: {
  label: string;
  optional?: boolean;
  value: PlayerRef | null;
  onChange: (player: PlayerRef | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlayerRef[]>([]);

  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < 2) {
      setResults([]);
      return;
    }

    let active = true;

    const timer = setTimeout(async () => {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(trimmed)}`
      );

      const data: PlayerRef[] = await response.json();

      if (active) {
        setResults(data);
      }
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  return (
    <div className="mb-4">
      <label className="block text-sm font-semibold mb-1">
        {label}
        {optional && (
          <span className="text-muted font-normal">
            {" "}
            (optional)
          </span>
        )}
      </label>

      {value ? (
        <div className="flex items-center justify-between border border-border rounded-lg p-2">
          <span>{value.name}</span>
          <button
            onClick={() => {
              onChange(null);
              setQuery("");
              setResults([]);
            }}
            className="text-sm text-muted hover:text-foreground"
            aria-label={`Clear ${label}`}
          >
            ✕
          </button>
        </div>
      ) : (
        <div className="relative">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for a player..."
            className="w-full rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />

          {results.length > 0 && (
            <div className="absolute z-10 w-full rounded-lg border border-border bg-background shadow-lg max-h-60 overflow-auto divide-y divide-border">
              {results.map((player) => (
                <button
                  key={player.id}
                  onClick={() => {
                    onChange(player);
                    setQuery("");
                    setResults([]);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-surface-100 dark:hover:bg-surface-800 transition"
                >
                  {player.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ChallengeBuilder({
  leagues,
}: {
  leagues: string[];
}) {
  const [origin, setOrigin] = useState<PlayerRef | null>(null);
  const [target, setTarget] = useState<PlayerRef | null>(null);
  const [waypoint, setWaypoint] = useState<PlayerRef | null>(null);
  const [excluded, setExcluded] = useState<PlayerRef | null>(null);

  const [excludedLeagues, setExcludedLeagues] = useState<
    Set<string>
  >(new Set());

  const [validation, setValidation] =
    useState<Validation | null>(null);
  const [copied, setCopied] = useState(false);

  function toggleLeague(code: string) {
    setExcludedLeagues((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  }

  const shareUrl = useMemo(() => {
    if (!origin || !target) {
      return null;
    }

    const params = new URLSearchParams();
    params.set("mode", "challenge");
    params.set("from", origin.id);
    params.set("to", target.id);

    if (waypoint) {
      params.set("via", waypoint.id);
    }

    if (excluded) {
      params.set("not_player", excluded.id);
    }

    const notLeagues = [...excludedLeagues];
    if (notLeagues.length > 0) {
      params.set("not_leagues", notLeagues.sort().join(","));
    }

    return `/?${params.toString()}`;
  }, [origin, target, waypoint, excluded, excludedLeagues]);

  // Live solvability check, debounced.
  useEffect(() => {
    if (!shareUrl) {
      setValidation(null);
      return;
    }

    let active = true;
    setValidation((prev) =>
      prev
        ? { ...prev, loading: true }
        : { loading: true, solvable: false, solutionDistance: null }
    );

    const timer = setTimeout(async () => {
      const response = await fetch(
        `/api/challenge/validate${shareUrl.slice(1)}`
      );

      if (!response.ok) {
        if (active) {
          setValidation({
            loading: false,
            solvable: false,
            solutionDistance: null,
          });
        }
        return;
      }

      const data = await response.json();

      if (active) {
        setValidation({
          loading: false,
          solvable: data.solvable,
          solutionDistance: data.solutionDistance,
        });
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [shareUrl]);

  const warnings: string[] = [];

  if (origin && target && origin.id === target.id) {
    warnings.push("Origin and target are the same player.");
  }

  if (
    waypoint &&
    (waypoint.id === origin?.id || waypoint.id === target?.id)
  ) {
    warnings.push(
      "The required waypoint is the same as the origin or target."
    );
  }

  if (excluded) {
    if (
      excluded.id === origin?.id ||
      excluded.id === target?.id
    ) {
      warnings.push(
        "The excluded player is the origin or target."
      );
    }
    if (excluded.id === waypoint?.id) {
      warnings.push(
        "The excluded player is also the required waypoint."
      );
    }
  }

  async function copyLink() {
    if (!shareUrl) return;
    const absolute = `${window.location.origin}${shareUrl}`;
    await navigator.clipboard.writeText(absolute);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-xl mx-auto">
      <h2 className="text-2xl font-bold mb-2 text-center">
        Create a Challenge
      </h2>
      <p className="text-sm text-muted mb-6 text-center">
        Pick two players to connect, then share the link.
        Add optional constraints to make it harder.
      </p>

      <PlayerSearch
        label="Origin"
        value={origin}
        onChange={setOrigin}
      />

      <PlayerSearch
        label="Target"
        value={target}
        onChange={setTarget}
      />

      <PlayerSearch
        label="Required waypoint"
        optional
        value={waypoint}
        onChange={setWaypoint}
      />

      <PlayerSearch
        label="Excluded player"
        optional
        value={excluded}
        onChange={setExcluded}
      />

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold">
            Leagues
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setExcludedLeagues(new Set())}
              className="text-sm rounded-lg border border-border px-2 py-1 hover:bg-surface-100 dark:hover:bg-surface-800 transition"
            >
              Include all
            </button>
            <button
              onClick={() =>
                setExcludedLeagues(new Set(leagues))
              }
              className="text-sm rounded-lg border border-border px-2 py-1 hover:bg-surface-100 dark:hover:bg-surface-800 transition"
            >
              Exclude all
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {leagues.map((code) => {
            const included = !excludedLeagues.has(code);
            return (
              <label
                key={code}
                className="flex items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={included}
                  onChange={() => toggleLeague(code)}
                />
                {leagueName(code)}
              </label>
            );
          })}
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="border border-warning-500 rounded-lg p-3 mb-4 text-sm space-y-1">
          {warnings.map((warning, i) => (
            <p key={i}>⚠️ {warning}</p>
          ))}
        </div>
      )}

      {shareUrl && validation && !validation.loading && (
        <div className="mb-4 text-sm">
          {validation.solvable &&
          validation.solutionDistance !== null ? (
            <p className="flex items-center gap-2">
              <span>
                ✅ Solvable. Shortest solution:{" "}
                <strong>
                  {validation.solutionDistance}
                </strong>{" "}
                {validation.solutionDistance === 1
                  ? "move"
                  : "moves"}
                .
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-semibold ${DIFFICULTY_CLASS[difficultyFor(validation.solutionDistance)]}`}
              >
                {difficultyFor(validation.solutionDistance)}
              </span>
            </p>
          ) : (
            <p>
              ⚠️ No path exists with these constraints. You
              can still share it.
            </p>
          )}
        </div>
      )}

      {shareUrl ? (
        <div className="flex gap-2">
          <a
            href={shareUrl}
            className="px-4 py-2 rounded-lg bg-primary-500 text-black font-semibold hover:bg-primary-600 transition"
          >
            Play
          </a>
          <button
            onClick={copyLink}
            className="px-4 py-2 rounded-lg border border-border hover:bg-surface-100 dark:hover:bg-surface-800 transition"
          >
            {copied ? "Copied!" : "Copy link"}
          </button>
        </div>
      ) : (
        <p className="text-sm text-muted">
          Choose an origin and a target to generate a link.
        </p>
      )}
    </div>
  );
}
