import { Page, expect } from '@playwright/test';

/**
 * Loads the specified demo scenario.
 */
export async function loadDemoScenario(page: Page, scenarioId: string = 'STLA_SAMPLE') {
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', exception => console.log(`PAGE ERROR: "${exception}"`));

    console.log(`[loadDemoScenario] Navigating to /data-loader...`);
    await page.goto('/data-loader');

    console.log(`[loadDemoScenario] Waiting for data-loader-root...`);
    await expect(page.getByTestId('data-loader-root')).toBeVisible();

    // Select scenario if needed (default is STLA_SAMPLE)
    if (scenarioId !== 'STLA_SAMPLE') {
        console.log(`[loadDemoScenario] Selecting scenario ${scenarioId}...`);
        await page.getByTestId('demo-scenario-select').selectOption(scenarioId);
    }

    console.log(`[loadDemoScenario] Clicking demo-load-button...`);
    await page.getByTestId('demo-load-button').click();

    console.log(`[loadDemoScenario] Waiting for data-loaded-indicator...`);
    await expect(page.getByTestId('data-loaded-indicator')).toBeVisible({ timeout: 30000 });
    console.log(`[loadDemoScenario] Data loaded successfully.`);
}

/**
 * Navigates to the Dashboard page.
 */
export async function goToDashboard(page: Page) {
    console.log(`[goToDashboard] Clicking nav-dashboard...`);
    await page.getByTestId('nav-dashboard').click();

    console.log(`[goToDashboard] Waiting for dashboard-root...`);
    await expect(page.getByTestId('dashboard-root')).toBeVisible();
    console.log(`[goToDashboard] Dashboard visible.`);
}

/**
 * Navigates to the Dale Console.
 */
export async function openDaleConsole(page: Page) {
    console.log(`[openDaleConsole] Navigating to /dale-console...`);
    await page.goto('/dale-console');

    console.log(`[openDaleConsole] Waiting for dale-console-root...`);
    await expect(page.getByTestId('dale-console-root')).toBeVisible();
    console.log(`[openDaleConsole] Dale Console visible.`);
}

/**
 * Ingests local fixture files.
 * Note: This requires the file input to be interactable.
 */
export async function ingestLocalFixtureFiles(page: Page, simulationFile: string, equipmentFile?: string) {
    console.log(`[ingestLocalFixtureFiles] Navigating to /data-loader...`);
    await page.goto('/data-loader');
    await expect(page.getByTestId('data-loader-root')).toBeVisible();

    console.log(`[ingestLocalFixtureFiles] Clicking tab-local-files...`);
    await page.getByTestId('tab-local-files').click();

    // Upload Simulation File
    console.log(`[ingestLocalFixtureFiles] Uploading simulation file: ${simulationFile}`);
    const simInput = page.getByTestId('local-simulation-input');
    await simInput.setInputFiles(simulationFile);

    // Upload Equipment File if provided
    if (equipmentFile) {
        console.log(`[ingestLocalFixtureFiles] Uploading equipment file: ${equipmentFile}`);
        const eqInput = page.getByTestId('local-equipment-input');
        await eqInput.setInputFiles(equipmentFile);
    }

    // Click Ingest
    console.log(`[ingestLocalFixtureFiles] Clicking local-ingest-button...`);
    await page.getByTestId('local-ingest-button').click();

    // Wait for completion
    console.log(`[ingestLocalFixtureFiles] Waiting for data-loaded-indicator...`);
    await expect(page.getByTestId('data-loaded-indicator')).toBeVisible({ timeout: 30000 });
    console.log(`[ingestLocalFixtureFiles] Ingestion complete.`);
}

/**
 * Navigates to a specific cell detail page.
 */
export async function goToCellDetail(page: Page, projectId: string, cellId: string) {
    const url = `/projects/${projectId}/cells/${cellId}`;
    console.log(`[goToCellDetail] Navigating to ${url}...`);
    await page.goto(url);

    console.log(`[goToCellDetail] Waiting for cell-detail-root...`);
    await expect(page.getByTestId('cell-detail-root')).toBeVisible();
    console.log(`[goToCellDetail] Cell detail visible.`);
}

/**
 * Changes the assigned engineer for a cell.
 */
export async function changeCellEngineer(page: Page, newEngineerName: string) {
    console.log(`[changeCellEngineer] Clicking edit-engineer-button...`);
    await page.getByTestId('edit-engineer-button').click();

    console.log(`[changeCellEngineer] Filling engineer name: ${newEngineerName}...`);
    const input = page.getByPlaceholder('Enter engineer name');
    await input.fill(newEngineerName);

    console.log(`[changeCellEngineer] Clicking save-engineer-button...`);
    await page.getByTestId('save-engineer-button').click();

    // Verify the change is reflected in the UI (read-only view)
    // We expect the input to disappear and the text to appear
    console.log(`[changeCellEngineer] Verifying change...`);
    await expect(input).not.toBeVisible();
    // Wait a bit for state update if needed
    await page.waitForTimeout(1000);
    // Check if the text is visible
    const textVisible = await page.getByText(newEngineerName, { exact: false }).isVisible();
    if (!textVisible) {
        console.log('Text not visible, checking HTML...');
        const html = await page.getByTestId('cell-detail-root').innerHTML();
        console.log('Cell Detail HTML:', html);
    }
    await expect(page.getByText(newEngineerName, { exact: false })).toBeVisible({ timeout: 10000 });
    console.log(`[changeCellEngineer] Change verified.`);
}
