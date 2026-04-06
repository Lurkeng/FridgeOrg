import { test, expect } from "@playwright/test";

test.describe("Smoke", () => {
  test("auth page loads with FreshTrack branding", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.getByRole("heading", { name: "FreshTrack" })).toBeVisible();
    await expect(page.locator("form").getByRole("button", { name: "Log In" })).toBeVisible();
  });
});
