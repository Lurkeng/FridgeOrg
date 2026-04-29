import { test, expect } from "@playwright/test";

test.describe("Smoke", () => {
  test("auth page loads with FreshTrack branding", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.getByRole("heading", { name: "Fresh food has a short memory." })).toBeVisible();
    await expect(page.locator("form").getByRole("button", { name: "Log In" })).toBeVisible();
  });

  test("protected route redirects to auth when unauthenticated", async ({ page }) => {
    await page.goto("/items");
    await expect(page).toHaveURL(/\/auth$/);
    await expect(page.getByRole("heading", { name: "Fresh food has a short memory." })).toBeVisible();
  });

  test("auth mode toggle updates submit CTA", async ({ page }) => {
    await page.goto("/auth");
    await page.getByRole("tab", { name: "Sign Up" }).click();
    await expect(page.locator("form").getByRole("button", { name: "Create Account" })).toBeVisible();
    await page.getByRole("tab", { name: "Log In" }).click();
    await expect(page.locator("form").getByRole("button", { name: "Log In" })).toBeVisible();
  });
});
