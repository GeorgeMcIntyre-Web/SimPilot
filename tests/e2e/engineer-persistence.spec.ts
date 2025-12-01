import { test, expect } from '@playwright/test';
import { loadDemoScenario, goToCellDetail, changeCellEngineer, goToDashboard } from './utils/testHelpers';

test.describe('Engineer Assignment & Persistence', () => {
    test.fixme('Change Engineer and Verify Persistence', async ({ page }) => {
        // 1. Load Demo Data
        await loadDemoScenario(page, 'STLA_SAMPLE');

        // 2. Go to a Cell (Project: p-stla-1, Cell: c-stla-1-1)
        // We know these IDs exist in STLA_SAMPLE
        await goToCellDetail(page, 'p-stla-1', 'c-stla-1-1');

        // 3. Change Engineer
        const newEngineer = 'Test Engineer 123';
        console.log('Changing engineer to:', newEngineer);
        await changeCellEngineer(page, newEngineer);

        // 4. Verify in UI immediately
        console.log('Verifying immediate update...');
        await expect(page.getByText(newEngineer)).toBeVisible();

        // 5. Reload Page (Simulate Persistence)
        console.log('Waiting for persistence to save...');
        await page.waitForTimeout(2000);
        console.log('Reloading page...');
        await page.reload();

        // Wait for app to reload and persistence to restore
        // We can check for the cell detail root again
        console.log('Waiting for cell detail root...');
        await expect(page.getByTestId('cell-detail-root')).toBeVisible();

        // 6. Verify Engineer Name Persists
        console.log('Verifying persistence...');
        await expect(page.getByText(newEngineer)).toBeVisible();

        // 7. Check Changes Page (Optional but good)
        await page.getByTestId('nav-changes').click();
        await expect(page.getByTestId('changes-root')).toBeVisible();
        await expect(page.getByText(newEngineer)).toBeVisible();
    });
});
