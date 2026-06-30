# Launch plan

The game is feature-complete and the major correctness bugs are fixed. This is
the remaining work to take it to a public launch (with ads and a real domain).
Decisions taken with the owner are marked **[decided]**.

## Known facts

- **Cold start ≈ 6s** to first byte on Expert. Real problem; fix in item 1.
- **Traffic:** being posted around (bursty), so cold starts will be hit often.
- **Budget:** free until AdSense revenue; open to free DB hosting. Plan to mirror
  to other sports later, so keep things reasonably generic.
- **Privacy policy:** owner "Calex SEO", contact sixlinksgaming@gmail.com.
- **Domain:** use the runtime origin (`window.location` client-side, request
  host server-side) so nothing is hardcoded before the domain is registered.

## 1. Performance: ~6s cold start — implementation plan

**Diagnosis first, but the cause is almost certainly the in-memory graph build,
not the database.** Two things make it worse than it needs to be:

- `lib/puzzle.tsx` builds **both** `fullGraph` and `premierLeagueGraph` at module
  import, eagerly, so *any* code path that imports it (a Daily page load, the
  hint route) pays to build the full multi-league graph even when it's not used.
- Each serverless cold start redoes this from scratch (better-sqlite3 load + a
  280k-row scan + Map construction).

Important: **a hosted database does not fix this.** The BFS needs the whole
adjacency in memory, so moving rows to Turso/Postgres would still require
building the graph per cold start (and add network latency). The levers are
about *when* and *how fast* the graph is built, and *how often* a cold start
happens. All of the below are free.

**Step 0 — measure (confirm the cause).** Wrap the graph builds and a sample
generation in `console.time` + `process.memoryUsage()` and read the Vercel
function logs for one cold hit per mode. Confirm it's the build (vs cold boot /
native module load).

**Step 1 — lazy, per-graph build (free, no infra, likely the big win).** Stop
building at module import; build each graph on first use and memoise it. Then a
Daily cold start builds only the smaller Premier League graph; the full graph is
built only when Expert/Practice is actually requested. Also make
`dailyAllowedPlayers` (prominence) lazy. Touch: `lib/puzzle.tsx`.

**Step 2 — more memory = more CPU (free, config).** Vercel scales CPU with
memory, so bumping the function memory (route segment config / `vercel.json`)
can roughly halve a CPU-bound build. One line.

**Step 3 — precompute the graph artifact (free, no infra)** if the build itself
is still the cost: serialize the adjacency (+ label registry) at build time and
load/deserialize it at cold start instead of going through SQLite. Touch: a
build script, `lib/graph.ts`.

**Step 4 — escape per-request cold starts entirely (free tier, if bursts still
hurt).** Serverless rebuilds per cold instance; a long-lived Node process builds
the graph **once** and serves warm. A free host (Fly.io / Render / Railway)
running `next start` with the bundled SQLite would do this. Caveat: free tiers
sleep when idle, so the first hit after a quiet spell still pays once. Only worth
it if steps 1-3 don't tame the burst behaviour.

Recommended order: 0 → 1 → 2, re-measure, then 3 or 4 only if needed. The DB
stays the bundled read-only SQLite throughout (no hosted DB required).

## 2. Ads prerequisites: privacy policy + consent — [decided: UK/EU audience]

EU/UK traffic means consent is required before ads (and any non-essential
cookies) run. This is a hard gate for AdSense.

- **Privacy policy page** (`/privacy`): what's stored (localStorage stats — no
  PII), third parties (Google AdSense, Vercel Analytics), cookies, and contact.
  Owner: **Calex SEO**, contact **sixlinksgaming@gmail.com**.
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

- Add a dynamic `app/opengraph-image.tsx` via `next/og` (no asset needed —
  render the wordmark + tagline on the palette; could render "Connect X to Y"
  per challenge later). Switch `twitter.card` to `summary_large_image`.
- **Domain via runtime origin**: rather than hardcode `NEXT_PUBLIC_SITE_URL`,
  derive `metadataBase` from the request host (`headers()`), so OG URLs resolve
  on whatever domain serves the app. Client-side share already uses
  `window.location`.

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
