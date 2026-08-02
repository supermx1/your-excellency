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
	let registered = $state(false);
	let showRegister = $state(false);
	let error = $state('');
	let run = $state(null);
	let selectedBuildingId = $state(null);

	onMount(() => {
		registered = localStorage.getItem('your-excellency-registered') === '1';
		const saved = loadCityRun();
		if (saved) run = saved;
	});

	function startRun() {
		if (!registered) {
			showRegister = true;
			return;
		}
		beginRun();
	}

	function beginRun() {
		const result = createCityRun({ playerName, constituencyName });
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
		content="A Nigerian city-building satire. Develop a fictional constituency over one four-year term — or quietly help yourself to the budget."
	/>
</svelte:head>

<main class="min-h-screen bg-amber-100 text-black">
	<section class="border-b-4 border-black bg-emerald-400">
		<div class="mx-auto max-w-7xl px-4 py-8 md:px-8">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<p
					class="inline-flex -rotate-1 items-center gap-2 border-2 border-black bg-yellow-300 px-2 py-1 text-sm font-black uppercase shadow-[3px_3px_0_0_#000]"
				>
					<img src={favicon} alt="" class="w-10" />
					Your Excellency
				</p>
				<a class="{btn} bg-white px-3 py-1.5 text-sm" href="/">← All games</a>
			</div>
			<h1 class="mt-4 max-w-3xl text-4xl font-black uppercase leading-tight md:text-6xl">
				The Constituency
			</h1>
			<p class="mt-4 max-w-2xl border-l-4 border-black pl-3 text-lg font-medium">
				One four-year term, sixteen quarters. Build what the people need — or quietly build your own
				portfolio. Either way, the EFCC is watching.
			</p>
		</div>
	</section>

	<div class="mx-auto max-w-7xl space-y-6 px-4 py-6 pb-24 md:px-8">
		{#if error}
			<div class="border-4 border-black bg-rose-400 p-4 font-black shadow-[6px_6px_0_0_#000]">
				{error}
			</div>
		{/if}

		{#if !run}
			<section class="{card} p-5">
				<h2 class="text-2xl font-black uppercase">Found a constituency</h2>
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
				<button class="{btn} mt-5 bg-emerald-400 px-4 py-3" onclick={startRun}>
					Take office →
				</button>
			</section>
		{:else if run.phase === 'complete'}
			<Verdict {run} onReset={resetRun} />
		{:else}
			<TurnBar
				{run}
				onEndTurn={doEndTurn}
				onEmbezzle={doEmbezzle}
				onHandout={doHandout}
				onElectionInsurance={doElectionInsurance}
			/>
			<div class="grid gap-6 md:grid-cols-[1fr_320px]">
				<CityMap {run} bind:selectedBuildingId onPlace={place} />
				<Palette {run} bind:selectedBuildingId />
			</div>
		{/if}

		{#if run}
			<section class="{card} p-5">
				<h2 class="text-xl font-black uppercase">Run log</h2>
				<ol class="mt-3 list-decimal space-y-1 pl-5 text-sm font-medium">
					{#each run.history as item, index (index)}
						<li>{item}</li>
					{/each}
				</ol>
			</section>
		{/if}
	</div>

	<RegisterGate bind:open={showRegister} {onRegistered} />
</main>
