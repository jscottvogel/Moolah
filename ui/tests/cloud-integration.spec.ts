import { test, expect } from '@playwright/test';

test.describe('Cloud Integration E2E', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the dashboard (assuming local dev server)
        await page.goto('http://localhost:5173/dashboard/debug');

        // Check if we need to mock login or if we are already in the sandbox environment
        // For now, we assume the sandbox is running and the user is logged in
    });

    test('should trigger market sync and receive ACCEPTED status', async ({ page }) => {
        const syncButton = page.locator('button:has-text("Test Market Sync")');
        await expect(syncButton).toBeVisible();

        // Trigger Sync
        await syncButton.click();

        // Wait for the result to appear in the console or a toast/result area
        // In our BackendTestPage, it shows "ACCEPTED" in the status indicator
        const resultArea = page.locator('div:has-text("ACCEPTED")');
        await expect(resultArea).toBeVisible({ timeout: 15000 });
    });

    test('should trigger AI optimizer and receive SUCCESS status', async ({ page }) => {
        const aiButton = page.locator('button:has-text("Test AI Optimizer")');
        await aiButton.click();

        // AI takes longer (Bedrock + reasoning)
        const resultArea = page.locator('div:has-text("SUCCESS")');
        await expect(resultArea).toBeVisible({ timeout: 30000 });

        // Check for recommendation ID
        await expect(page.locator('text=/ID: .+/')).toBeVisible();
    });
});
