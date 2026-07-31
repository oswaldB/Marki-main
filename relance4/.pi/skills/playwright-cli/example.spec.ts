import { test, expect } from '@playwright/test';

test('basic test', async ({ page }) => {
  await page.goto('https://playwright.dev/');
  const title = await page.title();
  expect(title).toContain('Playwright');
});

test('click navigation', async ({ page }) => {
  await page.goto('https://playwright.dev/');
  await page.click('text=Get Started');
  await expect(page).toHaveURL(/.*\/docs\/intro/);
});

test('form interaction', async ({ page }) => {
  await page.goto('https://example.com/login');
  await page.fill('#username', 'testuser');
  await page.fill('#password', 'password123');
  await page.click('#submit');
  await expect(page).toHaveURL('https://example.com/dashboard');
});