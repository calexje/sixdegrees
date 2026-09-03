import { test, expect } from "@playwright/test";
import { FIXTURES } from "./fixtures";

const { pin } = FIXTURES.pinnedDaily;

// Deliberately the base `test`, not e2e/fixtures.ts: that seeds consent as
// denied, and this journey exists to prove the banner does not cover the
// board's controls. Onboarding is still seeded, since the tutorial's overlay
// blocks the board outright and is not what is being tested here.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem(
        "footylinks:onboarded",
        "1"
      );
    } catch {
      // Storage disabled: the tutorial appears and the journey fails honestly.
    }
  });
});

test("keeps the board usable with the consent banner showing", async ({
  page,
}) => {
  await page.goto(`/?puzzle=${pin}`);

  await expect(
    page.getByRole("button", { name: "Accept" })
  ).toBeVisible();

  const path = page.getByTestId("path");
  const options = page.getByTestId("options");

  // Journey 2 at phone size. Playwright refuses to click an element another
  // element covers, so completing the hop *is* the assertion that the banner
  // pinned to the bottom of the viewport does not sit over the options.
  await expect(path.locator("li")).toHaveCount(1);

  await options.getByRole("button").first().click();
  await expect(path.locator("li")).toHaveCount(2);

  await options.getByRole("button").first().click();
  await expect(path.locator("li")).toHaveCount(3);

  await expect(
    page.getByLabel("Search clubs")
  ).toBeVisible();
});
