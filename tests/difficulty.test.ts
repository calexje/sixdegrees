import { describe, it, expect } from "vitest";
import {
  difficultyFor,
  DIFFICULTY_CLASS,
} from "../lib/difficulty";

describe("difficultyFor (moves)", () => {
  it("maps move counts to bands (upper-bound inclusive)", () => {
    expect(difficultyFor(2)).toBe("Basic");
    expect(difficultyFor(4)).toBe("Easy");
    expect(difficultyFor(6)).toBe("Medium");
    expect(difficultyFor(8)).toBe("Hard");
    expect(difficultyFor(10)).toBe("Expert");
    expect(difficultyFor(12)).toBe("Expert");
  });

  it("has a colour for every band", () => {
    for (const band of [
      "Basic",
      "Easy",
      "Medium",
      "Hard",
      "Expert",
    ] as const) {
      expect(DIFFICULTY_CLASS[band]).toBeTruthy();
    }
  });
});
