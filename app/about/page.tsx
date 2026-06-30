import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About — Football Degrees",
};

const linkClass =
  "text-primary-700 dark:text-primary-400 underline";

export default function AboutPage() {
  return (
    <article className="max-w-2xl mx-auto space-y-6 text-sm leading-relaxed">
      <h1 className="text-2xl font-bold">
        About Football Degrees
      </h1>

      <p>
        Football Degrees is a daily football puzzle in the
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
          Built by Calex SEO. Feedback and bug reports:{" "}
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
