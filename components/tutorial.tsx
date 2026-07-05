"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { track } from "@vercel/analytics";

// Auto-opens once on the first ever visit (any mode), then only on demand via
// the "?" button. The flag is global, so it never reappears after the first
// close.
const FLAG = "footylinks:onboarded";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-lg">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-left font-semibold text-sm"
      >
        {title}
        <span className="text-muted">
          {open ? "▲" : "▼"}
        </span>
      </button>
      {open && (
        <div className="px-3 pb-3 text-sm text-muted space-y-2">
          {children}
        </div>
      )}
    </div>
  );
}

export default function HowToPlay() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(FLAG)) {
        setOpen(true);
        track("tutorial_opened", { source: "auto" });
      }
    } catch {
      // ignore (private mode / disabled storage)
    }
  }, []);

  function close() {
    setOpen(false);
    try {
      window.localStorage.setItem(FLAG, "1");
    } catch {
      // ignore
    }
  }

  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
          track("tutorial_opened", { source: "button" });
        }}
        aria-label="How to play"
        className="w-6 h-6 rounded-full border border-border text-sm text-muted hover:text-foreground hover:border-foreground transition flex items-center justify-center"
      >
        ?
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-background text-foreground border border-border rounded-lg shadow-2xl p-6 w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">
                How to play
              </h2>
              <button
                onClick={close}
                aria-label="Close"
                className="text-muted hover:text-foreground text-xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Visual: the shape of a solution. */}
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs mb-3">
              <span className="px-2 py-1 rounded-md bg-primary-500 text-black font-semibold">
                Cristiano Ronaldo
              </span>
              <span className="text-muted">→</span>
              <span className="px-2 py-1 rounded-md bg-surface-100 dark:bg-surface-800">
                Manchester United (2007)
              </span>
              <span className="text-muted">→</span>
              <span className="px-2 py-1 rounded-md bg-surface-100 dark:bg-surface-800">
                Gerard Piqué
              </span>
              <span className="text-muted">→</span>
              <span className="px-2 py-1 rounded-md bg-surface-100 dark:bg-surface-800">
                FC Barcelona (2020)
              </span>
              <span className="text-muted">→</span>
              <span className="px-2 py-1 rounded-md bg-tertiary-500 text-black font-semibold">
                Lionel Messi
              </span>
            </div>

            <p className="text-sm mb-4">
              Connect the two players through clubs they
              shared. Get there in the fewest moves.
            </p>

            <div className="space-y-2 mb-4">
              <Section title="Scoring">
                <p>
                  Each pick is a move. Coloured feedback shows
                  how it went:
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>
                    <span className="text-green-600 dark:text-green-400 font-medium">
                      Green
                    </span>{" "}
                    — the move took you closer to the target player, good choice!
                  </li>
                  <li>
                    <span className="text-amber-600 dark:text-amber-500 font-medium">
                      Amber
                    </span>{" "}
                    — a detour; it moved you further from the
                    target.
                  </li>
                </ul>
                <p>
                  The number of moves taken so far is shown at the top of each puzzle, along with the number of moves remaining
                </p>
              </Section>

              <Section title="How links work">
                <p>
                  Start at the origin player, pick a season from their career, then a teammate
                  from that season. Repeat until you reach the target player. If you run out of moves before you reach the target, you lose.
                </p>
                <p>
                  Daily and Expert modes refresh every day at midnight UTC. The Expert mode has a larger dataset, including players from Europe's top divisions and second tiers.
                  Set and share challenges using Create mode, or try custom puzzles in Practice mode.
                </p>
              </Section>
            </div>

            <div className="flex items-center justify-between">
              <Link
                href="/faq"
                className="text-sm text-primary-700 dark:text-primary-400 underline"
                onClick={close}
              >
                More & FAQ
              </Link>
              <button
                onClick={close}
                className="px-4 py-2 rounded-lg bg-primary-500 text-black font-semibold hover:bg-primary-600 transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
