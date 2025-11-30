import { Page, expect } from '@playwright/test';

export async function loadDemoScenario(page: Page) {
    await page.getByTestId('nav-data-loader').click();
    await page.getByTestId('demo-loader').click(); // Ensure tab is active if needed, or just look for the section

    // Select scenario if needed (default might be fine)
    // await page.getByTestId('demo-scenario-select').selectOption('STLA_SAMPLE');

    await page.getByTestId('demo-load-button').click();

    // Wait for success indicator
    await expect(page.getByTestId('data-loaded-indicator')).toHaveText(/complete/i, { timeout: 10000 });
}

export async function ingestLocalFixture(page: Page, simulationPath: string, equipmentPath: string) {
    await page.getByTestId('nav-data-loader').click();
    await page.getByTestId('tab-local-files').click();

    // Unhide inputs for Playwright
    await page.evaluate(() => {
        const simInput = document.querySelector('[data-testid="local-simulation-input"]') as HTMLElement;
        if (simInput) simInput.style.display = 'block';
        const eqInput = document.querySelector('[data-testid="local-equipment-input"]') as HTMLElement;
        if (eqInput) eqInput.style.display = 'block';
    });

    await page.getByTestId('local-simulation-input').setInputFiles(simulationPath);
    await page.getByTestId('local-simulation-input').dispatchEvent('change');

    await page.getByTestId('local-equipment-input').setInputFiles(equipmentPath);
    await page.getByTestId('local-equipment-input').dispatchEvent('change');

    const ingestBtn = page.getByTestId('local-ingest-button');
    await expect(ingestBtn).toBeEnabled({ timeout: 5000 });
    await ingestBtn.click();

    // Wait for success
    await expect(page.getByTestId('data-loaded-indicator')).toHaveText(/complete/i, { timeout: 10000 });
}
