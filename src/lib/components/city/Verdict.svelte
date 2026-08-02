<script>
	// @ts-nocheck
	let { run, onReset } = $props();

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

	const card = 'border-4 border-black bg-white shadow-[6px_6px_0_0_#000]';
	const btn =
		'border-2 border-black font-black uppercase tracking-wide shadow-[4px_4px_0_0_#000] transition active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-40 disabled:shadow-none';
</script>

<section class="{card} p-5">
	<p
		class="inline-block border-2 border-black bg-yellow-300 px-2 py-0.5 text-sm font-black uppercase"
	>
		Final verdict
	</p>
	<h2 class="mt-2 text-4xl font-black uppercase">{run.ending.title}</h2>
	<p class="mt-2 text-xl font-bold">Score: {run.ending.score}</p>
	<p class="mt-3 font-medium">{run.ending.summary}</p>

	<p
		class="mt-3 inline-block border-2 border-black px-2 py-0.5 text-sm font-black uppercase {run
			.ending.returned
			? run.ending.rigged
				? 'bg-purple-400'
				: 'bg-emerald-400'
			: 'bg-rose-400'}"
	>
		{#if run.ending.rigged}
			Seat retained — by arrangement
		{:else if run.ending.returned}
			Re-elected on the record
		{:else}
			Voted out
		{/if}
	</p>

	<div
		class="mt-5 grid grid-cols-2 gap-x-6 gap-y-2 border-4 border-black bg-amber-50 p-4 text-sm font-bold sm:grid-cols-3"
	>
		<span>Constituency: <span class="font-black">{run.constituencyName}</span></span>
		<span>Chairman: <span class="font-black">{run.playerName}</span></span>
		<span>Terms served: <span class="font-black">{run.turn - 1} quarters</span></span>
		<span>Population: <span class="font-black">{run.population.toLocaleString()}</span></span>
		<span>Satisfaction: <span class="font-black">{run.satisfaction}</span></span>
		<span>Delivery: <span class="font-black">{run.ending.delivery}%</span></span>
		<span>Integrity: <span class="font-black">{run.ending.integrity}</span></span>
		<span>Diverted: <span class="font-black text-red-600">{naira(run.embezzledTotal)}</span></span>
		<span
			>Kept: <span class="font-black text-red-600">{naira(run.ending.personalFunds ?? 0)}</span
			></span
		>
	</div>

	<button class="{btn} mt-5 bg-emerald-400 px-4 py-3" onclick={onReset}>Start another run</button>
</section>
