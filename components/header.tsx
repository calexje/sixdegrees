"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Mode = "daily" | "practice" | "challenge";

export default function Header() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const mode: Mode =
    (searchParams.get("mode") as Mode) ?? "daily";

  function setMode(newMode: Mode) {
    const params = new URLSearchParams(searchParams.toString());

    params.set("mode", newMode);

    router.push(`/?${params.toString()}`);
  }

  function buttonClass(active: boolean) {
    return active
      ? "underline font-semibold"
      : "hover:underline";
  }

  return (
    <header className="border-b">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">

        <div className="flex items-center gap-2">
          <span className="text-2xl">⚽</span>

          <span className="font-bold text-xl">
            Football Degrees
          </span>
        </div>

        <nav className="hidden md:flex gap-6">
          <button
            onClick={() => setMode("daily")}
            className={buttonClass(mode === "daily")}
          >
            Daily Challenge
          </button>

          <button
            onClick={() => setMode("challenge")}
            className={buttonClass(mode === "challenge")}
          >
            Create Challenge
          </button>

          <button
            onClick={() => setMode("practice")}
            className={buttonClass(mode === "practice")}
          >
            Practice
          </button>
        </nav>

        <button className="text-2xl">
          ☰
        </button>

      </div>
    </header>
  );
}