import { test, expect } from '@playwright/test';
import { loadDemoScenario, goToDashboard, openDaleConsole } from './utils/testHelpers';

test.describe('Demo to Dashboard Flow', () => {
    test('Load Demo Scenario and Verify Dashboard in Dale Mode', async ({ page }) => {
        // 1. Load Demo
        await loadDemoScenario(page, 'STLA_SAMPLE');

        // 2. Go to Dashboard
        await goToDashboard(page);

        // 3. Assert Dashboard Elements
        // Debug: Check if we are in empty state
        if (await page.getByText('No data loaded yet').isVisible()) {
            console.error('Dashboard is in empty state! Data load failed or state not updated.');
            // Fail explicitly
            await expect(page.getByText('No data loaded yet')).not.toBeVisible();
        }

        try {
            await expect(page.getByTestId('dashboard-dale-toggle')).toBeVisible({ timeout: 5000 });
            // console.log('Skipping toggle check for now');
        } catch (e) {
            console.error('Toggle not visible!');
            const root = await page.getByTestId('dashboard-root').innerHTML();
            console.error('Dashboard Root HTML:', root);
            throw e;
        }
        await expect(page.getByTestId('kpi-total-projects')).toBeVisible();
        await expect(page.getByTestId('kpi-total-cells')).toBeVisible();

        // 4. Switch to Dale Mode (if not already, though default pref might be on)
        // We can force it by clicking if it's not active, but let's assume default or check state
        const daleToggle = page.getByTestId('dashboard-dale-toggle');
        // If the toggle text says "Dale Mode", it might be the button to ENABLE it or the label.
        // In our UI, we have two buttons "Standard" and "Dale Mode".
        // The active one has a shadow/bg-white.
        // Let's just click "Dale Mode" to be sure.
        await daleToggle.click();

        // 5. Check for Dale-specific content
        await expect(page.getByText('Top At-Risk Cells')).toBeVisible();

        // 6. Open Dale Console
        await page.getByTestId('open-dale-console').click();

        // 7. Assert Dale Console is visible
        await expect(page.getByTestId('dale-console-root')).toBeVisible();
        await expect(page.getByTestId('dale-kpi-at-risk-sim')).toBeVisible();
    });
});
