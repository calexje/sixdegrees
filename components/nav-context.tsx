"use client";

import {
  createContext,
  useContext,
  useState,
} from "react";

// Shares "is a mode navigation in progress" between the header (which triggers
// it) and the content area (which shows a loading message while it runs).
type NavState = {
  pending: boolean;
  setPending: (pending: boolean) => void;
};

const NavContext = createContext<NavState>({
  pending: false,
  setPending: () => {},
});

export function NavProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pending, setPending] = useState(false);

  return (
    <NavContext.Provider value={{ pending, setPending }}>
      {children}
    </NavContext.Provider>
  );
}

export function useNav() {
  return useContext(NavContext);
}
