import { test, expect } from '@playwright/test';

// Test to capture and analyze console errors
test('capture console errors', async ({ page }) => {
  const consoleErrors: string[] = [];
  const consoleWarnings: string[] = [];
  const consoleLogs: string[] = [];

  // Listen for console events
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    } else if (msg.type() === 'warning') {
      consoleWarnings.push(msg.text());
    } else {
      consoleLogs.push(msg.text());
    }
  });

  // Navigate to the page
  await page.goto('https://example.com');

  // Wait for page to load
  await page.waitForLoadState('networkidle');

  // Report findings
  console.log('=== CONSOLE ERROR REPORT ===');
  console.log(`Total Errors: ${consoleErrors.length}`);
  console.log(`Total Warnings: ${consoleWarnings.length}`);
  console.log(`Total Logs: ${consoleLogs.length}`);

  if (consoleErrors.length > 0) {
    console.log('\n=== ERRORS ===');
    consoleErrors.forEach((error, index) => {
      console.log(`${index + 1}. ${error}`);
    });
  }

  if (consoleWarnings.length > 0) {
    console.log('\n=== WARNINGS ===');
    consoleWarnings.forEach((warning, index) => {
      console.log(`${index + 1}. ${warning}`);
    });
  }

  // Assert no critical errors
  expect(consoleErrors.length).toBeLessThan(10); // Threshold for errors
});

test('detect uncaught exceptions', async ({ page }) => {
  const uncaughtErrors: string[] = [];

  page.on('pageerror', (error) => {
    uncaughtErrors.push(error.message);
    console.log('Uncaught Error:', error.message);
  });

  await page.goto('https://example.com');
  await page.waitForLoadState('networkidle');

  console.log(`Uncaught Errors: ${uncaughtErrors.length}`);
  uncaughtErrors.forEach((error, index) => {
    console.log(`${index + 1}. ${error}`);
  });

  expect(uncaughtErrors.length).toBe(0);
});