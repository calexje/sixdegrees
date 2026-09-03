import { defineConfig, devices } from "@playwright/test";

// The suite targets production by default. Every journey is read-only — it
// navigates the board and reads the DOM; no journey writes server state — so
// running against the live app is safe, and it keeps the claim honest: these
// specs test the deployed product, not a local approximation of it. Point
// E2E_BASE_URL at a dev server to run the same specs against a branch.
const baseURL =
  process.env.E2E_BASE_URL ?? "https://footylinks.app";

const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)/.test(
  baseURL
);

export default defineConfig({
  testDir: "./e2e",

  // Cold starts on Vercel run ~6s (docs/launch.md), and past the curated Daily
  // list the board falls back to a live graph build, which is slower again. The
  // generous per-test and navigation budgets absorb that; the per-assertion
  // timeout stays tight so a genuine regression still fails fast rather than
  // waiting out the full test timeout.
  timeout: 60_000,
  expect: { timeout: 10_000 },

  // Retry once in CI, never locally. A spec that passes only on retry is a bug
  // to investigate, not a result to bank — the trace from the first attempt is
  // kept for exactly that.
  retries: process.env.CI ? 1 : 0,

  // A stray `test.only` must never silently shrink the CI suite to one spec.
  forbidOnly: !!process.env.CI,

  fullyParallel: true,

  // Parallelism is capped rather than left at the CPU count. The board's
  // distance readout is rate limited to 60 requests / 10s per client and the
  // hint endpoint to 20 (lib/rate-limit.ts); several workers replaying the same
  // journeys from one CI IP can brush those limits, and a 429 reads as a flaky
  // test rather than as the throttle it is.
  workers: process.env.CI ? 2 : 4,

  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],

  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    // CI only. `retain-on-failure` screencasts every test and discards the
    // passes, and locally that made the Daily journey fail 4 runs in 7 — the
    // win transition stopped stabilising and context teardown timed out, both
    // clearing up entirely with video off (8 for 8). Failure videos are worth
    // that on CI, where nobody watched the run; locally the page is right there.
    video: isLocal ? "off" : "retain-on-failure",
    navigationTimeout: 30_000,
    actionTimeout: 15_000,
  },

  projects: [
    // The API contract check needs no browser, so it runs once instead of once
    // per engine.
    {
      name: "api",
      testMatch: /api\.spec\.ts$/,
    },

    // Two engines, deliberately. Firefox is a documented time-box choice, not
    // an oversight — see the README.
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: [/api\.spec\.ts$/, /mobile\.spec\.ts$/],
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
      testIgnore: [/api\.spec\.ts$/, /mobile\.spec\.ts$/],
    },

    // The responsive claim, encoded: only the specs written for a phone-sized
    // viewport run here, so the mobile signal stays legible instead of being
    // buried in a third full pass of the desktop suite.
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 13"] },
      testMatch: /mobile\.spec\.ts$/,
    },
  ],

  // Only when pointed at localhost: start the app so a local run is one
  // command. Against production there is nothing to start, and `dev` is used
  // rather than `build && start` so a local run needs no build step first.
  webServer: isLocal
    ? {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      }
    : undefined,
});
