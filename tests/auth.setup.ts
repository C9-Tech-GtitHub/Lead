import { test as setup, expect } from '@playwright/test';

const authFile = 'tests/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // Navigate to login page
  await page.goto('/auth/login');

  // Fill in login form
  await page.fill('input[type="email"]', 'tech@calibrenine.com.au');
  await page.fill('input[type="password"]', 'bjt6YRV@wcn2wgz_ezd');

  // Click sign in button
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await page.waitForURL('/dashboard');

  // Verify we're logged in
  await expect(page.locator('text=Lead Research Runs')).toBeVisible();

  // Save authenticated state
  await page.context().storageState({ path: authFile });
});
