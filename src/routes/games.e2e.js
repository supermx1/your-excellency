// Release check: the two other games still open and render without errors after Timeline changes.
import { expect, test } from '@playwright/test';

for (const path of ['/campaign', '/city']) {
	test(`${path} opens without errors`, async ({ page }) => {
		/** @type {string[]} */
		const errors = [];
		page.on('pageerror', (e) => errors.push(e.message));
		await page.goto(path);
		await expect(page.locator('h1').first()).toBeVisible();
		await expect(page.getByRole('button').first()).toBeVisible();
		expect(errors).toEqual([]);
	});
}
