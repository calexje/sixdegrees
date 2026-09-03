import { test, expect, FIXTURES } from "./fixtures";

const { pin } = FIXTURES.pinnedDaily;

test("accepts a club then a teammate, growing the path", async ({
  page,
}) => {
  await page.goto(`/?puzzle=${pin}`);

  const path = page.getByTestId("path");
  const budget = page.getByTestId("budget");
  const options = page.getByTestId("options");

  await expect(path.locator("li")).toHaveCount(1);
  await expect(budget).toContainText("0 / 7 moves");

  // A club is a selection but not yet a move: moveCount is path.length - 2, so
  // it stays at zero until the hop lands on a player.
  await options.getByRole("button").first().click();
  await expect(path.locator("li")).toHaveCount(2);
  await expect(budget).toContainText("0 / 7 moves");

  // The teammate completes the hop, so the count ticks.
  await options.getByRole("button").first().click();
  await expect(path.locator("li")).toHaveCount(3);
  await expect(budget).toContainText("1 / 7 moves");
});
