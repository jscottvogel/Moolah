import { test, expect } from '@playwright/test';

test.use({ baseURL: 'http://localhost:3000' });

/**
 * E2E Smoke Tests for Moolah Portfolio
 * Ensures critical user paths are operational.
 */
test.describe('Moolah Portfolio Flow', () => {

    test('should load the landing page successfully', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveTitle(/Moolah/i);
        // Verify core value proposition is visible
        await expect(page.getByText(/Smart dividends/i)).toBeVisible();
    });

    test('should redirect unauthenticated user to login when accessing dashboard', async ({ page }) => {
        await page.goto('/dashboard/home');
        await expect(page).toHaveURL(/.*login/);
    });

    test('should display login form', async ({ page }) => {
        await page.goto('/login');
        await expect(page.getByRole('button', { name: /Sign In/i })).toBeVisible();
    });

    test('should be able to access the diagnostics page directly (unauthenticated redirect test)', async ({ page }) => {
        await page.goto('/dashboard/debug');
        // It should redirect to login if not authenticated
        await expect(page).toHaveURL(/.*login/);
    });
});
