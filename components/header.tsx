"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useNav } from "./nav-context";
import HowToPlay from "./tutorial";
import { trackEvent } from "@/lib/analytics";

type Mode =
  | "daily"
  | "easy"
  | "expert"
  | "practice"
  | "challenge";

// Easy / Normal / Hard are all "the Daily" at a difficulty; they live behind the
// gear rather than as separate tabs. Hard is the old Expert.
const DAILY_FAMILY: Mode[] = ["daily", "easy", "expert"];

export default function Header() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlMode: Mode =
    (searchParams.get("mode") as Mode) ?? "daily";

  const [pendingMode, setPendingMode] =
    useState<Mode | null>(null);
  const activeMode = pendingMode ?? urlMode;

  const search = searchParams.toString();
  useEffect(() => {
    setPendingMode(null);
  }, [search]);

  const [isPending, startTransition] = useTransition();
  const { setPending } = useNav();
  useEffect(() => {
    setPending(isPending);
  }, [isPending, setPending]);

  const [gearOpen, setGearOpen] = useState(false);

  function setMode(newMode: Mode) {
    trackEvent("mode_selected", { mode: newMode });
    setPendingMode(newMode);
    setGearOpen(false);

    const params = new URLSearchParams();
    params.set("mode", newMode);
    startTransition(() => {
      router.push(`/?${params.toString()}`);
    });
  }

  function buttonClass(active: boolean) {
    return [
      "px-3 py-1.5 text-sm rounded-md transition",
      active
        ? "bg-primary-500 text-black font-semibold shadow-sm"
        : "text-muted hover:text-foreground",
    ].join(" ");
  }

  // The Daily tab stays highlighted across Easy/Normal/Hard.
  function isTabActive(id: Mode): boolean {
    return id === "daily"
      ? DAILY_FAMILY.includes(activeMode)
      : activeMode === id;
  }

  const modes: { id: Mode; label: string }[] = [
    { id: "daily", label: "Daily" },
    { id: "challenge", label: "Create" },
    { id: "practice", label: "Practice" },
  ];

  const difficulties: { id: Mode; label: string }[] = [
    { id: "easy", label: "Easy" },
    { id: "daily", label: "Normal" },
    { id: "expert", label: "Hard" },
  ];

  return (
    <header className="border-b border-border">
      <div className="max-w-xl lg:max-w-4xl mx-auto px-4 py-4 flex flex-col items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚽</span>
          <span className="font-bold text-xl tracking-tight">
            footylinks
          </span>
          <HowToPlay />
        </div>

        <nav className="flex items-center gap-1 rounded-lg bg-surface-100 dark:bg-surface-800 p-1">
          {modes.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={buttonClass(isTabActive(m.id))}
            >
              {m.label}
            </button>
          ))}

          {/* Difficulty gear: Easy / Normal / Hard for the Daily. */}
          <div className="relative">
            <button
              onClick={() => setGearOpen((o) => !o)}
              aria-label="Difficulty"
              aria-expanded={gearOpen}
              className={buttonClass(false)}
            >
              ⚙
            </button>

            {gearOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setGearOpen(false)}
                />
                <div className="absolute right-0 mt-1 z-50 w-36 rounded-lg border border-border bg-background shadow-lg p-1">
                  <p className="px-2 py-1 text-xs text-muted">
                    Daily difficulty
                  </p>
                  {difficulties.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setMode(d.id)}
                      className={`w-full text-left px-2 py-1.5 rounded-md text-sm transition ${
                        activeMode === d.id
                          ? "bg-primary-500 text-black font-semibold"
                          : "text-muted hover:text-foreground hover:bg-surface-100 dark:hover:bg-surface-800"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}