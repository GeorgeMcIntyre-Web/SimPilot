import { test, expect } from '@playwright/test';
import { gotoApp } from './fixtures/demo';
import { loadDemoScenario } from './fixtures/dataLoader';

test.describe('Engineer Write-Back Flow', () => {
    test('Change Engineer Assignment and Verify in Changes Page', async ({ page }) => {
        // 1. Start at app root
        await gotoApp(page);

        // 2. Load demo scenario
        await loadDemoScenario(page);

        // 3. Navigate to Dashboard
        await page.getByTestId('nav-dashboard').click();

        // Wait for project data to load
        await expect(page.locator('a[href^="/projects/"]').first()).toBeVisible({ timeout: 5000 });

        // 4. Navigate to a specific cell detail page
        // We'll use a known project/cell from STLA demo
        await page.goto('/projects/STLA_BIW/cells/BIW_L1_10');

        // 5. If we land on the cell detail page, look for engineer assignment UI
        // The cell detail page should have an engineer dropdown or input
        await expect(page.getByText(/Assigned Engineer/i)).toBeVisible({ timeout: 5000 });

        // 6. Change the engineer
        // Click the edit button first
        await page.getByTitle('Edit Engineer').click();

        // Find the input and type a new name
        const engineerInput = page.locator('input[placeholder="Enter engineer name..."]');
        await expect(engineerInput).toBeVisible();
        await engineerInput.fill('New Engineer');

        // Click Save
        await page.getByTitle('Save').click();

        // 7. Navigate to Changes page
        await page.goto('/changes');

        // 8. Assert Changes Page loads
        await expect(page.getByText(/Changes|Pending Changes/i)).toBeVisible();

        // 9. Assert there's at least one change listed (should show the engineer change we made)
        await expect(page.getByText(/engineer|assigned/i)).toBeVisible();

        // 10. Assert CSV Export button exists
        await expect(page.getByRole('button', { name: /Export|CSV|Download/i })).toBeVisible();
    });
});
