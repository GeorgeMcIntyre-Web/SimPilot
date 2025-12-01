import { test, expect } from '@playwright/test';
import { gotoApp } from './fixtures/demo';
import { loadDemoScenario } from './fixtures/dataLoader';

test.describe('Readiness Board Flow', () => {
    test('Load Demo and Verify Read iness Board Basic Load', async ({ page }) => {
        // 1. Start at app root
        await gotoApp(page);

        // 2. Load demo scenario
        await loadDemoScenario(page);

        // 3. Navigate to Readiness Board
        await page.goto('/readiness');

        // 4. Assert Page Title
        await expect(page.getByText('Readiness Board')).toBeVisible();

        // 5. Assert Phase Header (at least one phase column should be visible)
        // The demo data should have cells in various phases
        await expect(page.getByText('Pre-Simulation')).toBeVisible();

        // 6. Assert Filter Controls
        await expect(page.getByText('All Phases')).toBeVisible();
        await expect(page.getByText('All Projects')).toBeVisible();

        // 7. Assert at least one cell card renders (demo data should have schedule info)
        // Since cells are rendered with schedule data, we should see at least cell counts
        const cellCountText = await page.locator('text=/\\d+ cells/i').textContent();
        expect(cellCountText).toBeTruthy();
    });
});
