import { test as base, expect } from "@playwright/test";

// Playwright hands every spec a clean browser profile, which means two of the
// app's first-run surfaces fire on every navigation:
//
//   - the tutorial modal auto-opens whenever `footylinks:onboarded` is unset
//     (components/tutorial.tsx), covering the board behind a z-50 overlay;
//   - the cookie banner is a fixed, full-width element at z-50 pinned to the
//     bottom of the viewport (components/consent-banner.tsx), which overlaps the
//     board's controls — worst on the mobile project.
//
// Seeding both keys before first paint keeps each spec about the game rather
// than about clicking past onboarding. Consent is seeded as "denied" on
// purpose: it suppresses GA4 and Clarity, so the suite never shows up in the
// product's own analytics and pages load a little lighter.
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem(
          "footylinks:onboarded",
          "1"
        );
        window.localStorage.setItem(
          "footylinks:cookieConsent",
          "denied"
        );

        // The Daily lock keys on the date alone, not on the puzzle number
        // (lib/stats.ts), and a stored result swaps the whole board for the
        // result screen (components/game.tsx). Clearing it means a finished
        // Daily can never lock out a later pinned puzzle in the same profile.
        window.localStorage.removeItem(
          "footballDegrees:dailyResult"
        );
      } catch {
        // Storage disabled (private mode): the specs still run, they just meet
        // the overlays they would otherwise skip.
      }
    });

    await use(page);
  },
});

export { expect };

// Verified fixture data, kept out of the specs so the ids are explained in one
// place rather than appearing as magic numbers in a journey.
export const FIXTURES = {
  // A curated Daily with a known 6-move solution, served via the `?puzzle=`
  // pin (lib/puzzle.tsx `getPinnedDailyPuzzle`). Valid pins are 1-138.
  // Pin 3 is one of only six 4-move puzzles in the curated list (the other 132
  // are 6 moves), so the walkthrough is four clicks rather than six — the same
  // coverage with less to go wrong. It is also well in the past, so committing
  // its solution spoils nothing that has not already been played.
  pinnedDaily: {
    pin: 3,
    origin: "Harvey Elliott",
    target: "Declan Rice",
    solutionDistance: 4,
    solutionPath: [
      "Harvey Elliott",
      "Liverpool FC (2023)",
      "Adrián San Miguel",
      "West Ham United (2018)",
      "Declan Rice",
    ],
  },

  // A dead end reachable in one move, pinned through Challenge mode's existing
  // from/to params — no test-only seam needed.
  //
  // Ken DeMange has exactly two clubs in the dataset: Hull City (1990), with 30
  // teammates, and Cardiff City (1991), where he is the *only* player on record
  // for that season. Picking Cardiff therefore yields zero onward options,
  // which is precisely the `atDeadEnd` condition, and the board offers the
  // "← Back (dead end)" escape hatch.
  //
  // This depends on the dataset: a squad re-pull that adds any 1991 Cardiff
  // player kills the fixture. Worth a unit test in tests/ asserting that
  // getClubTeammates("175864", "603") still returns only DeMange himself, so
  // that change fails in milliseconds rather than as a puzzling E2E flake.
  deadEnd: {
    url: "/?mode=challenge&from=175864&to=206780",
    origin: "Ken DeMange",
    target: "Tommy Wright",
    deadEndClub: "Cardiff City",
    playableClub: "Hull City",
  },
} as const;
