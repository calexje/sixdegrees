import { describe, it, expect } from "vitest";
import { formatSeason } from "../lib/format";

describe("formatSeason", () => {
  it("strips the float suffix", () => {
    expect(formatSeason("2003.0")).toBe("2003");
  });

  it("leaves a plain year alone", () => {
    expect(formatSeason("1999")).toBe("1999");
  });
});
