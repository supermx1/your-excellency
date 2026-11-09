<script>
	import development from '$lib/game/sim/data/development.json';
	import sources from '$lib/game/sim/data/sources.json';
	import cells from '$lib/game/sim/data/cells.json';
	import regional from '$lib/game/sim/data/regional.json';
	const historicalPop = /** @type {Record<string, Record<string, number>>} */ (regional.pop);

	const latest = development.snapshots[development.snapshots.length - 1];
	const states = Object.entries(latest.cells)
		.map(([id, observations]) => ({
			id,
			name: cells.find((c) => c.id === id)?.name ?? id,
			...observations
		}))
		.sort((a, b) => a.name.localeCompare(b.name));
	/** @param {number} value */
	const percent = (value) => `${(value * 100).toFixed(1)}%`;
</script>

<svelte:head>
	<title>Data &amp; assumptions · The Timeline</title>
	<meta
		name="description"
		content="The evidence and modelling assumptions behind The Timeline's possible histories of Nigeria."
	/>
</svelte:head>

<main class="min-h-screen bg-amber-100 px-4 py-8 text-black md:px-8">
	<div class="mx-auto max-w-4xl space-y-8">
		<a href="/sim" class="font-bold underline">← Back to The Timeline</a>
		<header class="border-b-4 border-black pb-6">
			<p class="text-sm font-black uppercase tracking-widest">The Timeline</p>
			<h1 class="mt-2 text-4xl font-black uppercase md:text-5xl">Data &amp; assumptions</h1>
			<p class="mt-4 max-w-2xl text-lg">
				Each run tells one possible story. Historical evidence sets the starting conditions; the
				simulation's rules create what happens next.
			</p>
		</header>

		<section
			aria-labelledby="measured"
			class="space-y-4 border-4 border-black bg-white p-5 shadow-[6px_6px_0_0_#000] md:p-8"
		>
			<h2 id="measured" class="text-2xl font-black">What comes from surveys</h2>
			<p>
				Nigeria's 2013 and 2018 Demographic and Health Surveys provide two observations for each of
				the 36 states and FCT:
			</p>
			<ul class="list-disc space-y-2 pl-5">
				<li>
					<b>Electricity access:</b> the share of people living in a household with electricity. This
					does not tell us how many hours the power works.
				</li>
				<li>
					<b>Primary attendance:</b> the share of primary-school-age children attending primary school.
					This does not measure adult literacy or the quality of teaching.
				</li>
			</ul>
			<p>
				A run starting in 2013–2017 uses the 2013 observations; a run starting in 2018 or later uses
				2018. These older observations are starting estimates for later years. They are never
				applied to an earlier starting year or inserted into a timeline that is already running.
			</p>
			<details class="border-t-2 border-black pt-4">
				<summary class="cursor-pointer font-bold underline"
					>See the {latest.year} state observations</summary
				>
				<div class="mt-4 overflow-x-auto">
					<table class="w-full text-left text-sm tabular-nums">
						<caption class="mb-3 text-left"
							>Nigeria DHS {latest.year}. The two columns describe different populations.</caption
						>
						<thead
							><tr class="border-b-2 border-black"
								><th scope="col" class="py-2 pr-3">State / FCT</th><th scope="col" class="py-2 pr-3"
									>People with electricity</th
								><th scope="col" class="py-2">Children attending primary school</th></tr
							></thead
						>
						<tbody>
							{#each states as state (state.id)}
								<tr class="border-b border-black/15">
									<th scope="row" class="py-2 pr-3 font-medium">{state.name}</th>
									<td class="py-2 pr-3">{percent(state.electricityAccess.value)}</td>
									<td class="py-2">{percent(state.primaryAttendance.value)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</details>
			<p class="border-t-2 border-black pt-4 text-sm">
				The DHS Program Indicator Data API, The Demographic and Health Surveys (DHS) Program. ICF.
				Originally funded by the United States Agency for International Development (USAID).
				Available from <a href="https://api.dhsprogram.com/" class="font-bold underline"
					>api.dhsprogram.com</a
				>. Accessed 6 November 2026. Nigeria surveys: National Population Commission and ICF.
			</p>
		</section>

		<section aria-labelledby="historical" class="space-y-4">
			<h2 id="historical" class="text-2xl font-black">The historical starting world</h2>
			<p>
				Regional population now comes from the HYDE reconstruction distributed by ISIMIP, aggregated
				into the game's 37 map areas using GRID3 / geoBoundaries footprints. The original grid has a
				resolution of half a degree, so it cannot identify individual settlements.
			</p>
			<p>
				The earliest available grid is 1861. An 1850 start uses that spatial pattern as a proxy,
				scaled to the national population estimate for 1850. Later starting years interpolate
				regional shares between dated anchors, with the 2006 census as the modern anchor. These are
				reconstructed estimates, not historical state censuses.
			</p>
			<p>
				The map areas are present-day reporting footprints. They do not mean today's states existed
				in 1850; the game's separate polities represent political control.
			</p>
			<details class="border-t-2 border-black pt-4">
				<summary class="cursor-pointer font-bold underline"
					>Inspect reconstructed populations in 1850 and 1900</summary
				>
				<div class="mt-4 overflow-x-auto">
					<table class="w-full text-left text-sm tabular-nums">
						<caption class="mb-3 text-left"
							>Estimated people within each present-day footprint, scaled to the national series.</caption
						>
						<thead
							><tr class="border-b-2 border-black"
								><th scope="col" class="py-2 pr-3">Map area</th><th scope="col" class="py-2 pr-3"
									>1850 (1861 pattern)</th
								><th scope="col" class="py-2">1900</th></tr
							></thead
						>
						<tbody
							>{#each states as state (state.id)}
								<tr class="border-b border-black/15"
									><th scope="row" class="py-2 pr-3 font-medium">{state.name}</th><td
										class="py-2 pr-3">{historicalPop[1850][state.id].toLocaleString()}</td
									><td class="py-2">{historicalPop[1900][state.id].toLocaleString()}</td></tr
								>
							{/each}</tbody
						>
					</table>
				</div>
			</details>
		</section>

		<section aria-labelledby="assumptions" class="space-y-4">
			<h2 id="assumptions" class="text-2xl font-black">What the model assumes</h2>
			<p>
				School attendance sets an initial estimate of formal learning capacity. New free-school
				capacity takes time to build, and grows faster where income, stability and existing skills
				can support it.
			</p>
			<p>
				Electricity connections spread with technology, infrastructure and investment capacity.
				Ordinary connected access is assumed to deliver half of ideal service; war disrupts that
				service. The 24-hour-power scenario supplies universal connections and ideal service. These
				relationships are gameplay assumptions, not measured causal effects from the surveys.
			</p>
			<p>
				Income comes from two economies. Farming and trade earn from a state's tools, schooling,
				roads, power, government and setting. A modern economy earns what the richest country in our
				world earned that year (the UK, then the US), more if the state's technology is ahead of
				ours and less if it is behind. The modern share grows steeply with schooling, roads and
				power, so it takes nearly everyone schooled, connected and powered to earn at the world's
				level. The steepness is fitted so a history run tracks Nigeria's real income; it is a model
				choice, not a measured law.
			</p>
			<p>
				Family careers depend on local conditions and available technology. Their stories are
				fictional and do not determine the national results.
			</p>
			<p>
				Religious starting shares remain hand estimates. The “200 IQ” scenario changes learning
				speed; it does not represent a scientifically established relationship between IQ and
				national development.
			</p>
			<p>
				Drought and war can increase food pressure. Infrastructure and access to markets support a
				food buffer and recovery. People can move to neighbouring areas with better income or less
				disruption; their literacy and religion move with them. These are scenario rules, not
				estimates fitted to household migration or food surveys.
			</p>
			<p>
				The ending shows income factors recorded by the simulation for each region, plus the middle
				80% of outcomes across other random seeds. This measures variation within the model, not
				uncertainty about the model's assumptions or the historical data.
			</p>
			<p>
				National comparisons combine historical observations and estimates, with interpolation
				between available years. Population after 2025 uses a UN projection. The model has been
				checked against selected historical national totals; that does not establish what an
				alternative history would have been.
			</p>
		</section>

		<section aria-labelledby="sources" class="space-y-4 border-t-4 border-black pt-6">
			<h2 id="sources" class="text-2xl font-black">Sources &amp; attribution</h2>
			<ul class="space-y-4">
				{#each sources as source, i (i)}
					<li>
						<a href={source.url} class="font-bold underline">{source.name}</a>
						<p class="mt-1 text-sm">{source.licence}</p>
					</li>
				{/each}
			</ul>
		</section>
	</div>
</main>
