// Difficulty rating from the shortest-solution distance, measured in moves
// (graph edges). Moves between two players are always even (2, 4, 6, ...), so
// each band's upper bound is inclusive: 2 Basic, 4 Easy, 6 Medium, 8 Hard,
// 10+ Expert.
export type Difficulty =
  | "Basic"
  | "Easy"
  | "Medium"
  | "Hard"
  | "Expert";

export function difficultyFor(moves: number): Difficulty {
  if (moves <= 2) return "Basic";
  if (moves <= 4) return "Easy";
  if (moves <= 6) return "Medium";
  if (moves <= 8) return "Hard";
  return "Expert";
}

// Pill colours, drawn from the palette. on-* foregrounds are black except error.
export const DIFFICULTY_CLASS: Record<Difficulty, string> = {
  Basic: "bg-surface-300 text-surface-900",
  Easy: "bg-success-500 text-black",
  Medium: "bg-primary-500 text-black",
  Hard: "bg-warning-500 text-black",
  Expert: "bg-error-500 text-white",
};
