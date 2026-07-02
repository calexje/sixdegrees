import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About — footylinks",
};

const linkClass =
  "text-primary-700 dark:text-primary-400 underline";

export default function AboutPage() {
  return (
    <article className="max-w-2xl mx-auto space-y-6 text-sm leading-relaxed">
      <h1 className="text-2xl font-bold">
        About footylinks
      </h1>

      <p>
        footylinks is a daily football puzzle in the
        spirit of six degrees of separation. You&apos;re
        given two players and have to connect them through
        the clubs they shared, hopping player to club to
        player until you reach the target.
      </p>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">
          How to play
        </h2>
        <ul className="list-disc list-inside space-y-1 text-muted">
          <li>
            Start from the origin player and pick one of
            their club-seasons.
          </li>
          <li>
            From that club-season, pick a teammate who
            played there.
          </li>
          <li>
            Keep going until you reach the target player.
            Each pick is one move.
          </li>
          <li>
            Stuck? Hints reveal the target&apos;s recent
            club, full career, and a suggested next move.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">
          Moves, the budget and scoring
        </h2>
        <p>
          Every pick is a move, so a jump from one player to
          the next through a shared club costs two. Each
          puzzle has a move budget: the length of the best
          solution plus a small allowance. Spend every move
          without connecting the two players and you lose that
          puzzle, which is what keeps a daily game tense.
        </p>
        <p>
          After each move, the step you made is coloured.
          Green means you stayed on a shortest path; amber
          means you took a detour and are now further from the
          target than you needed to be. The number beside your
          path tells you how many moves remain between you and
          the target.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">A few tips</h2>
        <ul className="list-disc list-inside space-y-1 text-muted">
          <li>
            Work back from the target as well as forward from
            the origin. Knowing where the target played
            narrows the clubs you are aiming for.
          </li>
          <li>
            Long-serving players and big squads are useful
            hubs: a club-season with many well-travelled names
            gives you more onward routes.
          </li>
          <li>
            Watch the colours. An amber move isn&apos;t fatal,
            but two or three in a row will eat your budget.
          </li>
          <li>
            Save hints for when you are genuinely stuck, since
            they count towards your result.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Modes</h2>
        <ul className="list-disc list-inside space-y-1 text-muted">
          <li>
            <strong>Daily</strong> — one Premier League
            puzzle a day, the same for everyone.
          </li>
          <li>
            <strong>Expert</strong> — the full dataset
            across Europe&apos;s top divisions and second
            tiers.
          </li>
          <li>
            <strong>Practice</strong> — set your own
            leagues, seasons, difficulty and obscurity.
          </li>
          <li>
            <strong>Create</strong> — build a challenge
            between two players and share the link.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Data</h2>
        <p>
          Squad and appearance data comes from
          Transfermarkt. This is an independent fan project
          and is not affiliated with, endorsed by, or
          sponsored by any club, league or Transfermarkt.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Contact</h2>
        <p>
          Built by Calex Digital. Feedback and bug reports:{" "}
          <a
            className={linkClass}
            href="mailto:sixlinksgaming@gmail.com"
          >
            sixlinksgaming@gmail.com
          </a>
          .
        </p>
      </section>
    </article>
  );
}
