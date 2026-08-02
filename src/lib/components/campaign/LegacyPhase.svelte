<script>
	// @ts-nocheck
	import NigeriaMap from './NigeriaMap.svelte';

	let { run, electionPreview, selectedState = $bindable(), onReset } = $props();

	function votes(value) {
		return value >= 1_000_000
			? `${(value / 1_000_000).toFixed(1)}m`
			: `${Math.round(value / 1000)}k`;
	}

	const card = 'border-4 border-black bg-white shadow-[6px_6px_0_0_#000]';
	const btn =
		'border-2 border-black font-black uppercase tracking-wide shadow-[4px_4px_0_0_#000] transition active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-40 disabled:shadow-none';
</script>

<section class="{card} p-5">
	<p
		class="inline-block border-2 border-black bg-yellow-300 px-2 py-0.5 text-sm font-black uppercase"
	>
		Final legacy
	</p>
	<h2 class="mt-2 text-4xl font-black uppercase">{run.legacy.ending}</h2>
	<p class="mt-2 text-xl font-bold">Score: {run.legacy.score}</p>
	{#if run.election}
		<p class="mt-4 font-medium">
			Official result: {votes(run.election.playerOfficial)} to {votes(
				run.election.opponentOfficial
			)}, carrying {run.election.statesCarried} of 37 states on legitimate votes.
			{run.election.detected
				? 'Evidence of manipulation followed you into court.'
				: 'No election-day detection was recorded.'}
		</p>
	{/if}
	{#if run.tribunal}
		<p class="mt-2 font-medium">Tribunal: {run.tribunal.outcome.replace('_', ' ')}.</p>
	{/if}
	<button class="{btn} mt-5 bg-emerald-400 px-4 py-3" onclick={onReset}>Start another run</button>
</section>

<NigeriaMap title="How Nigeria voted (legitimate votes)" bind:selectedState {electionPreview} />
