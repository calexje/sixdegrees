import { test, expect } from "./fixtures";

test("renders today's Daily with its core controls", async ({
  page,
}) => {
  // Read the puzzle rather than pinning names: the Daily rotates at midnight
  // UTC, so a hardcoded origin would turn the scheduled run red overnight.
  const puzzle = await (
    await page.request.get("/api/puzzle?mode=daily")
  ).json();

  await page.goto("/");

  await expect(
    page.getByText("Find a link between")
  ).toBeVisible();
  await expect(
    page.getByText(puzzle.target, { exact: true }).first()
  ).toBeVisible();

  await expect(page.getByTestId("path")).toContainText(
    puzzle.origin
  );
  await expect(page.getByTestId("budget")).toContainText(
    /\d+ \/ \d+ moves/
  );
  await expect(page.getByLabel("Search clubs")).toBeVisible();
  await expect(
    page.getByTestId("options").getByRole("button").first()
  ).toBeVisible();
});
