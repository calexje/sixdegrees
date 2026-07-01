import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — footylinks",
};

const linkClass =
  "text-primary-700 dark:text-primary-400 underline";

export default function PrivacyPage() {
  return (
    <article className="max-w-2xl mx-auto space-y-6 text-sm leading-relaxed">
      <div>
        <h1 className="text-2xl font-bold">
          Privacy Policy
        </h1>
        <p className="text-muted mt-1">
          Last updated: June 2026
        </p>
      </div>

      <p>
        footylinks is operated by{" "}
        <strong>Calex Digital</strong>. This policy explains
        what data the site handles. Questions? Email{" "}
        <a
          className={linkClass}
          href="mailto:sixlinksgaming@gmail.com"
        >
          sixlinksgaming@gmail.com
        </a>
        .
      </p>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">
          What we store on your device
        </h2>
        <p>
          The game keeps your progress — your daily streak,
          games played, and your latest daily result — in
          your browser&apos;s local storage. This stays on
          your device, is not sent to us, and contains no
          personal information. You can clear it at any time
          through your browser settings.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Analytics</h2>
        <p>
          We use Vercel Analytics to understand aggregate,
          anonymous usage such as page views and which game
          modes are popular. It does not use cookies and
          does not collect personally identifiable
          information.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">
          Advertising
        </h2>
        <p>
          We use Google AdSense to display ads. Google and
          its partners may use cookies or similar
          technologies to serve and, where permitted,
          personalise ads based on your prior visits to this
          and other websites.
        </p>
        <p>
          For visitors in the UK and EEA, we ask for consent
          before any advertising cookies are set, through a
          Google-certified consent management platform. You
          can review how Google uses data from sites that
          use its services at{" "}
          <a
            className={linkClass}
            href="https://policies.google.com/technologies/partner-sites"
            target="_blank"
            rel="noopener noreferrer"
          >
            policies.google.com/technologies/partner-sites
          </a>{" "}
          and control personalised advertising at{" "}
          <a
            className={linkClass}
            href="https://adssettings.google.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            adssettings.google.com
          </a>
          .
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Cookies</h2>
        <p>
          We do not set our own tracking cookies. Game
          progress uses local storage (above), and
          advertising cookies are set by Google and its
          partners subject to your consent in the UK/EEA.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">
          Your rights
        </h2>
        <p>
          We do not hold an account or personal data about
          you. For advertising data handled by Google, use
          the consent controls shown on the site and the
          Google links above. UK/EEA visitors have rights
          under the UK GDPR / GDPR; contact us with any
          questions.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Children</h2>
        <p>
          This site is not directed at children under 13.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Contact</h2>
        <p>
          <a
            className={linkClass}
            href="mailto:sixlinksgaming@gmail.com"
          >
            sixlinksgaming@gmail.com
          </a>
        </p>
      </section>
    </article>
  );
}
