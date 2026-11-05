<script>
	// @ts-nocheck
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import RegisterGate from '$lib/components/RegisterGate.svelte';
	import SwitchMenu from '$lib/components/sim/SwitchMenu.svelte';
	import { PRESETS, defaultSwitches } from '$lib/game/sim/switches.js';
	import { decodeInputs, encodeInputs, validateInputs } from '$lib/game/sim/inputs.js';

	const card = 'border-4 border-black bg-white shadow-[6px_6px_0_0_#000]';
	const btn =
		'border-2 border-black font-black uppercase tracking-wide shadow-[4px_4px_0_0_#000] transition active:translate-x-1 active:translate-y-1 active:shadow-none';

	let chosen = $state('neverColonized');
	let switches = $state({ ...defaultSwitches(), ...PRESETS.neverColonized.switches });
	let startYear = $state(PRESETS.neverColonized.startYear);
	let toFuture = $state(false);
	let registered = $state(false);
	let showRegister = $state(false);
	let error = $state('');

	onMount(() => {
		registered = localStorage.getItem('your-excellency-registered') === '1';
		// "Change switches" from the ending comes back with the previous run's inputs.
		const back = decodeInputs(page.url.searchParams.get('s'));
		if (back.ok) {
			chosen = 'custom';
			switches = back.inputs.switches;
			startYear = back.inputs.startYear;
			toFuture = back.inputs.endYear > 2025;
		}
	});

	function choose(id) {
		chosen = id;
		const preset = PRESETS[id];
		switches = { ...defaultSwitches(), ...(preset?.switches ?? {}) };
		startYear = preset?.startYear ?? 1850;
	}

	function run() {
		if (!registered) {
			showRegister = true;
			return;
		}
		const seed = crypto.getRandomValues(new Uint32Array(1))[0];
		const checked = validateInputs({ seed, switches: $state.snapshot(switches), startYear: Number(startYear), endYear: toFuture ? 2100 : 2025 });
		if (!checked.ok) {
			error = checked.error;
			return;
		}
		goto(`/sim/play?s=${encodeInputs(checked.inputs)}`);
	}
</script>

<svelte:head>
	<title>The Timeline · Your Excellency</title>
	<meta name="description" content="Flip history's switches and watch a different Nigeria unfold." />
</svelte:head>

<main class="min-h-screen bg-amber-100 pb-16 text-black">
	<section class="border-b-4 border-black bg-amber-300">
		<div class="mx-auto max-w-7xl px-4 py-8 md:px-8">
			<a href="/" class="text-sm font-black uppercase underline">← All games</a>
			<h1 class="mt-3 text-4xl font-black uppercase md:text-6xl">The Timeline</h1>
			<p class="mt-2 max-w-2xl border-l-4 border-black pl-3 text-lg font-medium">
				Pick a what-if, flip the switches, and watch a different Nigeria unfold from the year you choose. Everything you don't
				switch stays real.
			</p>
		</div>
	</section>

	<div class="mx-auto max-w-7xl space-y-8 px-4 pt-8 md:px-8">
		<div class="grid gap-4 md:grid-cols-3">
			{#each [...Object.entries(PRESETS), ['blank', { label: 'Start from scratch', description: 'Every switch as in history. Change what you like.' }]] as [id, p] (id)}
				<button
					type="button"
					class="{card} p-5 text-left transition hover:-translate-y-1 {chosen === id ? 'bg-yellow-200' : ''}"
					aria-pressed={chosen === id}
					onclick={() => choose(id)}
				>
					<h2 class="text-2xl font-black uppercase">{p.label}</h2>
					<p class="mt-1 font-medium">{p.description}</p>
				</button>
			{/each}
		</div>

		<div class="{card} flex flex-wrap items-end gap-6 p-5">
			<label class="font-bold">
				Start year
				<input type="number" min="1850" max="2025" class="mt-1 block w-32 border-2 border-black px-2 py-1" bind:value={startYear} />
			</label>
			<label class="flex items-center gap-2 font-bold">
				<input type="checkbox" class="size-5 border-2 border-black" bind:checked={toFuture} />
				Continue to 2100
			</label>
			<button type="button" class="{btn} ml-auto bg-emerald-400 px-6 py-3 text-lg" onclick={run}>Run history →</button>
			{#if error}<p class="w-full font-bold text-red-700" role="alert">{error}</p>{/if}
		</div>

		<SwitchMenu bind:switches />
	</div>
</main>

<RegisterGate
	bind:open={showRegister}
	onRegistered={() => {
		registered = true;
		run();
	}}
/>
