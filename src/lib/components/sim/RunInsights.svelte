<script>
	// @ts-nocheck
	import { incomeDrivers } from '$lib/game/sim/explanations.js';
	import { defaultData } from '$lib/game/sim/data/index.js';
	import { formatStat } from '$lib/game/sim/format.js';
	import { PARAMS } from '$lib/game/sim/params.js';
	const BASE = PARAMS.baseIncome;
	let { run, summary = null } = $props();
	let selected = $state('lagos');
	const last = $derived(run.history.at(-1));
	const cell = $derived(last.cells.find((c) => c.id === selected) ?? last.cells[0]);
	const drivers = $derived(incomeDrivers(cell));
	const areas = $derived(
		last.cells
			.map((c) => ({ id: c.id, name: defaultData.cells.find((d) => d.id === c.id)?.name ?? c.id }))
			.sort((a, b) => a.name.localeCompare(b.name))
	);
	const ranges = $derived(
		summary?.endYear === last.year && summary?.outcomes
			? [
					{ label: 'Population', key: 'pop', values: summary.outcomes.population },
					{ label: 'Can read (school)', key: 'litSchool', values: summary.outcomes.literacy },
					{ label: 'Can read (any script)', key: 'litAny', values: summary.outcomes.literacyAny },
					{ label: 'Life expectancy', key: 'lifeExp', values: summary.outcomes.lifeExpectancy }
				].filter((r) => r.values)
			: []
	);
	const name = $derived(areas.find((a) => a.id === selected)?.name ?? selected);
</script>

{#if ranges.length}
	<section aria-labelledby="outcome-range-title" class="mt-8 border-t-2 border-black pt-5">
		<h2 id="outcome-range-title" class="text-xl font-black">How different could it turn out?</h2>
		<p class="mt-2 text-sm">
			The same switches, {summary.runs} other random seeds, all ending in {summary.endYear}.
		</p>
		<table class="mt-3 w-full text-left text-sm tabular-nums">
			<caption class="sr-only">Outcome variation across repeated simulations</caption>
			<thead
				><tr class="border-b-2 border-black"
					><th scope="col" class="py-2 pr-3">Outcome</th><th scope="col" class="py-2 pr-3"
						>Median</th
					><th scope="col" class="py-2">Middle 80% of runs</th></tr
				></thead
			>
			<tbody
				>{#each ranges as row (row.key)}
					<tr class="border-b border-black/20"
						><th scope="row" class="py-2 pr-3 font-medium">{row.label}</th><td class="py-2 pr-3"
							>{formatStat(row.key, row.values.median)}</td
						><td class="py-2"
							>{#if formatStat(row.key, row.values.p10) === formatStat(row.key, row.values.p90)}About the same{:else}{formatStat(
									row.key,
									row.values.p10
								)}–{formatStat(row.key, row.values.p90)}{/if}</td
						></tr
					>
				{/each}</tbody
			>
		</table>
		<p class="mt-3 text-sm">
			This range shows random variation under the same model assumptions. It is not a confidence
			interval or a forecast.
		</p>
	</section>
{/if}

<details class="mt-6 border-t-2 border-black pt-5">
	<summary class="cursor-pointer text-xl font-black underline decoration-2 underline-offset-4"
		>What shaped this world?</summary
	>
	<div class="mt-4 space-y-4">
		<label class="block font-bold" for="insight-region">Inspect a region</label>
		<select
			id="insight-region"
			bind:value={selected}
			class="max-w-full border-2 border-black bg-white px-3 py-2 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
		>
			{#each areas as area (area.id)}<option value={area.id}>{area.name}</option>{/each}
		</select>
		<p class="text-sm text-black/60">
			States here are fixed patches of land named after today's states, not countries. Who rules each
			one depends on the run.
		</p>
		{#if drivers.length}
			<h3 class="text-lg font-black">What sets income in {name} in {last.year}</h3>
			<p>
				People here earn about <b class="tabular-nums">${Math.round(cell.incomePc).toLocaleString()}</b> a
				person a year. With nothing below helping, farming alone would bring about
				${BASE.toLocaleString()} a person a year, about ${(BASE / 365).toFixed(2)} a day: extreme poverty, just
				under the World Bank's old $1.90-a-day line. These raise or lower it.
			</p>
			<ul class="divide-y divide-black/15 border-y-2 border-black">
				{#each drivers as driver (driver.key)}
					<li class="flex items-baseline justify-between gap-4 py-2.5">
						<p><b>{driver.label}.</b> {driver.description}</p>
						<span
							class="shrink-0 text-sm font-bold tabular-nums {driver.effect === 'no effect'
								? 'text-black/40'
								: driver.multiplier > 1
									? 'text-emerald-700'
									: 'text-red-700'}">{driver.effect}</span
						>
					</li>
				{/each}
			</ul>
			<p class="text-sm text-black/60">
				The effects multiply rather than add up. Oil, new technology and world events also count, and
				income moves toward its new level over a few years. All amounts are per person per year, in 2011
				dollars adjusted for what money buys locally (the Maddison Project's unit); multiply by about 1.5
				for today's US prices.
			</p>
		{:else}
			<p class="text-sm">This recording does not include detailed income factors.</p>
		{/if}
		{#if cell.netMigration != null}
			<p class="text-sm">
				<b>Moving:</b>
				{#if Math.round(cell.netMigration) === 0}About as many people moved in as left this year.
				{:else}{Math.abs(Math.round(cell.netMigration)).toLocaleString()} more people {cell.netMigration > 0
						? 'moved in than left'
						: 'left than moved in'} this year.{/if}
			</p>
		{/if}
		<a href="/sim/sources" class="inline-block font-bold underline"
			>Read the data &amp; assumptions →</a
		>
	</div>
</details>
