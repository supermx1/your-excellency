import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
	await page.addInitScript(() => localStorage.setItem('your-excellency-registered', '1'));
});

test('hub shows The Timeline card linking to /sim', async ({ page }) => {
	await page.goto('/');
	const card = page.getByRole('link', { name: /The Timeline/ });
	await expect(card).toHaveAttribute('href', '/sim');
});

test('choosing Never colonized and Run reaches /sim/play', async ({ page }) => {
	await page.goto('/sim');
	await page.getByRole('button', { name: /Never colonized/ }).click();
	await page.getByRole('button', { name: /Run history/ }).click();
	await expect(page).toHaveURL(/\/sim\/play\?s=/);
});
