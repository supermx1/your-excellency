<script>
	// @ts-nocheck
	import { buildingCatalog } from '$lib/game/city/engine.js';
	import BuildingIcon from './BuildingIcon.svelte';

	let { run, selectedBuildingId = $bindable(null), collapsed = $bindable(false) } = $props();

	let activeFilter = $state('all');

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
	const btn =
		'border-2 border-black font-black uppercase text-xs tracking-wide shadow-[3px_3px_0_0_#000] transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-none';
</script>

{#if collapsed}
	<aside class="{card} flex flex-col items-center justify-between p-2">
		<button
			class="{btn} bg-yellow-300 p-2 text-center"
			onclick={() => (collapsed = false)}
			title="Expand Building Palette"
		>
			<span class="block text-base">🏗️</span>
			<span class="mt-1 block text-[10px] [writing-mode:vertical-lr]">PALETTE →</span>
		</button>
		{#if selectedBuildingId}
			<div class="mt-3 border-2 border-black bg-yellow-300 p-1 text-center shadow">
				<p class="text-[10px] font-black uppercase">Active</p>
				<p class="text-xs font-black">{buildingCatalog[selectedBuildingId].label}</p>
				<button
					class="{btn} mt-1 w-full bg-white px-1 py-0.5 text-[9px]"
					onclick={() => (selectedBuildingId = null)}
				>
					Clear
				</button>
			</div>
		{/if}
	</aside>
{:else}
	<section class="{card} flex flex-col p-4">
		<div class="flex items-center justify-between gap-2">
			<div>
				<h2 class="text-xl font-black uppercase">Palette</h2>
				<p class="text-xs font-medium text-zinc-600">Pick a building, tap a tile to place.</p>
			</div>
			<div class="flex items-center gap-1.5">
				{#if selectedBuildingId}
					<button
						class="{btn} bg-rose-200 px-2 py-1 text-[11px]"
						onclick={() => (selectedBuildingId = null)}
						title="Deselect active building"
					>
						Clear
					</button>
				{/if}
				<button
					class="{btn} bg-zinc-100 px-2 py-1 text-[11px]"
					onclick={() => (collapsed = true)}
					title="Collapse palette to widen map"
				>
					Hide ◀
				</button>
			</div>
		</div>

		<!-- Category Pills -->
		<div class="mt-3 flex flex-wrap gap-1 border-b-2 border-black pb-2 text-[11px]">
			<button
				class="rounded border border-black px-1.5 py-0.5 font-black uppercase {activeFilter ===
				'all'
					? 'bg-black text-white'
					: 'bg-zinc-100 text-zinc-800'}"
				onclick={() => (activeFilter = 'all')}
			>
				All
			</button>
			{#each Object.keys(grouped) as sector}
				<button
					class="rounded border border-black px-1.5 py-0.5 font-bold uppercase {activeFilter ===
					sector
						? 'bg-black text-white'
						: 'bg-zinc-100 text-zinc-800'}"
					onclick={() => (activeFilter = sector)}
				>
					{sectorLabels[sector]}
				</button>
			{/each}
		</div>

		<!-- Building Items List -->
		<div class="mt-3 max-h-[520px] flex-1 space-y-3 overflow-y-auto pr-1">
			{#each Object.entries(grouped) as [sector, buildings] (sector)}
				{#if activeFilter === 'all' || activeFilter === sector}
					<div>
						<p class="text-xs font-black uppercase text-zinc-500">
							{sectorLabels[sector] ?? sector}
						</p>
						<div class="mt-1 grid gap-2">
							{#each buildings as [id, building] (id)}
								{@const affordable = run.budget >= building.cost}
								{@const selected = selectedBuildingId === id}
								<button
									class={[
										'border-2 border-black p-2 text-left shadow-[3px_3px_0_0_#000] transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-none',
										selected ? 'bg-yellow-300 ring-2 ring-black' : 'bg-white',
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
				{/if}
			{/each}
		</div>
	</section>
{/if}
