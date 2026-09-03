import { it, expect } from "vitest";
import Database from "better-sqlite3";
import path from "path";

// e2e/fixtures.ts `deadEnd` rests on Aled Rowlands having exactly one
// appearance row: that is what makes his only club a guaranteed loop and
// leaves him with no onward move. A squad re-pull that adds a row should fail
// here in milliseconds rather than as a puzzling E2E timeout.
it("keeps the dead-end fixture's single club-season", () => {
  const db = new Database(
    path.join(process.cwd(), "database", "football.db"),
    { readonly: true }
  );
  const { n } = db
    .prepare(
      "SELECT COUNT(*) AS n FROM appearances WHERE player_id = ?"
    )
    .get("774252") as { n: number };
  db.close();

  expect(n).toBe(1);
});
