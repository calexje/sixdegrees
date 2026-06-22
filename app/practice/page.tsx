"use client";

import { useEffect, useState } from "react";
import Game from "@/components/game";

type Puzzle = {
  origin: string;
  target: string;
};

export default function PracticePage() {
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [date, setDate] = useState<string>("");

  useEffect(() => {
    async function load() {
      const url =
        date.length > 0
          ? `/api/practice?date=${date}`
          : "/api/practice";

      const res = await fetch(url);
      const data = await res.json();

      setPuzzle(data);
    }

    load();
  }, [date]);

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">
        Practice Mode
      </h1>

      <p className="mb-4 text-sm text-gray-500">
        Try any daily puzzle by date or generate a random one.
      </p>

      <input
        type="date"
        className="border p-2 mb-6"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />

      {puzzle && (
        <Game
          origin={puzzle.origin}
          target={puzzle.target}
        />
      )}
    </div>
  );
}