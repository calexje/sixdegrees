# Launch plan

The game is feature-complete and the major correctness bugs are fixed. This is
the remaining work to take it to a public launch (with ads and a real domain).
Decisions taken with the owner are marked **[decided]**.

## Inputs still needed from the owner

These feed specific steps below; none block starting:

- **Live Expert cold-start numbers** (response time + any 500s / memory warnings
  from the Vercel function logs) — gates item 1.
- **Traffic expectation + infra appetite** (small/self-contained vs willing to
  add a hosted DB free tier) — informs item 1's fix.
- **Domain** — for `NEXT_PUBLIC_SITE_URL`, OG tags, AdSense verification.
- **Privacy policy basics** — owning entity/person name + contact email.

## 1. Performance: serverless cold start — [decided: measure first]

The whole graph is rebuilt in memory from the 26 MB SQLite on every cold start;
Expert builds the full multi-league graph and generation runs several BFS
passes. Plan:

- **Instrument**: log graph-build time and `process.memoryUsage()` at module
  init in `lib/puzzle.tsx`, and time per-request generation. Pull the numbers
  from a few cold Expert hits on the live deployment.
- **Decide against thresholds**: if Expert cold start is comfortably within the
  function's time/memory limits, leave it and just monitor. If it's slow or
  near the limit, act.
- **Quick mitigation** first: raise the function memory/`maxDuration` via route
  segment config or `vercel.json`.
- **If still a problem**, in order of preference:
  1. **Precompute the graph** as a build artifact (serialized adjacency) and
     load it at cold start instead of parsing SQLite + building Maps. No new
     infra.
  2. **Hosted DB** (Turso/libSQL) queried on demand, if precompute isn't enough.
- Touch: `lib/puzzle.tsx`, `lib/graph.ts`, possibly a build script + `vercel.json`.

## 2. Ads prerequisites: privacy policy + consent — [decided: UK/EU audience]

EU/UK traffic means consent is required before ads (and any non-essential
cookies) run. This is a hard gate for AdSense.

- **Privacy policy page** (`/privacy`): what's stored (localStorage stats — no
  PII), third parties (Google AdSense, Vercel Analytics), cookies, and contact.
  Needs the entity name + email.
- **Consent banner / CMP**: use Google's CMP ("Privacy & messaging" / Funding
  Choices) — free and AdSense-integrated — or a lightweight TCF CMP. Gate ad
  scripts (and GA-style analytics) behind consent.
- **An `/about` (how-to-play) page**: doubles as the content AdSense wants
  (helps clear the "low-value content" review) and a natural home for the link.
- Vercel Analytics is cookieless, so it can run without the consent gate, but it
  still gets a line in the privacy policy.
- This is the **AdSense-readiness** half of the "ads" work; the ad units
  themselves (likely AdSense H5 Games Ads — rewarded/interstitial, see earlier
  research) come after approval.

## 3. Daily lock after completion — [decided: lock until tomorrow]

Wordle-style: once today's Daily is done, revisiting shows the result, not a
fresh board.

- Extend `lib/stats.ts` to store today's **result** (date, moves, hints) when the
  Daily is won, alongside the existing streak data.
- On Daily load, if today's date is already completed, render a **result view**
  (final move/hint count, the route, a "come back tomorrow" line, ideally a
  countdown to the next UTC day) instead of the playable board.
- Touch: `lib/stats.ts`, `components/game.tsx` (or a small `DailyResult`
  component), wired from `app/page.tsx` for the daily branch.
- Note: the Daily resets at **UTC midnight** (the seed is the UTC date); fine,
  just be aware it's not local midnight.

## 4. Analytics — [decided: Vercel Analytics]

- Add `@vercel/analytics`, render `<Analytics />` in `app/layout.tsx`.
- Cookieless, so no consent gate; mention it in the privacy policy.
- Small.

## 5. Social share image (OG)

Tags are in place but text-only. Sharing (challenge/daily links) is a core
mechanic, so a real card matters.

- Add a branded OG image: simplest is a static `public/og.png`; nicer is a
  dynamic `app/opengraph-image.tsx` via `next/og` (could even render
  "Connect X to Y" per challenge later).
- Switch `twitter.card` to `summary_large_image` once an image exists.
- Set `NEXT_PUBLIC_SITE_URL` to the domain so absolute URLs resolve.

## 6. Tests

No automated tests today. Worth a small suite around the logic we iterated on
most.

- Add **Vitest**; cover the pure logic: `difficultyFor` bands, `formatSeason`,
  the 2-jump floor, prominence gating, and `shortestPathVia` / `bestMove`
  correctness on a small fixed graph.
- Touch: `package.json` (dep + `test` script), `lib/*.test.ts`.

## Suggested sequence

1. **Item 1 (measure)** and **item 2 (privacy + consent)** — the two real launch
   blockers. Item 2 can proceed in parallel; item 1 may need no code if the
   numbers are fine.
2. **Item 3 (daily lock)** and **item 5 (OG image)** — make it feel finished.
3. **Item 4 (analytics)** — trivial, do alongside.
4. **Item 6 (tests)** — backlog, protects future changes.

## Pre-launch checklist (one-liners)

- Set `DAILY_EPOCH` (`lib/puzzle.tsx`) to the real launch date (today = #1).
- Set `NEXT_PUBLIC_SITE_URL` env var to the production domain.
- Confirm the static `/_not-found` and all four modes build green (they do now).
- AdSense: site verified on the domain, privacy policy + consent live before
  enabling ad units.
