<script>
	// @ts-nocheck
	import { buildingCatalog } from '$lib/game/city/engine.js';
	import BuildingIcon from './BuildingIcon.svelte';

	let { run, selectedBuildingId = $bindable(null) } = $props();

	// Matches CityMap's block colours, so a palette entry reads as the same thing
	// the player sees on the board.
	const sectorColor = {
		water: '#38bdf8',
		power: '#facc15',
		health: '#fb7185',
		education: '#818cf8',
		roads: '#94a3b8',
		security: '#60a5fa',
		housing: '#fb923c',
		jobs: '#34d399',
		sanitation: '#a3e635'
	};

	const sectorLabels = {
		water: 'Water',
		power: 'Power',
		health: 'Health',
		education: 'Education',
		roads: 'Roads',
		security: 'Security',
		housing: 'Housing',
		jobs: 'Jobs',
		sanitation: 'Sanitation'
	};

	const grouped = Object.entries(buildingCatalog).reduce((acc, [id, building]) => {
		(acc[building.sector] ??= []).push([id, building]);
		return acc;
	}, {});

	function naira(value) {
		const abs = Math.abs(value);
		const text =
			abs >= 1_000_000_000
				? `₦${(abs / 1_000_000_000).toFixed(1)}bn`
				: abs >= 1_000_000
					? `₦${(abs / 1_000_000).toFixed(1)}m`
					: `₦${Math.round(abs / 1000)}k`;
		return value < 0 ? `-${text}` : text;
	}

	function select(id) {
		selectedBuildingId = selectedBuildingId === id ? null : id;
	}

	const card = 'border-4 border-black bg-white shadow-[6px_6px_0_0_#000]';
</script>

<section class="{card} p-4">
	<h2 class="text-xl font-black uppercase">Palette</h2>
	<p class="text-sm font-medium">Pick a building, then tap a tile on the map to place it.</p>

	<div class="mt-3 max-h-[520px] space-y-4 overflow-y-auto pr-1">
		{#each Object.entries(grouped) as [sector, buildings] (sector)}
			<div>
				<p class="text-xs font-black uppercase text-zinc-500">{sectorLabels[sector] ?? sector}</p>
				<div class="mt-1 grid gap-2">
					{#each buildings as [id, building] (id)}
						{@const affordable = run.budget >= building.cost}
						{@const selected = selectedBuildingId === id}
						<button
							class={[
								'border-2 border-black p-2 text-left shadow-[3px_3px_0_0_#000] transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-none',
								selected ? 'bg-yellow-300' : 'bg-white',
								!affordable && 'cursor-not-allowed opacity-40 shadow-none'
							]}
							disabled={!affordable}
							onclick={() => select(id)}
							title={building.blurb}
						>
							<span class="flex items-center gap-2">
								<span
									class="grid size-8 shrink-0 place-items-center border-2 border-black"
									style="background: {sectorColor[building.sector] ?? '#e7e5e4'};"
								>
									<BuildingIcon {id} size={20} />
								</span>
								<span class="min-w-0">
									<span class="block text-sm font-black uppercase">{building.label}</span>
									<span class="mt-0.5 block text-xs font-bold">
										{naira(building.cost)} · maint {naira(building.maintenance)}/turn
									</span>
									<span class="mt-0.5 block text-xs font-bold text-amber-700">
										{building.buildTurns} turn{building.buildTurns === 1 ? '' : 's'} to build
									</span>
								</span>
							</span>
						</button>
					{/each}
				</div>
			</div>
		{/each}
	</div>
</section>
