<script>
	// @ts-nocheck
	import { riggingActions } from '$lib/game/engine.js';
	import NigeriaMap from './NigeriaMap.svelte';

	let {
		electionPreview,
		selectedState = $bindable(),
		selectedRigging = $bindable('none'),
		onElection
	} = $props();

	const stateInfo = $derived(electionPreview?.states.find((s) => s.id === selectedState) ?? null);

	function naira(value) {
		const abs = Math.abs(value);
		const text =
			abs >= 1_000_000_000
				? `₦${(abs / 1_000_000_000).toFixed(1)}bn`
				: `₦${Math.round(abs / 1_000_000)}m`;
		return value < 0 ? `+${text}` : text;
	}

	function votes(value) {
		return value >= 1_000_000
			? `${(value / 1_000_000).toFixed(1)}m`
			: `${Math.round(value / 1000)}k`;
	}

	const card = 'border-4 border-black bg-white shadow-[6px_6px_0_0_#000]';
	const btn =
		'border-2 border-black font-black uppercase tracking-wide shadow-[4px_4px_0_0_#000] transition active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-40 disabled:shadow-none';
	const field = 'border-2 border-black bg-white px-3 py-2 font-medium focus:ring-0';
</script>

<section class="{card} p-5">
	<h2 class="text-2xl font-black uppercase">Election day</h2>
	<p class="mt-2 font-medium">
		Projection: you {votes(electionPreview.playerLegitimate)} vs opponent {votes(
			electionPreview.opponentOfficial
		)}
		— you dey lead for {electionPreview.statesCarried} of 37 states.
	</p>
	<div class="mt-5 grid gap-4 md:grid-cols-2">
		<label class="grid gap-2">
			<span class="text-sm font-black uppercase">Your final move</span>
			<select class={field} bind:value={selectedRigging}>
				{#each Object.entries(riggingActions) as [id, action] (id)}
					<option value={id}
						>{action.label}{action.nairaCost ? ` — ${naira(action.nairaCost)}` : ''}</option
					>
				{/each}
			</select>
		</label>
		<div class="text-sm font-medium">
			<p>Target state: <strong>{stateInfo?.name}</strong> (tap the map to change).</p>
			<p class="mt-1">
				Rigging is harder to detect where insecurity is high — that is the rot the game is pointing
				at, not a bonus.
			</p>
		</div>
	</div>
	<button class="{btn} mt-5 bg-black px-4 py-3 text-white" onclick={onElection}
		>Declare result</button
	>
</section>

<NigeriaMap title="Where do you make your final move?" bind:selectedState {electionPreview} />
