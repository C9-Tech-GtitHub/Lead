import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should load login page', async ({ page }) => {
    await page.goto('/auth/login');

    await expect(page.locator('h2')).toContainText('Lead Research Platform');
    await expect(page.locator('text=Sign in to your account')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show validation for empty fields', async ({ page }) => {
    await page.goto('/auth/login');

    // Try to submit without filling fields
    await page.click('button[type="submit"]');

    // HTML5 validation should prevent submission
    const emailInput = page.locator('input[type="email"]');
    const isEmailInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(isEmailInvalid).toBeTruthy();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/auth/login');

    await page.fill('input[type="email"]', 'wrong@email.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Wait for error message
    await expect(page.locator('.bg-red-50')).toBeVisible({ timeout: 5000 });
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('/auth/login');

    await page.fill('input[type="email"]', 'tech@calibrenine.com.au');
    await page.fill('input[type="password"]', 'bjt6YRV@wcn2wgz_ezd');
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });

    // Verify dashboard loaded
    await expect(page.locator('text=Lead Research Runs')).toBeVisible();
  });

  test('should have link to signup page', async ({ page }) => {
    await page.goto('/auth/login');

    const signupLink = page.locator('a[href="/auth/signup"]');
    await expect(signupLink).toBeVisible();
    await expect(signupLink).toContainText('Sign up');
  });

  test('should redirect to login when accessing protected route without auth', async ({ page }) => {
    await page.goto('/dashboard');

    // Should redirect to login
    await page.waitForURL('/auth/login');
    await expect(page.locator('h2')).toContainText('Lead Research Platform');
  });
});
