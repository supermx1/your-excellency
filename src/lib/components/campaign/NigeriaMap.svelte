<script>
	// @ts-nocheck
	import nigeria from '@svg-maps/nigeria';

	let { title, selectedState = $bindable(), electionPreview } = $props();

	const stateInfo = $derived(electionPreview?.states.find((s) => s.id === selectedState) ?? null);

	function votes(value) {
		return value >= 1_000_000
			? `${(value / 1_000_000).toFixed(1)}m`
			: `${Math.round(value / 1000)}k`;
	}

	function stateFill(id) {
		const s = electionPreview?.states.find((item) => item.id === id);
		if (!s) return '#e7e5e4';
		const margin = (s.playerVotes - s.opponentVotes) / Math.max(1, s.opponentVotes);
		if (margin >= 0.1) return '#a3e635';
		if (margin >= 0) return '#d9f99d';
		if (margin >= -0.1) return '#fda4af';
		return '#fb7185';
	}

	const card = 'border-4 border-black bg-white shadow-[6px_6px_0_0_#000]';
</script>

<section class="{card} p-5">
	<h2 class="text-xl font-black uppercase">{title}</h2>
	<div class="mt-4 grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
		<svg
			viewBox={nigeria.viewBox}
			class="w-full border-2 border-black bg-sky-100"
			role="group"
			aria-label="Map of Nigeria by state"
		>
			{#each nigeria.locations as loc (loc.id)}
				<path
					d={loc.path}
					fill={stateFill(loc.id)}
					stroke="#000"
					stroke-width={selectedState === loc.id ? 3 : 1}
					class="cursor-pointer hover:opacity-80"
					role="button"
					aria-label={loc.name}
					tabindex="0"
					onclick={() => (selectedState = loc.id)}
					onkeydown={(e) => e.key === 'Enter' && (selectedState = loc.id)}
				/>
			{/each}
		</svg>

		<div>
			{#if stateInfo}
				<div class="border-4 border-black bg-amber-50 p-4 shadow-[5px_5px_0_0_#000]">
					<div class="flex items-start justify-between gap-2">
						<h3 class="text-lg font-black uppercase">{stateInfo.name}</h3>
						<span class="border-2 border-black bg-white px-1.5 py-0.5 text-xs font-black uppercase">
							{stateInfo.playerVotes > stateInfo.opponentVotes ? 'Leading' : 'Trailing'}
						</span>
					</div>
					<p class="mt-2 text-xs font-bold uppercase">
						⚠ {stateInfo.threatType.replace('_', '/')} · insecurity {stateInfo.insecurityIndex}/100
					</p>
					<div class="mt-1 h-2 border-2 border-black bg-white">
						<div class="h-full bg-black" style={`width: ${stateInfo.insecurityIndex}%`}></div>
					</div>
					<p class="mt-3 text-sm font-medium">
						Turnout {Math.round(stateInfo.effectiveTurnout * 100)}% of {votes(
							stateInfo.registeredVoters
						)} voters
					</p>
					<p class="text-sm font-black">
						You {votes(stateInfo.playerVotes)} · Opp {votes(stateInfo.opponentVotes)}
					</p>
					<p class="mt-1 text-xs font-medium">
						Insecurity suppresses turnout — one reason the numbers stay low.
					</p>
				</div>
			{/if}

			<div class="mt-4 border-2 border-black bg-white p-3">
				<p class="text-xs font-black uppercase">National projection</p>
				<p class="text-sm font-bold">
					You {votes(electionPreview.playerLegitimate)} · Opp {votes(
						electionPreview.opponentOfficial
					)}
				</p>
				<p class="text-sm font-medium">Leading in {electionPreview.statesCarried} of 37 states</p>
			</div>

			<div class="mt-4 flex flex-wrap gap-2 text-xs font-black uppercase">
				<span class="border-2 border-black bg-lime-400 px-2 py-0.5">Clear lead</span>
				<span class="border-2 border-black bg-lime-200 px-2 py-0.5">Narrow lead</span>
				<span class="border-2 border-black bg-rose-300 px-2 py-0.5">Narrow trail</span>
				<span class="border-2 border-black bg-rose-400 px-2 py-0.5">Losing badly</span>
			</div>
		</div>
	</div>
</section>
