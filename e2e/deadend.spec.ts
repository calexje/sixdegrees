import { test, expect, FIXTURES } from "./fixtures";

const { url, origin, playableClub, deadEndPlayer } =
  FIXTURES.deadEnd;

test("offers the escape hatch at a dead end", async ({
  page,
}) => {
  await page.goto(url);

  const options = page.getByTestId("options");
  const backButton = page.getByRole("button", {
    name: /Back \(dead end\)/,
  });

  await expect(page.getByTestId("path")).toContainText(origin);
  await expect(backButton).toBeHidden();

  // The club label carries the arriving player's tenure, so match on the name.
  await options
    .getByRole("button", { name: playableClub })
    .click();

  // Filtering 85 teammates down to one keeps the click off a scrolled list.
  await page.getByLabel("Search players").fill(deadEndPlayer);
  await options
    .getByRole("button", { name: deadEndPlayer, exact: true })
    .click();

  await expect(backButton).toBeVisible();

  await backButton.click();
  await expect(backButton).toBeHidden();
  await expect(page.getByTestId("path")).toContainText(
    playableClub
  );
});
