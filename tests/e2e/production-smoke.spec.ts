import { test, expect } from '@playwright/test';

/**
 * Production Smoke Test
 *
 * Critical user flows that must work in production:
 * - Manager: Load demo, view dashboard, check station health
 * - Engineer: Load demo, navigate to simulation page, verify data
 * - No uncaught errors in console
 *
 * This spec is designed to run against production (or preview) builds.
 */

test.describe('Production Smoke Test', () => {
  test.beforeEach(async ({ page }) => {
    // Capture console errors for validation
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Browser console error:', msg.text());
      }
    });

    // Capture page errors
    page.on('pageerror', error => {
      console.error('Page error:', error.message);
    });
  });

  test('Manager flow: Load demo and view dashboard health', async ({ page }) => {
    // 1. Landing page loads without errors
    await page.goto('/');
    await expect(page).toHaveTitle(/SimPilot/i);

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // 2. Navigate to Data Loader
    await page.getByTestId('nav-data-loader').click();
    await expect(page.getByTestId('data-loader-root')).toBeVisible();

    // 3. Load STLA Sample demo
    const demoSelect = page.getByTestId('demo-scenario-select');
    await demoSelect.selectOption('STLA_SAMPLE');

    const loadButton = page.getByTestId('demo-load-button');
    await loadButton.click();

    // 4. Wait for data load completion
    await expect(page.getByTestId('data-loaded-indicator')).toBeVisible({ timeout: 30000 });

    // 5. Navigate to Dashboard
    await page.getByTestId('go-to-dashboard-button').click();
    await expect(page.getByTestId('dashboard-root')).toBeVisible();

    // 6. Verify KPI tiles show data
    const totalStations = page.getByTestId('kpi-total-stations');
    await expect(totalStations).toBeVisible();
    await expect(totalStations).not.toHaveText('0');

    const robots = page.getByTestId('kpi-robots');
    await expect(robots).toBeVisible();

    const tools = page.getByTestId('kpi-tools');
    await expect(tools).toBeVisible();

    // 7. Verify Areas Overview section
    await expect(page.getByText('Areas Overview')).toBeVisible();

    // 8. Verify Stations Table renders
    const searchInput = page.getByPlaceholder('Search stations...');
    await expect(searchInput).toBeVisible();

    // 9. Verify at least one station row exists
    const rows = page.locator('tbody tr');
    await expect(rows.first()).toBeVisible();
  });

  test('Engineer flow: Navigate simulation page and verify data', async ({ page }) => {
    // 1. Load demo data first
    await page.goto('/data-loader');
    await page.getByTestId('demo-load-button').click();
    await expect(page.getByTestId('data-loaded-indicator')).toBeVisible({ timeout: 30000 });

    // 2. Navigate to Simulation page
    await page.getByTestId('nav-simulation').click();
    await expect(page).toHaveURL(/\/simulation/);

    // 3. Verify simulation page loads
    await expect(page.locator('body')).toBeVisible();

    // 4. Navigate to Assets page
    await page.goto('/assets');
    await expect(page.locator('h1, h2')).toContainText(/assets/i);

    // 5. Navigate back to Dashboard
    await page.getByTestId('nav-dashboard').click();
    await expect(page.getByTestId('dashboard-root')).toBeVisible();
  });

  test('Persistence: Data survives page refresh', async ({ page }) => {
    // 1. Load demo data
    await page.goto('/data-loader');
    await page.getByTestId('demo-load-button').click();
    await expect(page.getByTestId('data-loaded-indicator')).toBeVisible({ timeout: 30000 });

    // 2. Navigate to Dashboard
    await page.getByTestId('nav-dashboard').click();
    await expect(page.getByTestId('dashboard-root')).toBeVisible();

    // 3. Capture a KPI value before refresh
    const totalStations = page.getByTestId('kpi-total-stations');
    const stationCountBefore = await totalStations.textContent();

    // 4. Refresh the page
    await page.reload();

    // 5. Wait for app to rehydrate
    await expect(page.getByTestId('dashboard-root')).toBeVisible({ timeout: 10000 });

    // 6. Verify data is still present (not empty state)
    await expect(totalStations).toBeVisible();
    const stationCountAfter = await totalStations.textContent();

    expect(stationCountAfter).toBe(stationCountBefore);
    expect(stationCountAfter).not.toBe('0');
  });

  test('CRUD flow: Open and close station detail drawer', async ({ page }) => {
    // 1. Load demo data
    await page.goto('/data-loader');
    await page.getByTestId('demo-load-button').click();
    await expect(page.getByTestId('data-loaded-indicator')).toBeVisible({ timeout: 30000 });

    // 2. Navigate to Dashboard
    await page.getByTestId('nav-dashboard').click();
    await expect(page.getByTestId('dashboard-root')).toBeVisible();

    // 3. Open first station detail drawer
    const firstRow = page.locator('tbody tr').first();
    await firstRow.click();
    await expect(page.getByTestId('station-detail-drawer')).toBeVisible();

    // 4. Verify drawer content is visible
    const drawer = page.getByTestId('station-detail-drawer');
    await expect(drawer).toContainText(/station/i);

    // 5. Close drawer
    const closeButton = page.locator('[aria-label="Close drawer"]');
    await closeButton.click();
    await expect(page.getByTestId('station-detail-drawer')).not.toBeVisible();
  });

  test('No console errors during typical user session', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', error => {
      consoleErrors.push(`PageError: ${error.message}`);
    });

    // Run through a typical session
    await page.goto('/');
    await page.getByTestId('nav-data-loader').click();
    await page.getByTestId('demo-load-button').click();
    await expect(page.getByTestId('data-loaded-indicator')).toBeVisible({ timeout: 30000 });
    await page.getByTestId('nav-dashboard').click();
    await expect(page.getByTestId('dashboard-root')).toBeVisible();

    // Search for a station
    const searchInput = page.getByPlaceholder('Search stations...');
    await searchInput.fill('ST');
    await page.waitForTimeout(500);

    // Click first row to open drawer
    const firstRow = page.locator('tbody tr').first();
    if (await firstRow.count() > 0) {
      await firstRow.click();
      await expect(page.getByTestId('station-detail-drawer')).toBeVisible();
      const closeButton = page.locator('[aria-label="Close drawer"]');
      await closeButton.click();
    }

    // Navigate to Simulation
    await page.getByTestId('nav-simulation').click();
    await page.waitForTimeout(1000);

    // Navigate to Engineers
    await page.goto('/engineers');
    await page.waitForTimeout(1000);

    // Navigate to Assets
    await page.goto('/assets');
    await page.waitForTimeout(1000);

    // Navigate to Data Health
    await page.goto('/data-health');
    await page.waitForTimeout(1000);

    // Assert no console errors occurred
    expect(consoleErrors).toHaveLength(0);
  });

  test('Clear data resets application to empty state', async ({ page }) => {
    // 1. Load demo data
    await page.goto('/data-loader');
    await page.getByTestId('demo-load-button').click();
    await expect(page.getByTestId('data-loaded-indicator')).toBeVisible({ timeout: 30000 });

    // 2. Verify data is loaded
    await page.getByTestId('nav-dashboard').click();
    await expect(page.getByTestId('dashboard-root')).toBeVisible();
    await expect(page.getByTestId('dashboard-empty')).not.toBeVisible();

    // 3. Navigate back to Data Loader
    await page.getByTestId('nav-data-loader').click();

    // 4. Click "Clear All Data" button
    const clearButton = page.getByTestId('clear-data-button');
    await clearButton.click();

    // 5. Confirm the dialog
    const confirmButton = page.getByTestId('confirm-clear-button');
    await confirmButton.click();

    // 6. Navigate to Dashboard
    await page.getByTestId('nav-dashboard').click();

    // 7. Verify empty state is shown
    await expect(page.getByTestId('dashboard-empty')).toBeVisible({ timeout: 10000 });
  });
});
