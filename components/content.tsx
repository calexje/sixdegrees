"use client";

import { useNav } from "./nav-context";

// While a navigation is in flight we show a loading message in place of the
// (stale) puzzle. The children are only hidden, not unmounted — the control
// that triggered the navigation (e.g. the Practice "New puzzle" button) lives
// inside them, and it must stay mounted to clear the pending flag when its
// transition finishes. Unmounting it would strand the loading state forever.
export default function Content({
  children,
}: {
  children: React.ReactNode;
}) {
  const { pending } = useNav();

  return (
    <>
      {pending && (
        <div className="py-20 text-center text-sm text-muted">
          Building player database…
        </div>
      )}
      <div className={pending ? "hidden" : undefined}>
        {children}
      </div>
    </>
  );
}
