import { describe, it, expect } from "vitest";
import { formatSeason, formatTenure } from "../lib/format";

describe("formatSeason", () => {
  it("strips the float suffix", () => {
    expect(formatSeason("2003.0")).toBe("2003");
  });

  it("leaves a plain year alone", () => {
    expect(formatSeason("1999")).toBe("1999");
  });
});

describe("formatTenure", () => {
  it("returns empty for no years", () => {
    expect(formatTenure([])).toBe("");
  });

  it("shows a single year bare", () => {
    expect(formatTenure([2007])).toBe("2007");
  });

  it("shows one continuous spell as a range", () => {
    expect(formatTenure([2002, 2003, 2004, 2005])).toBe("2002–2005");
  });

  it("splits two spells at the gap (Robbie Fowler at Liverpool)", () => {
    expect(
      formatTenure([
        1992, 1993, 1994, 1995, 1996, 1997, 1998, 1999, 2000, 2001, 2005,
        2006,
      ])
    ).toBe("1992–2001, 2005–2006");
  });

  it("handles a single-year spell after a gap", () => {
    expect(formatTenure([2010, 2011, 2015])).toBe("2010–2011, 2015");
  });

  it("sorts and de-dupes unordered input", () => {
    expect(formatTenure([2006, 1992, 2006, 1993])).toBe("1992–1993, 2006");
  });
});
