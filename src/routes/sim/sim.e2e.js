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

const never = () =>
	Buffer.from(JSON.stringify({ seed: 7, switches: { britishConquest: false, amalgamation: false }, startYear: 1850, endYear: 2025 })).toString('base64url');

test('live view advances the year', async ({ page }) => {
	await page.goto(`/sim/play?s=${never()}`);
	const year = page.getByTestId('year');
	await expect(year).toBeVisible({ timeout: 15000 });
	await expect(async () => expect(Number(await year.textContent())).toBeGreaterThan(1851)).toPass({ timeout: 10000 });
});

test('space pauses and scrubbing jumps to a year', async ({ page }) => {
	await page.goto(`/sim/play?s=${never()}`);
	await expect(page.getByTestId('year')).toBeVisible({ timeout: 15000 });
	await page.keyboard.press('Space');
	await page.getByLabel('Jump to year').fill('1960');
	await expect(page.getByTestId('year')).toHaveText('1960');
	await page.waitForTimeout(1000);
	await expect(page.getByTestId('year')).toHaveText('1960');
});

test('a damaged link shows an error with a way back', async ({ page }) => {
	await page.goto('/sim/play?s=garbage');
	await expect(page.getByRole('alert')).toContainText("couldn't load");
	await expect(page.getByRole('link', { name: /Back to setup/ })).toHaveAttribute('href', '/sim');
});

test('a short run reaches the ending table', async ({ page }) => {
	const s = Buffer.from(JSON.stringify({ seed: 3, switches: {}, startYear: 2015, endYear: 2025 })).toString('base64url');
	await page.goto(`/sim/play?s=${s}`);
	await expect(page.getByTestId('year')).toBeVisible({ timeout: 15000 });
	await page.getByRole('button', { name: '×4' }).click();
	await expect(page.getByRole('heading', { name: /Their Nigeria in 2025/ })).toBeVisible({ timeout: 60000 });
	await expect(page.getByRole('button', { name: 'Run again' })).toBeVisible();
	await expect(page.getByRole('row', { name: /Religious mix/ })).toBeVisible();
});

test.describe('on a phone', () => {
	test.use({ viewport: { width: 375, height: 812 } });

	test('the live view fits without sideways scrolling', async ({ page }) => {
		await page.goto(`/sim/play?s=${never()}`);
		await expect(page.getByTestId('year')).toBeVisible({ timeout: 15000 });
		await expect(page.locator('canvas').first()).toBeVisible();
		expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
	});
});

test('scrubbing through a key year while paused does not leave the split screen stuck', async ({ page }) => {
	await page.goto(`/sim/play?s=${never()}`);
	await expect(page.getByTestId('year')).toBeVisible({ timeout: 15000 });
	await page.keyboard.press('Space');
	const jump = page.getByLabel('Jump to year');
	await jump.fill('1914');
	await jump.fill('1915');
	await page.waitForTimeout(500);
	await expect(page.getByRole('region', { name: /Two Nigerias/ })).toHaveCount(0);
});

test('narration appears soon after playback starts', async ({ page }) => {
	await page.goto(`/sim/play?s=${never()}`);
	await expect(page.getByTestId('narration')).not.toBeEmpty({ timeout: 8000 });
});

test('narration falls back to built-in text when the AI request fails', async ({ page }) => {
	await page.route('**/api/sim/narrate', (r) => r.abort());
	await page.goto(`/sim/play?s=${never()}`);
	await expect(page.getByTestId('narration')).toContainText(/population|1850/, { timeout: 8000 });
});

test('Share on the ending copies a /sim/run/ link', async ({ page, context }) => {
	await context.grantPermissions(['clipboard-read', 'clipboard-write']);
	const s = Buffer.from(JSON.stringify({ seed: 5, switches: {}, startYear: 2020, endYear: 2025 })).toString('base64url');
	await page.goto(`/sim/play?s=${s}`);
	await page.getByRole('button', { name: '×4' }).click();
	await page.getByRole('button', { name: /Share/ }).click({ timeout: 60000 });
	await expect(page.getByText('Link copied')).toBeVisible();
	expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/\/sim\/run\/[0-9a-zA-Z]{10}$/);
});

test('a saved run replays the same history from its link', async ({ page, context }) => {
	await context.grantPermissions(['clipboard-read', 'clipboard-write']);
	const s = Buffer.from(JSON.stringify({ seed: 11, switches: {}, startYear: 2018, endYear: 2025 })).toString('base64url');
	await page.goto(`/sim/play?s=${s}`);
	await page.getByRole('button', { name: '×4' }).click();
	const popRow = page.getByRole('row', { name: /Population/ });
	await expect(popRow).toBeVisible({ timeout: 60000 });
	const before = (await popRow.textContent()) ?? "";
	await page.getByRole('button', { name: /Share/ }).click();
	await expect(page.getByText('Link copied')).toBeVisible();
	await page.goto(await page.evaluate(() => navigator.clipboard.readText()));
	await page.getByRole('button', { name: '×4' }).click();
	await expect(page.getByRole('row', { name: /Population/ })).toHaveText(before, { timeout: 60000 });
});

test('an unknown run link shows not found', async ({ page }) => {
	await page.goto('/sim/run/doesnotexs');
	await expect(page.getByText(/doesn't exist/)).toBeVisible();
});

test('the end year is typed in and carried into the run', async ({ page }) => {
	await page.goto('/sim');
	await page.getByRole('button', { name: /Start from scratch/ }).click();
	await page.getByLabel('Start year').fill('2020');
	await page.getByLabel('End year').fill('2060');
	await page.getByRole('button', { name: /Run history/ }).click();
	await expect(page).toHaveURL(/\/sim\/play\?s=/);
	const s = new URL(page.url()).searchParams.get('s') ?? '';
	expect(JSON.parse(Buffer.from(s, 'base64url').toString()).endYear).toBe(2060);
});

test('an end year before the start year is rejected', async ({ page }) => {
	await page.goto('/sim');
	await page.getByLabel('Start year').fill('1900');
	await page.getByLabel('End year').fill('1890');
	await page.getByRole('button', { name: /Run history/ }).click();
	await expect(page.getByRole('alert')).toContainText(/end year/);
});
