import { test as base, type Page } from "@playwright/test";

type AuthFixtures = { loggedInPage: Page };

/**
 * Extends Playwright's `test` with a `loggedInPage` fixture.
 *
 * Signs up a fresh unique test user via the /auth form on every test run so
 * tests never collide in the database, then yields an authenticated Page.
 */
export const test = base.extend<AuthFixtures>({
  loggedInPage: async ({ page }, use) => {
    const email = `test-${Date.now()}@freshtrack-e2e.test`;
    const password = "TestPassword123!";

    await page.goto("/auth");
    await page.getByRole("tab", { name: "Sign Up" }).click();
    await page.getByPlaceholder("you@example.com").fill(email);
    await page.getByPlaceholder("at least 6 characters").fill(password);
    await page.locator("form").getByRole("button", { name: "Create Account" }).click();

    // sign-up does window.location.assign("/") — wait for the full navigation
    await page.waitForURL("/", { timeout: 20_000 });

    await use(page);
  },
});

export { expect } from "@playwright/test";
