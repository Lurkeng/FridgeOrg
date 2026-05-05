import { type Page } from "@playwright/test";
import { test, expect } from "./fixtures/auth";

/** Opens the Add Item modal on /items, fills in the form, and waits for the item to appear in the list. */
async function addFoodItem(page: Page, name: string, expiryDate: string) {
  await page.goto("/items");
  await page.getByRole("button", { name: "Add Item" }).first().click();
  await page.getByPlaceholder(/e\.g\., Whole milk/i).fill(name);
  await page.locator('input[type="date"]').fill(expiryDate);
  await page.locator("form").getByRole("button", { name: /file on the shelf/i }).click();
  await expect(page.getByText(name)).toBeVisible({ timeout: 10_000 });
}

function futureDate(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

test.describe("Happy paths (authenticated)", () => {
  test("1. add food item — item appears in list", async ({ loggedInPage: page }) => {
    await addFoodItem(page, `E2E Milk ${Date.now()}`, futureDate(7));
  });

  test("2. mark item consumed — item disappears from list", async ({ loggedInPage: page }) => {
    const itemName = `E2E Cheese ${Date.now()}`;
    await addFoodItem(page, itemName, futureDate(14));

    await page.getByRole("button", { name: `Open actions for ${itemName}` }).click();
    await page.getByRole("button", { name: /used it up/i }).click();

    await expect(page.getByText(itemName)).not.toBeVisible({ timeout: 10_000 });
  });

  test("3. add to shopping list — item appears on shopping page", async ({ loggedInPage: page }) => {
    const itemName = `E2E Yogurt ${Date.now()}`;
    await addFoodItem(page, itemName, futureDate(5));

    await page.getByRole("button", { name: `Open actions for ${itemName}` }).click();
    await page.getByRole("button", { name: /add to shopping list/i }).click();

    await page.goto("/shopping");
    await expect(page.getByText(itemName)).toBeVisible({ timeout: 10_000 });
  });

  test("4. toggle shopping item — item gets checked state", async ({ loggedInPage: page }) => {
    const itemName = `E2E Bread ${Date.now()}`;

    await page.goto("/shopping");
    const quickAdd = page.getByPlaceholder(/milk, eggs/i);
    await quickAdd.fill(itemName);
    await quickAdd.press("Enter");
    await expect(page.getByText(itemName)).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: "Mark checked" }).first().click();
    await expect(page.getByRole("button", { name: "Mark unchecked" }).first()).toBeVisible({ timeout: 5_000 });
  });

  test("5. navigate to scan — URL is /scan and scan UI is visible", async ({ loggedInPage: page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /scan/i }).first().click();
    await expect(page).toHaveURL("/scan");
    await expect(page.getByRole("heading", { name: /scan barcode/i })).toBeVisible();
    await expect(page.getByText(/optical · barcode capture/i)).toBeVisible();
  });

  test("6. view waste page — heading and content visible", async ({ loggedInPage: page }) => {
    await page.goto("/waste");
    await expect(page.getByRole("heading", { name: /waste ledger/i })).toBeVisible();
    // new user has no waste data — the empty state is always rendered
    await expect(
      page.getByText(/nothing wasted yet|items logged/i).first(),
    ).toBeVisible({ timeout: 8_000 });
  });
});
