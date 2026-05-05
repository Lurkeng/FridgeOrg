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

  test("shopping route has a mobile protected-route smoke check", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/shopping");
    await expect(page).toHaveURL(/\/auth$/);
  });

  test("auth mode toggle updates submit CTA", async ({ page }) => {
    await page.goto("/auth");
    await page.getByRole("tab", { name: "Sign Up" }).click();
    await expect(page.locator("form").getByRole("button", { name: "Create Account" })).toBeVisible();
    await page.getByRole("tab", { name: "Log In" }).click();
    await expect(page.locator("form").getByRole("button", { name: "Log In" })).toBeVisible();
  });

  test("public trust pages render", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.getByRole("heading", { name: "Privacy Policy" })).toBeVisible();
    await page.goto("/terms");
    await expect(page.getByRole("heading", { name: "Terms of Use" })).toBeVisible();
  });

  test("paper-grain texture has graceful @supports fallback", async ({ page }) => {
    await page.goto("/auth");
    // Headline must remain visible — proves texture didn't break compositing.
    await expect(page.getByRole("heading", { name: "Fresh food has a short memory." })).toBeVisible();
    // body::after mix-blend-mode is either 'multiply' (supports) or 'normal' (fallback).
    const blendMode = await page.evaluate(() => {
      return getComputedStyle(document.body, "::after").mixBlendMode;
    });
    expect(["multiply", "normal"]).toContain(blendMode);
  });

  test("PWA manifest is available", async ({ page }) => {
    const response = await page.goto("/manifest.webmanifest");
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator("body")).toContainText("FreshTrack");
  });
});
