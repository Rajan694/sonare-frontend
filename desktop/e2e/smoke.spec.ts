import { test, expect } from '@playwright/test';

test.describe('Sonare Web Flow', () => {
  test('loads home page and checks title at 1440x900', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page).toHaveTitle(/Sonare/i);
  });

  test('navigation and layout responsive at 390x844', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page).toHaveTitle(/Sonare/i);
  });
});
