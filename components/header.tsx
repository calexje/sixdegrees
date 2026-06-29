"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Mode = "daily" | "expert" | "practice" | "challenge";

export default function Header() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const mode: Mode =
    (searchParams.get("mode") as Mode) ?? "daily";

  function setMode(newMode: Mode) {
    // Switch modes cleanly: dropping any challenge params (from, to, via,
    // not_player, not_leagues) ensures "Create Challenge" opens the builder
    // rather than re-loading a challenge that is currently being solved.
    const params = new URLSearchParams();

    params.set("mode", newMode);

    router.push(`/?${params.toString()}`);
  }

  function buttonClass(active: boolean) {
    return [
      "px-3 py-1.5 text-sm rounded-md transition",
      active
        ? "bg-primary-500 text-black font-semibold shadow-sm"
        : "text-muted hover:text-foreground",
    ].join(" ");
  }

  const modes: { id: Mode; label: string }[] = [
    { id: "daily", label: "Daily" },
    { id: "expert", label: "Expert" },
    { id: "challenge", label: "Create" },
    { id: "practice", label: "Practice" },
  ];

  return (
    <header className="border-b border-border">
      <div className="max-w-xl lg:max-w-4xl mx-auto px-4 py-4 flex flex-col items-center gap-3">

        <div className="flex items-center gap-2">
          <span className="text-2xl">⚽</span>
          <span className="font-bold text-xl tracking-tight">
            Football Degrees
          </span>
        </div>

        <nav className="flex flex-wrap justify-center gap-1 rounded-lg bg-surface-100 dark:bg-surface-800 p-1">
          {modes.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={buttonClass(mode === m.id)}
            >
              {m.label}
            </button>
          ))}
        </nav>

      </div>
    </header>
  );
}