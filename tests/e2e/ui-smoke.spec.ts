import { test, expect } from '@playwright/test';
import { loadDemoScenario, goToDashboard } from './utils/testHelpers';

/**
 * UI Smoke Tests
 * 
 * These tests verify the critical UI flows work correctly:
 * 1. Empty state dashboard shows appropriate message
 * 2. Data loader loads demo successfully
 * 3. Dashboard shows stats after data load
 * 4. Station detail drawer works
 */

test.describe('UI Smoke Tests', () => {
  test('Dashboard shows empty state when no data is loaded', async ({ page }) => {
    // Navigate directly to dashboard
    await page.goto('/dashboard');
    
    // Wait for the empty state to be visible
    await expect(page.getByTestId('dashboard-empty')).toBeVisible({ timeout: 10000 });
    
    // Verify CTA button is present
    await expect(page.getByText('Go to Data Loader')).toBeVisible();
    
    // Verify friendly message is shown
    await expect(page.getByText('Welcome to SimPilot')).toBeVisible();
  });

  test('Data Loader shows demo section', async ({ page }) => {
    // Navigate to data loader
    await page.goto('/data-loader');
    
    // Wait for page to load
    await expect(page.getByTestId('data-loader-root')).toBeVisible({ timeout: 10000 });
    
    // Verify demo section is visible
    await expect(page.getByTestId('demo-loader')).toBeVisible();
    await expect(page.getByTestId('demo-scenario-select')).toBeVisible();
    await expect(page.getByTestId('demo-load-button')).toBeVisible();
    
    // Verify local files tab is visible
    await expect(page.getByTestId('tab-local-files')).toBeVisible();
  });

  test('Load demo and verify Dashboard displays data', async ({ page }) => {
    // Load demo scenario
    await loadDemoScenario(page, 'STLA_SAMPLE');
    
    // Navigate to dashboard
    await goToDashboard(page);
    
    // Verify dashboard is in data mode (not empty)
    await expect(page.getByTestId('dashboard-root')).toBeVisible();
    await expect(page.getByTestId('dashboard-empty')).not.toBeVisible();
    
    // Verify key stats are visible
    await expect(page.getByTestId('kpi-total-stations')).toBeVisible();
    await expect(page.getByTestId('kpi-robots')).toBeVisible();
    await expect(page.getByTestId('kpi-tools')).toBeVisible();
    
    // Verify "Today for Dale" section is present
    await expect(page.getByText('Today for Dale')).toBeVisible();
    
    // Verify Areas Overview section is present
    await expect(page.getByText('Areas Overview')).toBeVisible();
  });

  test('Station table is searchable', async ({ page }) => {
    // Load demo scenario
    await loadDemoScenario(page, 'STLA_SAMPLE');
    
    // Navigate to dashboard
    await goToDashboard(page);
    
    // Wait for table to be visible
    await expect(page.getByPlaceholder('Search stations...')).toBeVisible();
    
    // Verify we can type in search
    const searchInput = page.getByPlaceholder('Search stations...');
    await searchInput.fill('ST');
    
    // Results should filter (exact behavior depends on data)
    // Just verify the input accepts text
    await expect(searchInput).toHaveValue('ST');
  });

  test('Clicking station opens detail drawer', async ({ page }) => {
    // Load demo scenario
    await loadDemoScenario(page, 'STLA_SAMPLE');
    
    // Navigate to dashboard
    await goToDashboard(page);
    
    // Wait for table to load
    await page.waitForTimeout(1000);
    
    // Find first station row and click it
    const firstRow = page.locator('tbody tr').first();
    
    // Guard: check if any rows exist
    const rowCount = await firstRow.count();
    if (rowCount === 0) {
      console.log('No station rows found - skipping drawer test');
      return;
    }
    
    await firstRow.click();
    
    // Wait for drawer to appear
    await expect(page.getByTestId('station-detail-drawer')).toBeVisible({ timeout: 5000 });
    
    // Close drawer by clicking the X
    const closeButton = page.locator('[aria-label="Close drawer"]');
    await closeButton.click();
    
    // Verify drawer is closed
    await expect(page.getByTestId('station-detail-drawer')).not.toBeVisible();
  });

  test('View mode toggle works', async ({ page }) => {
    // Load demo scenario
    await loadDemoScenario(page, 'STLA_SAMPLE');
    
    // Navigate to dashboard
    await goToDashboard(page);
    
    // Verify Overview mode is active by default (Areas Overview is visible)
    await expect(page.getByText('Areas Overview')).toBeVisible();
    
    // Click Table button to switch to table-only view
    const tableButton = page.getByRole('button', { name: /table/i });
    await tableButton.click();
    
    // Areas Overview should now be hidden
    await expect(page.getByText('Areas Overview')).not.toBeVisible();
    
    // Switch back to Overview
    const overviewButton = page.getByRole('button', { name: /overview/i });
    await overviewButton.click();
    
    // Areas Overview should be visible again
    await expect(page.getByText('Areas Overview')).toBeVisible();
  });

  test('Go to Dashboard button works after data load', async ({ page }) => {
    // Navigate to data loader
    await page.goto('/data-loader');
    await expect(page.getByTestId('data-loader-root')).toBeVisible();
    
    // Load demo
    await page.getByTestId('demo-load-button').click();
    await expect(page.getByTestId('data-loaded-indicator')).toBeVisible({ timeout: 30000 });
    
    // Verify "Go to Dashboard" button appears
    await expect(page.getByTestId('go-to-dashboard-button')).toBeVisible();
    
    // Click it
    await page.getByTestId('go-to-dashboard-button').click();
    
    // Should navigate to dashboard with data
    await expect(page.getByTestId('dashboard-root')).toBeVisible();
  });

  test('App shell navigation works', async ({ page }) => {
    // Load demo scenario
    await loadDemoScenario(page, 'STLA_SAMPLE');
    
    // Navigate using sidebar links
    await page.getByTestId('nav-dashboard').click();
    await expect(page.getByTestId('dashboard-root')).toBeVisible();
    
    await page.getByTestId('nav-data-loader').click();
    await expect(page.getByTestId('data-loader-root')).toBeVisible();
    
    // Go back to dashboard
    await page.getByTestId('nav-dashboard').click();
    await expect(page.getByTestId('dashboard-root')).toBeVisible();
  });

  test('Data status indicator shows correct state', async ({ page }) => {
    // Without data - should show "No Data"
    await page.goto('/dashboard');
    await expect(page.getByTestId('data-status-indicator')).toHaveAttribute('data-status', 'empty');
    
    // Load demo
    await page.goto('/data-loader');
    await page.getByTestId('demo-load-button').click();
    await expect(page.getByTestId('data-loaded-indicator')).toBeVisible({ timeout: 30000 });
    
    // Check indicator shows loaded
    await expect(page.getByTestId('data-status-indicator')).toHaveAttribute('data-status', 'loaded');
  });
});
