import { test, expect } from '@playwright/test';

/**
 * E2E Smoke Tests for Moolah Portfolio
 * Ensures critical user paths are operational.
 */
test.describe('Moolah Portfolio Flow', () => {

    test('should load the landing page successfully', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveTitle(/Moolah/i);
        await expect(page.getByText('Take Control of Your Passive Income')).toBeVisible();
    });

    test('should redirect unauthenticated user to login when accessing dashboard', async ({ page }) => {
        await page.goto('/dashboard/home');
        await expect(page).toHaveURL(/.*login/);
    });

    test('should display login form', async ({ page }) => {
        await page.goto('/login');
        await expect(page.getByRole('button', { name: /Sign In/i })).toBeVisible();
    });
});
