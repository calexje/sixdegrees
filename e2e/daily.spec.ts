import { test, expect, FIXTURES } from "./fixtures";

const { pin, origin, target, solutionPath } =
  FIXTURES.pinnedDaily;

test("solves a pinned Daily along its optimal path", async ({
  page,
}) => {
  await page.goto(`/?puzzle=${pin}`);

  const options = page.getByTestId("options");
  await expect(page.getByTestId("path")).toContainText(origin);

  // solutionPath alternates player, club, player. Club buttons are labelled
  // with the arriving player's whole tenure, not the single year the path
  // names, so clubs match on name and players exactly.
  for (let i = 1; i < solutionPath.length; i++) {
    // Sync on the path first: the search box's label alternates between clubs
    // and players as you move, so acting before the re-render looks for a
    // label that is not there yet.
    await expect(page.getByTestId("path").locator("li")).toHaveCount(i);

    const step = solutionPath[i];

    if (i % 2 === 1) {
      const club = step.replace(/\s*\(\d{4}\)$/, "");
      await page.getByLabel("Search clubs").fill(club);
      await options.getByRole("button", { name: club }).click();
    } else {
      await page.getByLabel("Search players").fill(step);
      // The winning selection unmounts this panel, so Playwright must not
      // verify the element afterwards - it is gone by design.
      await options
        .getByRole("button", { name: step, exact: true })
        .click({ noWaitAfter: true });
    }
  }

  // The modal renders for a loss too. "Perfect" is the rating for wasting no
  // move, which is what walking the stored optimal earns.
  const modal = page.getByTestId("end-modal");
  await expect(modal).toContainText("Success!");
  await expect(modal).toContainText("Perfect");
  await expect(modal).toContainText(target);
});
