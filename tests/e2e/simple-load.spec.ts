import { test, expect } from '@playwright/test';

test('Simple App Load Test', async ({ page }) => {
    console.error('Navigating to /data-loader...');
    await page.goto('/data-loader');

    console.error('Waiting for app-shell...');
    await expect(page.getByTestId('app-shell')).toBeVisible();
    console.error('app-shell visible');

    console.error('Waiting for data-loader-root...');
    await expect(page.getByTestId('data-loader-root')).toBeVisible();
    console.error('data-loader-root visible');
});
