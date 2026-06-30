"use client";

import { useNav } from "./nav-context";

// While a mode switch is in flight the old puzzle would otherwise stay on
// screen (React keeps the previous UI during a navigation transition), so we
// replace it with a loading message instead.
export default function Content({
  children,
}: {
  children: React.ReactNode;
}) {
  const { pending } = useNav();

  if (pending) {
    return (
      <div className="py-20 text-center text-sm text-muted">
        Building player database…
      </div>
    );
  }

  return <>{children}</>;
}
