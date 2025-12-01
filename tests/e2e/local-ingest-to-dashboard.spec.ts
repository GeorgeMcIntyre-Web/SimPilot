import { test, expect } from '@playwright/test';
import { gotoApp, openDashboardInDaleMode } from './fixtures/demo';
import { ingestLocalFixture } from './fixtures/dataLoader';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

test.describe('Local Ingest to Dashboard Flow', () => {
    test('Ingest Local Excel Files and Verify Dashboard Updates', async ({ page }) => {
        // 1. Start at app root
        await gotoApp(page);

        // 2. Define fixture paths
        const simPath = path.join(__dirname, '../fixtures/excel/SimulationStatus_TEST.xlsx');
        const eqPath = path.join(__dirname, '../fixtures/excel/EquipmentList_TEST.xlsx');

        console.error('Sim Path:', simPath);
        console.error('Eq Path:', eqPath);

        if (!fs.existsSync(simPath)) throw new Error(`Sim file not found: ${simPath}`);
        if (!fs.existsSync(eqPath)) throw new Error(`Eq file not found: ${eqPath}`);

        // 3. Ingest Files
        await ingestLocalFixture(page, simPath, eqPath);

        // Check for error message
        if (await page.getByText('At least one Simulation Status file is required').isVisible()) {
            throw new Error('File input failed: Simulation file not detected');
        }

        // 4. Navigate to Dashboard
        await page.getByTestId('nav-dashboard').click();

        // 5. Assert Global Indicator
        // Use the stable data-testid we added to LayoutShell
        await expect(page.getByTestId('data-status-indicator')).toHaveAttribute('data-status', 'loaded', { timeout: 15000 });

        // 6. Toggle Dale Mode to ensure we see the project list (Standard mode only shows At Risk)
        await openDashboardInDaleMode(page);

        // 7. Assert Project Data
        // Our fixture has project "SimulationStatus TEST".
        await expect(page.getByText('SimulationStatus TEST').first()).toBeVisible();

        // 8. Assert Metrics
        // We have 3 robots in the fixture.
        // One cell is 100%, one is 50%, one is 0%.
        // "Avg Completion" should be visible.
        await expect(page.getByText('Avg Completion')).toBeVisible();

        // Check for "SimulationStatus TEST" again in the table
        await expect(page.getByText('SimulationStatus TEST').first()).toBeVisible();
    });
});
