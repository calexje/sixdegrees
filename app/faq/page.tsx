import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "FAQ — footylinks",
  description:
    "How footylinks works: moves, hints, the daily puzzle, scoring, data and the game modes.",
};

const linkClass =
  "text-primary-700 dark:text-primary-400 underline";

function QA({
  q,
  children,
}: {
  q: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">{q}</h2>
      <div className="text-muted space-y-2">{children}</div>
    </section>
  );
}

export default function FaqPage() {
  return (
    <article className="max-w-2xl mx-auto space-y-6 text-sm leading-relaxed">
      <div>
        <h1 className="text-2xl font-bold">
          Frequently asked questions
        </h1>
        <p className="text-muted mt-1">
          Everything about how the game works. If your
          question isn&apos;t here, the{" "}
          <Link href="/about" className={linkClass}>
            About page
          </Link>{" "}
          has a fuller walkthrough.
        </p>
      </div>

      <QA q="What is footylinks?">
        <p>
          footylinks is a daily football puzzle. You are
          given two players and have to connect them through
          the clubs they shared, stepping from a player to
          one of their club-seasons, to a teammate from that
          squad, and on until you reach the target.
        </p>
      </QA>

      <QA q="What counts as a move?">
        <p>
          Every pick is one move, whether you pick a
          club-season or a player. Going from one player to
          the next through a shared club therefore takes two
          moves. The counter next to your path shows how many
          moves you have used.
        </p>
      </QA>

      <QA q="Why is there a limit on how many moves I can make?">
        <p>
          Each puzzle has a move budget: the length of the
          best possible solution plus a small allowance. If
          you use every move without connecting the two
          players, you lose that puzzle. The budget is what
          gives a daily game its tension, in the same way a
          guess limit does in Wordle or Connections.
        </p>
      </QA>

      <QA q="What do the green and amber colours mean?">
        <p>
          After each move, the step you just made is coloured.
          Green means the move kept you on a shortest path to
          the target. Amber means it was a detour that moved
          you further away. The number beside your path shows
          how many moves you are now from the target, so you
          can judge how far a detour set you back.
        </p>
      </QA>

      <QA q="What are hints, and do they count against me?">
        <p>
          Hints reveal the target&apos;s most recent club,
          then their full career, then a suggested next move.
          They do not use up moves, but each hint is recorded
          in your result, so a puzzle solved without hints
          reads better than one solved with them.
        </p>
      </QA>

      <QA q="Is the daily puzzle the same for everyone?">
        <p>
          Yes. The daily puzzle is fixed for the whole day and
          identical for every player, so scores are
          comparable. It resets at midnight UTC, which may not
          be your local midnight.
        </p>
      </QA>

      <QA q="How do streaks work?">
        <p>
          Solving the daily puzzle extends your streak by one.
          Missing a day, or running out of moves, resets it to
          zero. Your streak and games played are stored in
          your browser, not on a server, so they stay on the
          device you play on.
        </p>
      </QA>

      <QA q="What are the different modes?">
        <p>
          <strong>Daily</strong> is one Premier League puzzle
          a day. <strong>Expert</strong> uses the full dataset
          across Europe. <strong>Practice</strong> lets you
          set your own leagues, seasons, difficulty and how
          obscure the players can be. <strong>Create</strong>{" "}
          builds a puzzle between two players of your choice
          and gives you a link to share.
        </p>
      </QA>

      <QA q="Which leagues and seasons are covered?">
        <p>
          The dataset spans the top two divisions of England,
          Spain, Italy, Germany, France and Portugal, across
          many seasons. The Daily puzzle is drawn from the
          Premier League only; Expert and Practice can use the
          full set.
        </p>
      </QA>

      <QA q="Where does the data come from?">
        <p>
          Squad and appearance data comes from Transfermarkt.
          footylinks is an independent fan project and is not
          affiliated with, endorsed by or sponsored by any
          club, league or Transfermarkt.
        </p>
      </QA>

      <QA q="A player or transfer looks wrong or is missing. Why?">
        <p>
          The graph is built from a fixed snapshot of the
          data, so very recent transfers may not appear, and
          spells outside the covered leagues are not included.
          A player only connects two clubs if they actually
          appeared for both in a covered season.
        </p>
      </QA>

      <QA q="How do I share a puzzle or challenge a friend?">
        <p>
          When you finish a puzzle you can copy your result to
          share it. In Create mode you build a puzzle between
          any two players and share the link, so a friend can
          attempt the exact same connection.
        </p>
      </QA>

      <QA q="Is footylinks free?">
        <p>
          Yes. The game is free to play. It is supported by
          advertising, and there are no accounts to create.
        </p>
      </QA>

      <QA q="How do I report a bug or get in touch?">
        <p>
          Email{" "}
          <a
            className={linkClass}
            href="mailto:sixlinksgaming@gmail.com"
          >
            sixlinksgaming@gmail.com
          </a>
          . Bug reports that include the two players and the
          route you took are the most useful.
        </p>
      </QA>
    </article>
  );
}
