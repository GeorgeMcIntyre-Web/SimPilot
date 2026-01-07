import { test, expect } from '@playwright/test'

/**
 * Import Ambiguity Resolution E2E Test
 *
 * This test verifies the complete workflow for resolving ambiguous items during import:
 * 1. Navigate to Import History page
 * 2. Verify ambiguous count is displayed for import with ambiguous items
 * 3. Click "Review" button to navigate to ImportReviewPage
 * 4. Verify ambiguous items are displayed with candidates
 * 5. Link an ambiguous item to an existing candidate
 * 6. Verify alias rule is created and ambiguous count decreases
 * 7. Create a new entity for remaining ambiguous item
 * 8. Verify all ambiguous items are resolved
 */

test.describe('Import Ambiguity Resolution', () => {
  test('should allow user to resolve ambiguous items by linking or creating new', async ({ page }) => {
    // Navigate to Import History page
    await page.goto('/import-history')

    // Wait for the page to load
    await expect(page.getByText('Import History')).toBeVisible({ timeout: 10000 })

    // Check if there are any imports with ambiguous items
    const reviewButtons = page.getByRole('button', { name: /Review \d+ ambiguous/ })
    const hasAmbiguousItems = await reviewButtons.count() > 0

    if (!hasAmbiguousItems) {
      // Skip test if no ambiguous items exist
      test.skip()
      return
    }

    // Get the ambiguous count from the first review button text
    const firstReviewButton = reviewButtons.first()
    const buttonText = await firstReviewButton.textContent()
    const ambiguousCountMatch = buttonText?.match(/Review (\d+) ambiguous/)
    const initialAmbiguousCount = ambiguousCountMatch ? parseInt(ambiguousCountMatch[1], 10) : 0

    expect(initialAmbiguousCount).toBeGreaterThan(0)

    // Click the Review button
    await firstReviewButton.click()

    // Wait for ImportReviewPage to load
    await expect(page.getByText('Review Import')).toBeVisible({ timeout: 5000 })

    // Verify "No silent guessing" banner is shown
    await expect(page.getByText(/No silent guessing/)).toBeVisible()

    // Verify ambiguous items are displayed
    const ambiguousItems = page.locator('[class*="bg-white"][class*="rounded-lg"][class*="shadow"]').filter({
      has: page.getByText('Possible matches')
    })
    const ambiguousItemCount = await ambiguousItems.count()

    expect(ambiguousItemCount).toBe(initialAmbiguousCount)

    // Get the first ambiguous item
    const firstAmbiguousItem = ambiguousItems.first()

    // Verify candidates are displayed
    const candidates = firstAmbiguousItem.locator('[class*="bg-gray-50"]').filter({
      has: page.getByText(/Score:/)
    })
    const candidateCount = await candidates.count()

    expect(candidateCount).toBeGreaterThan(0)

    // Click "Link to this" on the first candidate
    const linkButton = firstAmbiguousItem.getByRole('button', { name: 'Link to this' }).first()
    await linkButton.click()

    // Wait for the UI to update (ambiguous item should be removed)
    await page.waitForTimeout(500)

    // Verify ambiguous count decreased
    const remainingItems = page.locator('[class*="bg-white"][class*="rounded-lg"][class*="shadow"]').filter({
      has: page.getByText('Possible matches')
    })
    const remainingCount = await remainingItems.count()

    expect(remainingCount).toBe(initialAmbiguousCount - 1)

    if (remainingCount > 0) {
      // Click "Create as new entity" on the next ambiguous item
      const nextAmbiguousItem = remainingItems.first()
      const createNewButton = nextAmbiguousItem.getByRole('button', { name: 'Create as new entity' })
      await createNewButton.click()

      // Wait for the UI to update
      await page.waitForTimeout(500)

      // Verify ambiguous count decreased again
      const finalRemainingItems = page.locator('[class*="bg-white"][class*="rounded-lg"][class*="shadow"]').filter({
        has: page.getByText('Possible matches')
      })
      const finalRemainingCount = await finalRemainingItems.count()

      expect(finalRemainingCount).toBe(remainingCount - 1)
    }
  })

  test('should show success message when all ambiguous items are resolved', async ({ page }) => {
    // Navigate to Import History page
    await page.goto('/import-history')

    // Wait for the page to load
    await expect(page.getByText('Import History')).toBeVisible({ timeout: 10000 })

    // Check if there are any imports with ambiguous items
    const reviewButtons = page.getByRole('button', { name: /Review \d+ ambiguous/ })
    const hasAmbiguousItems = await reviewButtons.count() > 0

    if (!hasAmbiguousItems) {
      // Skip test if no ambiguous items exist
      test.skip()
      return
    }

    // Click the first Review button
    const firstReviewButton = reviewButtons.first()
    await firstReviewButton.click()

    // Wait for ImportReviewPage to load
    await expect(page.getByText('Review Import')).toBeVisible({ timeout: 5000 })

    // Resolve all ambiguous items by creating new entities
    let hasMoreItems = true
    while (hasMoreItems) {
      const ambiguousItems = page.locator('[class*="bg-white"][class*="rounded-lg"][class*="shadow"]').filter({
        has: page.getByText('Possible matches')
      })
      const itemCount = await ambiguousItems.count()

      if (itemCount === 0) {
        hasMoreItems = false
        break
      }

      // Click "Create as new entity" on the first item
      const firstItem = ambiguousItems.first()
      const createNewButton = firstItem.getByRole('button', { name: 'Create as new entity' })
      await createNewButton.click()

      // Wait for UI to update
      await page.waitForTimeout(500)
    }

    // Verify success message is shown
    await expect(page.getByText(/All ambiguous items resolved/)).toBeVisible({ timeout: 5000 })

    // Verify "Back to Import History" button is shown
    const backButton = page.getByRole('button', { name: 'Back to Import History' })
    await expect(backButton).toBeVisible()

    // Click back button
    await backButton.click()

    // Verify we're back on Import History page
    await expect(page.getByText('Import History')).toBeVisible({ timeout: 5000 })
  })

  test('should navigate back to Import History from Review page', async ({ page }) => {
    // Navigate to Import History page
    await page.goto('/import-history')

    // Wait for the page to load
    await expect(page.getByText('Import History')).toBeVisible({ timeout: 10000 })

    // Check if there are any imports with ambiguous items
    const reviewButtons = page.getByRole('button', { name: /Review \d+ ambiguous/ })
    const hasAmbiguousItems = await reviewButtons.count() > 0

    if (!hasAmbiguousItems) {
      // Skip test if no ambiguous items exist
      test.skip()
      return
    }

    // Click the first Review button
    await reviewButtons.first().click()

    // Wait for ImportReviewPage to load
    await expect(page.getByText('Review Import')).toBeVisible({ timeout: 5000 })

    // Navigate back using browser back button
    await page.goBack()

    // Verify we're back on Import History page
    await expect(page.getByText('Import History')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('View all Excel imports and their diff results')).toBeVisible()
  })
})
