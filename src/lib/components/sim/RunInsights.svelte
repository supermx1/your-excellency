<script>
	// @ts-nocheck
	import { incomeDrivers } from '$lib/game/sim/explanations.js';
	import { defaultData } from '$lib/game/sim/data/index.js';
	import { formatStat } from '$lib/game/sim/format.js';
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
					{ label: 'Can read', key: 'litSchool', values: summary.outcomes.literacy },
					{ label: 'Life expectancy', key: 'lifeExp', values: summary.outcomes.lifeExpectancy }
				].filter((r) => r.values)
			: []
	);
	const percent = (n) => `${Math.round(n * 100)}%`;
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
		{#if drivers.length}
			<p class="text-sm"><b>Model income per person:</b> {cell.incomePc.toLocaleString()}.</p>
			<h3 class="font-black">Income factors in {last.year}</h3>
			<dl class="space-y-3">
				{#each drivers as driver (driver.key)}
					<div>
						<dt class="font-bold">
							{driver.label} <span class="tabular-nums">×{driver.multiplier.toFixed(2)}</span>
						</dt>
						<dd class="mt-1 text-sm">{driver.description}</dd>
					</div>
				{/each}
			</dl>
			<p class="text-sm">
				These recorded factors multiply non-oil productive capacity; they do not add together.
				Technology, world events and oil also affect income, which adjusts gradually.
			</p>
		{:else}
			<p class="text-sm">This recording does not include detailed income factors.</p>
		{/if}
		{#if cell.foodStress != null}
			<p class="text-sm">
				<b>Food pressure:</b>
				{percent(cell.foodStress)} on the model's pressure scale. This is not the percentage of people
				going hungry.
			</p>
			<p class="text-sm">
				<b>Net movement this year:</b>
				{cell.netMigration.toLocaleString()} people. Positive means arrivals; negative means departures.
			</p>
		{/if}
		<a href="/sim/sources" class="inline-block font-bold underline"
			>Read the data &amp; assumptions →</a
		>
	</div>
</details>
