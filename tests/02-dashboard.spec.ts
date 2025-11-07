import { test, expect } from "@playwright/test";

// Use authenticated state
test.use({ storageState: "tests/.auth/user.json" });

test.describe("Dashboard Page", () => {
  test("should load dashboard page", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page.locator("h1")).toContainText("Lead Research Runs");
    await expect(page.locator("text=Create New Run")).toBeVisible();
  });

  test("should display dashboard header with navigation", async ({ page }) => {
    await page.goto("/dashboard");

    // Check for header/navigation elements
    const header = page
      .locator('header, nav, .header, [role="banner"]')
      .first();
    await expect(header).toBeVisible();
  });

  test("should show runs list or empty state", async ({ page }) => {
    await page.goto("/dashboard");

    // Wait for content to load
    await page.waitForLoadState("networkidle");

    // Either runs should be visible or an empty state message
    const hasRuns = await page
      .locator('.run-item, [data-testid="run"]')
      .count();
    const hasEmptyState = await page
      .locator("text=/no runs yet|create your first run/i")
      .count();

    expect(hasRuns > 0 || hasEmptyState > 0).toBeTruthy();
  });

  test("should have create run button", async ({ page }) => {
    await page.goto("/dashboard");

    const createButton = page.locator(
      'button:has-text("Create New Run"), a:has-text("Create New Run")',
    );
    await expect(createButton).toBeVisible();
  });

  test("should be able to click create run button", async ({ page }) => {
    await page.goto("/dashboard");

    const createButton = page.locator(
      'button:has-text("Create New Run"), a:has-text("Create New Run")',
    );
    await createButton.click();

    // Should either open a modal or navigate to a new page
    // Wait a bit for UI to respond
    await page.waitForTimeout(1000);
  });
});

test.describe("Navigation", () => {
  test("should navigate to map page", async ({ page }) => {
    await page.goto("/dashboard");

    // Look for map link in navigation
    const mapLink = page.locator('a[href="/dashboard/map"], a:has-text("Map")');

    if ((await mapLink.count()) > 0) {
      await mapLink.click();
      await page.waitForURL("/dashboard/map");
      await expect(page).toHaveURL("/dashboard/map");
    }
  });

  test("should be able to navigate between pages", async ({ page }) => {
    await page.goto("/dashboard");

    // Test basic navigation is working
    await page.goto("/");
    await expect(page).toHaveURL("/");
  });
});
