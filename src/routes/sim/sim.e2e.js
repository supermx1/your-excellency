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
	Buffer.from(
		JSON.stringify({
			seed: 7,
			switches: { britishConquest: false, amalgamation: false },
			startYear: 1850,
			endYear: 2025
		})
	).toString('base64url');

test('live view advances the year', async ({ page }) => {
	await page.goto(`/sim/play?s=${never()}`);
	const year = page.getByTestId('year');
	await expect(year).toBeVisible({ timeout: 15000 });
	await expect(async () => expect(Number(await year.textContent())).toBeGreaterThan(1851)).toPass({
		timeout: 10000
	});
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
	const s = Buffer.from(
		JSON.stringify({ seed: 3, switches: {}, startYear: 2015, endYear: 2025 })
	).toString('base64url');
	await page.goto(`/sim/play?s=${s}`);
	await expect(page.getByTestId('year')).toBeVisible({ timeout: 15000 });
	await page.getByRole('button', { name: '×4' }).click();
	await expect(page.getByRole('heading', { name: /Their Nigeria in 2025/ })).toBeVisible({
		timeout: 60000
	});
	await expect(page.getByRole('button', { name: 'Run again' })).toBeVisible();
	await expect(page.getByRole('row', { name: /Religious mix/ })).toBeVisible();
});

test.describe('on a phone', () => {
	test.use({ viewport: { width: 375, height: 812 } });

	test('the live view fits without sideways scrolling', async ({ page }) => {
		await page.goto(`/sim/play?s=${never()}`);
		await expect(page.getByTestId('year')).toBeVisible({ timeout: 15000 });
		await expect(page.locator('canvas').first()).toBeVisible();
		expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
			375
		);
	});
});

test('scrubbing through a key year while paused does not leave the split screen stuck', async ({
	page
}) => {
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
	const s = Buffer.from(
		JSON.stringify({ seed: 5, switches: {}, startYear: 2020, endYear: 2025 })
	).toString('base64url');
	await page.goto(`/sim/play?s=${s}`);
	await page.getByRole('button', { name: '×4' }).click();
	await page.getByRole('button', { name: /Share/ }).click({ timeout: 60000 });
	await expect(page.getByText('Link copied')).toBeVisible();
	expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(
		/\/sim\/run\/[0-9a-zA-Z]{10}$/
	);
});

test('a saved run replays the same history from its link', async ({ page, context }) => {
	await context.grantPermissions(['clipboard-read', 'clipboard-write']);
	const s = Buffer.from(
		JSON.stringify({ seed: 11, switches: {}, startYear: 2018, endYear: 2025 })
	).toString('base64url');
	await page.goto(`/sim/play?s=${s}`);
	await page.getByRole('button', { name: '×4' }).click();
	// .first(): the ending table, not the run-spread table below it.
	const popRow = page.getByRole('row', { name: /Population/ }).first();
	await expect(popRow).toBeVisible({ timeout: 60000 });
	const before = (await popRow.textContent()) ?? '';
	await page.getByRole('button', { name: /Share/ }).click();
	await expect(page.getByText('Link copied')).toBeVisible();
	await page.goto(await page.evaluate(() => navigator.clipboard.readText()));
	await page.getByRole('button', { name: '×4' }).click();
	await expect(page.getByRole('row', { name: /Population/ }).first()).toHaveText(before, {
		timeout: 60000
	});
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

test.describe('globe opening and closing', () => {
	test('a run opens on the globe with a Skip intro button, then the year counter starts', async ({
		page
	}) => {
		await page.goto(`/sim/play?s=${never()}`);
		const skip = page.getByRole('button', { name: 'Skip intro' });
		await expect(skip).toBeVisible({ timeout: 15000 });
		await expect(page.getByTestId('view')).toHaveAttribute('data-camera', 'globe');
		await expect(skip).toBeHidden({ timeout: 8000 });
		await expect(async () =>
			expect(Number(await page.getByTestId('year').textContent())).toBeGreaterThan(1850)
		).toPass({ timeout: 5000 });
	});

	test('Skip intro jumps straight to the start year on the diorama', async ({ page }) => {
		await page.goto(`/sim/play?s=${never()}`);
		await page.getByRole('button', { name: 'Skip intro' }).click({ timeout: 15000 });
		await page.keyboard.press('Space');
		const view = page.getByTestId('view');
		await expect(view).toHaveAttribute('data-camera', 'diorama');
		await expect(view).toHaveAttribute('data-dip', '0');
		await expect(page.getByTestId('year')).toHaveText('1850');
		await expect(page.getByRole('button', { name: 'Skip intro' })).toBeHidden();
	});

	test('a 2015–2025 run plays the outro before the ending table', async ({ page }) => {
		const s = Buffer.from(
			JSON.stringify({ seed: 3, switches: {}, startYear: 2015, endYear: 2025 })
		).toString('base64url');
		await page.goto(`/sim/play?s=${s}`);
		await page.getByRole('button', { name: 'Skip intro' }).click({ timeout: 15000 });
		await page.getByRole('button', { name: '×4' }).click();
		await expect(page.getByTestId('year')).toHaveText('2025', { timeout: 60000 });
		await expect(page.getByTestId('view')).toHaveAttribute('data-camera', 'globe', {
			timeout: 15000
		});
		await expect(page.getByRole('heading', { name: /Their Nigeria in 2025/ })).toHaveCount(0);
		await expect(page.getByRole('heading', { name: /Their Nigeria in 2025/ })).toBeVisible({
			timeout: 10000
		});
	});
});

test('ending explains local conditions and reports the chosen year across seeds', async ({
	page
}) => {
	await page.route('**/api/sim/narrate', (r) => r.abort());
	/** @type {string[]} */
	const errors = [];
	page.on('pageerror', (error) => errors.push(error.message));
	const s = Buffer.from(
		JSON.stringify({
			seed: 42,
			switches: { freeSchoolingFromYear: 2018 },
			startYear: 2018,
			endYear: 2021
		})
	).toString('base64url');
	await page.goto(`/sim/play?s=${s}`);
	await page.getByRole('button', { name: 'Skip intro' }).click({ timeout: 15000 });
	await page.getByRole('button', { name: '×4' }).click();
	await expect(page.getByRole('heading', { name: 'Their Nigeria in 2021' })).toBeVisible({
		timeout: 60000
	});
	await expect(page.getByText(/all ending in 2021/)).toBeVisible({ timeout: 15000 });
	await page.getByText('What shaped this world?', { exact: true }).click();
	await page.getByLabel('Inspect a region').selectOption('kano');
	await expect(page.getByRole('heading', { name: 'Income factors in 2021' })).toBeVisible();
	await expect(page.getByText('Usable electricity', { exact: false })).toBeVisible();
	expect(errors).toEqual([]);
});

test('historical data page makes the 1850 proxy and state footprints explicit', async ({
	page
}) => {
	await page.goto('/sim/sources');
	await expect(page.getByRole('heading', { name: 'The historical starting world' })).toBeVisible();
	await page
		.getByText('Inspect reconstructed populations in 1850 and 1900', { exact: true })
		.click();
	await expect(page.locator('details[open] tbody tr')).toHaveCount(37);
	await expect(page.getByRole('columnheader', { name: '1850 (1861 pattern)' })).toBeVisible();
});

test.describe('map controls', () => {
	/** @param {import("@playwright/test").Page} page */
	const start = async (page) => {
		await page.goto(`/sim/play?s=${never()}`);
		await page.getByRole('button', { name: 'Skip intro' }).click({ timeout: 15000 });
		await page.getByRole('button', { name: 'Pause' }).click();
		return page.getByRole('application');
	};

	test('clicking a state shows who rules it then and what it is today', async ({ page }) => {
		const map = await start(page);
		const box = /** @type {{ x: number, y: number, width: number, height: number }} */ (await map.boundingBox());
		await map.click({ position: { x: box.width * 0.5, y: box.height * 0.3 } });
		const card = page.getByRole('region', { name: /^About / });
		await expect(card).toBeVisible();
		await expect(card).toContainText(/today/);
		await card.getByRole('button', { name: 'Close' }).click();
		await expect(card).toHaveCount(0);
	});

	test('dragging the map takes over the camera until Reset view', async ({ page }) => {
		const map = await start(page);
		const box = /** @type {{ x: number, y: number, width: number, height: number }} */ (await map.boundingBox());
		await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
		await page.mouse.down();
		await page.mouse.move(box.x + box.width / 2 - 120, box.y + box.height / 2 - 40, { steps: 5 });
		await page.mouse.up();
		await expect(page.getByRole('button', { name: 'Follow events' })).toHaveAttribute('aria-pressed', 'false');
		await page.getByRole('button', { name: 'Reset view' }).click();
		await expect(page.getByRole('button', { name: 'Reset view' })).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Follow events' })).toHaveAttribute('aria-pressed', 'true');
	});
});

test.describe('read aloud', () => {
	test('Listen reads the chapter with the site’s own voice', async ({ page }) => {
		/** @type {string[]} */
		const external = [];
		page.on('request', (r) => /huggingface|ampixa/.test(r.url()) && external.push(r.url()));
		await page.goto(`/sim/play?s=${never()}`);
		const listen = page.getByRole('button', { name: /Listen/ });
		await listen.click({ timeout: 15000 });
		const button = page.locator('button[aria-pressed="true"][data-voice]');
		await expect(button).toHaveAttribute('data-voice', 'sano', { timeout: 30000 });
		expect(external).toEqual([]);
		await button.click();
		await expect(page.getByRole('button', { name: /Listen/ })).toBeVisible();
	});

	test('falls back to the browser voice when the voice files cannot load', async ({ page }) => {
		await page.route('**/sanotts/**', (r) => r.abort());
		await page.goto(`/sim/play?s=${never()}`);
		await page.getByRole('button', { name: /Listen/ }).click({ timeout: 15000 });
		await expect(page.locator('button[aria-pressed="true"][data-voice]')).toHaveAttribute('data-voice', 'browser', {
			timeout: 30000
		});
	});
});
