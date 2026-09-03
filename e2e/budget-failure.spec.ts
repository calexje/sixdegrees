import { test, expect, FIXTURES } from "./fixtures";

const { pin, origin, target } = FIXTURES.pinnedDaily;

// The board only ever offers legal moves, so there is no wrong answer to
// reject: the budget is the real failure state. Pin 3's optimal is 4 edges =
// 3 moves, budget = 3 + MOVE_SLACK(4) = 7, and moveCount = path.length - 2,
// so the eighth selection spends it.
const SELECTIONS_TO_FAIL = 8;

test("ends the puzzle when the move budget is spent", async ({
  page,
}) => {
  await page.goto(`/?puzzle=${pin}`);

  const options = page.getByTestId("options");
  const path = page.getByTestId("path");

  for (let i = 0; i < SELECTIONS_TO_FAIL; i++) {
    // Sync on the path before reading options, or a stale list from the
    // previous node sends the walk somewhere else entirely.
    await expect(path.locator("li")).toHaveCount(i + 1);

    // The path updates from client state the instant a selection lands, but the
    // next options are still being fetched - so wait for the board to stop
    // fetching, or we read a stale list and click a name that has gone.
    await expect(
      page.getByText(/Fetching (clubs|players)/)
    ).toHaveCount(0);

    const buttons = options.getByRole("button");
    await expect(buttons.first()).toBeVisible();

    // Wander on purpose, never picking the target, or the walk wins instead of
    // failing. The second option where there is one keeps the route moving
    // through the graph rather than bouncing between two nodes.
    const usable = (await buttons.allInnerTexts())
      .map((label) => label.trim())
      .filter((label) => label && label !== target);

    const choice = usable[Math.min(1, usable.length - 1)];
    expect(choice, `no legal move at selection ${i + 1}`).toBeTruthy();

    // Every selection replaces this whole list, and the budget-spending one
    // unmounts the panel outright, so a normal click detaches its own target
    // mid-action and Playwright retries a button that has gone by design.
    // Dispatching does the same thing to the app without asking Playwright to
    // re-verify an element it can no longer find.
    await options
      .getByRole("button", { name: choice, exact: true })
      .first()
      .dispatchEvent("click");
  }

  const modal = page.getByTestId("end-modal");
  await expect(modal).toContainText("Out of moves");
  await expect(modal).toContainText(origin);
  await expect(modal).toContainText(target);
});
