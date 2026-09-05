<script>
	// @ts-nocheck
	import {
		buyElectionInsurance,
		buyHandout,
		createCityRun,
		embezzle,
		endTurn,
		loadCityRun,
		placeBuilding,
		saveCityRun
	} from '$lib/game/city/engine.js';
	import CityMap from '$lib/components/city/CityMap.svelte';
	import Palette from '$lib/components/city/Palette.svelte';
	import RegisterGate from '$lib/components/RegisterGate.svelte';
	import TurnBar from '$lib/components/city/TurnBar.svelte';
	import Verdict from '$lib/components/city/Verdict.svelte';
	import { onMount } from 'svelte';
	import favicon from '$lib/assets/favicon.png';

	let constituencyName = $state('');
	let playerName = $state('');
	let customSeed = $state('');
	let registered = $state(false);
	let showRegister = $state(false);
	let error = $state('');
	let run = $state(null);
	let selectedBuildingId = $state(null);
	let isTheaterMode = $state(false);
	let paletteCollapsed = $state(false);

	onMount(() => {
		registered = localStorage.getItem('your-excellency-registered') === '1';
		const saved = loadCityRun();
		if (saved) run = saved;
	});

	function rerollSeed() {
		customSeed = `ward-${Math.floor(Math.random() * 900000 + 100000)}`;
	}

	function startRun() {
		if (!registered) {
			showRegister = true;
			return;
		}
		beginRun();
	}

	function beginRun() {
		const seed = customSeed ? customSeed : undefined;
		const result = createCityRun({ playerName, constituencyName, seed });
		if (!result.ok) {
			error = result.error;
			return;
		}
		error = '';
		run = result.run;
		persist();
	}

	function onRegistered() {
		registered = true;
		beginRun();
	}

	function place(buildingId, x, y) {
		applyResult(placeBuilding(run, buildingId, x, y));
	}

	function doEmbezzle(amount) {
		applyResult(embezzle(run, amount));
	}

	function doHandout() {
		applyResult(buyHandout(run));
	}

	function doElectionInsurance() {
		applyResult(buyElectionInsurance(run));
	}

	function doEndTurn() {
		applyResult(endTurn(run));
	}

	function applyResult(result) {
		if (!result.ok) {
			error = result.error;
			return;
		}
		error = '';
		run = result.run;
		persist();
	}

	function persist() {
		if (run) saveCityRun(run);
	}

	function resetRun() {
		localStorage.removeItem('your-excellency-city-current');
		run = null;
		error = '';
		selectedBuildingId = null;
		rerollSeed();
	}

	function confirmNewWard() {
		if (
			confirm(
				'Start a brand new term with a new procedurally generated ward map? Your current term progress will be discarded.'
			)
		) {
			resetRun();
		}
	}

	const card = 'border-4 border-black bg-white shadow-[6px_6px_0_0_#000]';
	const btn =
		'border-2 border-black font-black uppercase tracking-wide shadow-[4px_4px_0_0_#000] transition active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-40 disabled:shadow-none';
	const field = 'border-2 border-black bg-white px-3 py-2 font-medium focus:ring-0';
</script>

<svelte:head>
	<title>The Constituency — Your Excellency</title>
	<meta
		name="description"
		content="A 3D Nigerian city-building strategy satire. Develop a fictional constituency over one four-year term — or quietly help yourself to the budget."
	/>
</svelte:head>

<main class="min-h-screen bg-amber-100 text-black">
	<!-- Top Header Band -->
	<section class="border-b-4 border-black bg-emerald-400">
		<div class="mx-auto {isTheaterMode ? 'max-w-[98vw] px-3' : 'max-w-7xl px-4'} py-6 md:px-8">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<p
					class="inline-flex -rotate-1 items-center gap-2 border-2 border-black bg-yellow-300 px-2 py-1 text-sm font-black uppercase shadow-[3px_3px_0_0_#000]"
				>
					<img src={favicon} alt="" class="w-10" />
					Your Excellency
				</p>

				<div class="flex flex-wrap items-center gap-2">
					{#if run && run.phase === 'playing'}
						<button
							class="{btn} bg-amber-200 px-3 py-1.5 text-xs flex items-center gap-1"
							onclick={confirmNewWard}
							title="Generate a brand new procedural ward"
						>
							🎲 New Ward Map
						</button>
						<button
							class="{btn} {isTheaterMode ? 'bg-yellow-300' : 'bg-white'} px-3 py-1.5 text-xs"
							onclick={() => (isTheaterMode = !isTheaterMode)}
							title="Toggle Full Playable Window"
						>
							⛶ {isTheaterMode ? 'Exit Theater' : 'Maximize Window'}
						</button>
					{/if}
					<a class="{btn} bg-white px-3 py-1.5 text-xs" href="/">← All games</a>
				</div>
			</div>

			{#if !isTheaterMode || !run}
				<div class="mt-4 flex flex-wrap items-baseline justify-between gap-3">
					<div>
						<h1 class="text-3xl font-black uppercase leading-tight md:text-5xl">
							The Constituency
						</h1>
						<p class="mt-2 max-w-2xl border-l-4 border-black pl-3 text-base font-medium">
							A 3D strategy simulation of Nigerian local governance. Sixteen quarters to build what
							the people need — or quietly fill your offshore purse. The EFCC is always watching.
						</p>
					</div>
					<span
						class="rounded border-2 border-black bg-yellow-300 px-2.5 py-1 text-xs font-black uppercase shadow-[2px_2px_0_0_#000]"
					>
						3D Strategy Mode
					</span>
				</div>
			{/if}
		</div>
	</section>

	<!-- Main Playable Stage -->
	<div
		class="mx-auto {isTheaterMode
			? 'max-w-[98vw] px-2'
			: 'max-w-7xl px-4'} space-y-5 py-5 pb-24 md:px-8"
	>
		{#if error}
			<div class="border-4 border-black bg-rose-400 p-4 font-black shadow-[6px_6px_0_0_#000]">
				{error}
			</div>
		{/if}

		{#if !run}
			<section class="{card} p-6">
				<div class="flex flex-wrap items-center justify-between gap-2 border-b-2 border-black pb-3">
					<h2 class="text-2xl font-black uppercase">Found a Constituency</h2>
					<span
						class="rounded border border-black bg-emerald-300 px-2.5 py-1 text-xs font-black uppercase"
					>
						Procedural 3D Terrain
					</span>
				</div>

				<div class="mt-5 grid gap-4 md:grid-cols-2">
					<label class="grid gap-2">
						<span class="text-sm font-black uppercase">Constituency name</span>
						<input class={field} bind:value={constituencyName} placeholder="Amuwo East" />
					</label>
					<label class="grid gap-2">
						<span class="text-sm font-black uppercase">Chairman name</span>
						<input class={field} bind:value={playerName} placeholder="The Chairman" />
					</label>
				</div>

				<!-- Seed and Procedural Map Customization -->
				<div class="mt-5 rounded border-2 border-black bg-amber-50 p-4">
					<div class="flex flex-wrap items-center justify-between gap-3">
						<div>
							<p class="text-xs font-black uppercase text-zinc-600">Procedural World Generation</p>
							<p class="text-sm font-medium text-zinc-800">
								Each term generates a fresh, unique 3D ward with rivers, farmland, town centers, and
								slums.
							</p>
						</div>
						<div class="flex items-center gap-2">
							<input
								class="{field} w-36 text-xs font-mono"
								bind:value={customSeed}
								placeholder="Random seed..."
							/>
							<button class="{btn} bg-white px-3 py-1.5 text-xs" onclick={rerollSeed} type="button">
								🎲 Reroll Seed
							</button>
						</div>
					</div>
				</div>

				<button class="{btn} mt-6 bg-emerald-400 px-6 py-3 text-sm" onclick={startRun}>
					Take office & Enter 3D World →
				</button>
			</section>
		{:else if run.phase === 'complete'}
			<Verdict {run} onReset={resetRun} />
		{:else}
			<!-- Turn and Budget Status Bar -->
			<TurnBar
				{run}
				onEndTurn={doEndTurn}
				onEmbezzle={doEmbezzle}
				onHandout={doHandout}
				onElectionInsurance={doElectionInsurance}
			/>

			<!-- 3D Strategy Viewport & Building Palette -->
			<div
				class="grid gap-5 {paletteCollapsed
					? 'grid-cols-[1fr_56px]'
					: 'grid-cols-1 lg:grid-cols-[1fr_320px]'} items-start transition-all"
			>
				<CityMap {run} bind:selectedBuildingId onPlace={place} bind:isTheaterMode />
				<Palette {run} bind:selectedBuildingId bind:collapsed={paletteCollapsed} />
			</div>
		{/if}

		{#if run}
			<section class="{card} p-5">
				<div class="flex items-center justify-between border-b-2 border-black pb-2">
					<h2 class="text-xl font-black uppercase">Run log</h2>
					<span class="text-xs font-bold text-zinc-500">Seed: {run.seed}</span>
				</div>
				<ol
					class="mt-3 max-h-48 list-decimal space-y-1 overflow-y-auto pl-5 pr-2 text-sm font-medium"
				>
					{#each run.history as item, index (index)}
						<li>{item}</li>
					{/each}
				</ol>
			</section>
		{/if}
	</div>

	<RegisterGate bind:open={showRegister} {onRegistered} />
</main>
