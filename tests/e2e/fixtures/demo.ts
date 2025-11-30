import { Page, expect } from '@playwright/test';

export async function gotoApp(page: Page) {
    await page.goto('/');
    await expect(page.getByTestId('app-shell')).toBeVisible();
}

export async function openDashboardInDaleMode(page: Page) {
    // Navigate to Dashboard if not there
    if (!page.url().includes('/dashboard')) {
        await page.getByTestId('nav-dashboard').click();
    }

    // Toggle Dale Mode if not active (assuming toggle has aria-checked or similar, 
    // or we check for a specific element that only appears in Dale Mode)
    // For now, let's assume the toggle is unchecked by default on fresh load.
    const toggle = page.getByTestId('dashboard-dale-toggle');
    // Check if it's already on (implementation dependent, usually aria-checked)
    const isChecked = await toggle.getAttribute('aria-checked') === 'true';
    if (!isChecked) {
        await toggle.click();
    }
}
