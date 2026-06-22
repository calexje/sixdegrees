"use client";

export default function Header() {
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
          <button className="hover:underline">
            Daily Challenge
          </button>

          <button className="hover:underline">
            Weekly Challenge
          </button>

          <button className="hover:underline">
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