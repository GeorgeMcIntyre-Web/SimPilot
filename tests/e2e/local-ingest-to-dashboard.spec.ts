import { test, expect } from '@playwright/test';
import { ingestLocalFixtureFiles, goToDashboard, openDaleConsole } from './utils/testHelpers';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

test.describe('Local Ingest to Dashboard Flow', () => {
    test.fixme('Ingest Local Excel Files and Verify Dashboard Updates', async ({ page }) => {
        // 1. Define fixture paths
        const simPath = path.join(__dirname, 'fixtures/excel/SimulationStatus_TEST.xlsx');
        const eqPath = path.join(__dirname, 'fixtures/excel/EquipmentList_TEST.xlsx');

        if (!fs.existsSync(simPath)) test.skip(true, `Sim file not found: ${simPath}`);
        if (!fs.existsSync(eqPath)) test.skip(true, `Eq file not found: ${eqPath}`);

        // 2. Ingest Files
        await ingestLocalFixtureFiles(page, simPath, eqPath);

        // 3. Go to Dashboard
        await goToDashboard(page);

        // 4. Assert Global Indicator
        await expect(page.getByText('Data Loaded')).toBeVisible();

        // 5. Assert Project Data
        await expect(page.getByTestId('kpi-total-projects')).toBeVisible();
        // Check that value is not 0
        const projectsText = await page.getByTestId('kpi-total-projects').textContent();
        expect(projectsText).not.toContain('0');

        // 6. Open Dale Console
        await openDaleConsole(page);

        // 7. Assert Metrics
        try {
            await expect(page.getByTestId('dale-console-root')).toBeVisible({ timeout: 5000 });
            // await expect(page.getByTestId('dale-kpi-at-risk-sim')).toBeVisible({ timeout: 5000 });
        } catch (e) {
            console.error('Dale KPI not visible!');
            const root = await page.getByTestId('dale-console-root').innerHTML();
            console.error('Dale Console Root HTML:', root);
            throw e;
        }
    });
});
