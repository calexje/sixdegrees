import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Use — footylinks",
  description:
    "The terms under which you can use footylinks.",
};

const linkClass =
  "text-primary-700 dark:text-primary-400 underline";

export default function TermsPage() {
  return (
    <article className="max-w-2xl mx-auto space-y-6 text-sm leading-relaxed">
      <div>
        <h1 className="text-2xl font-bold">Terms of Use</h1>
        <p className="text-muted mt-1">
          Last updated: July 2026
        </p>
      </div>

      <p>
        footylinks is operated by Calex Digital. By using the
        site you agree to these terms. If you do not agree,
        please do not use the site.
      </p>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">The service</h2>
        <p className="text-muted">
          footylinks is a free football puzzle game, provided
          as is. We may change, pause or withdraw any part of
          it at any time, and puzzles or data may be updated
          or corrected without notice.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">
          Acceptable use
        </h2>
        <p className="text-muted">
          Please use the site for personal, non-commercial
          play. Do not attempt to disrupt the service, scrape
          it at scale, or use it in a way that breaks the law
          or infringes others&apos; rights.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">
          Data and accuracy
        </h2>
        <p className="text-muted">
          Squad and appearance data comes from Transfermarkt.
          footylinks is an independent fan project and is not
          affiliated with, endorsed by or sponsored by any
          club, league or Transfermarkt. The data is provided
          for entertainment and may contain errors or
          omissions.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">
          Advertising
        </h2>
        <p className="text-muted">
          The site is supported by advertising. See the{" "}
          <Link href="/privacy" className={linkClass}>
            Privacy Policy
          </Link>{" "}
          for how advertising and your data are handled.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Liability</h2>
        <p className="text-muted">
          To the extent permitted by law, footylinks and Calex
          Digital are not liable for any loss arising from your
          use of the site. The site is provided without
          warranties of any kind.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Contact</h2>
        <p className="text-muted">
          Questions about these terms:{" "}
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
