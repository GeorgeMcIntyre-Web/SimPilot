import { test, expect } from '@playwright/test';
import { gotoApp, openDashboardInDaleMode } from './fixtures/demo';
import { loadDemoScenario } from './fixtures/dataLoader';

test.describe('Demo to Dashboard Flow', () => {
    test('Load Demo Scenario and Verify Dashboard in Dale Mode', async ({ page }) => {
        // 1. Start at app root
        await gotoApp(page);

        // 2. Navigate to Data Loader and Load Demo
        await loadDemoScenario(page);

        // 3. Navigate to Dashboard and activate Dale Mode
        await openDashboardInDaleMode(page);

        // 4. Assert Dale Mode UI is visible
        await expect(page.getByTestId('dashboard-dale-toggle')).toBeVisible();
        // Check for a known element in Dale Mode, e.g., "Top At-Risk Cells"
        await expect(page.getByText('Top At-Risk Cells')).toBeVisible();

        // 5. Assert Data is populated
        // Check for at least one project or cell. 
        // In STLA_SAMPLE, we expect some data.
        // We can check if the KPI tiles have non-zero values.
        // The "Total Projects" tile should show a number > 0.
        // We don't have test-ids on tiles yet, but we can look for text.
        await expect(page.getByText('Total Projects')).toBeVisible();

        // 6. Open Dale Console
        await page.getByTestId('open-dale-console').click();

        // 7. Assert Dale Console is visible
        await expect(page.getByTestId('dale-console')).toBeVisible();
        await expect(page.getByText('Dale Console')).toBeVisible();

        // 8. Check for "Copy Summary" button
        await expect(page.getByRole('button', { name: /Copy Summary/i })).toBeVisible();
    });
});
