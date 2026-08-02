<script>
	// @ts-nocheck
	import { campaignActions, godfatherOffer, spendLevels } from '$lib/game/engine.js';
	import NigeriaMap from './NigeriaMap.svelte';

	let {
		run,
		electionPreview,
		selectedState = $bindable(),
		spendLevel = $bindable('medium'),
		onAct,
		onEndWeek
	} = $props();

	const actionEntries = $derived(Object.entries(campaignActions).filter(([id]) => id !== 'rest'));
	const currentOffer = $derived(run.phase === 'campaign' ? godfatherOffer(run) : 0);
	const multiplier = $derived(spendLevels[spendLevel].multiplier);

	function naira(value) {
		const abs = Math.abs(value);
		const text =
			abs >= 1_000_000_000
				? `₦${(abs / 1_000_000_000).toFixed(1)}bn`
				: `₦${Math.round(abs / 1_000_000)}m`;
		return value < 0 ? `+${text}` : text;
	}

	function actionCost(id, action) {
		return id === 'godfather_deal' ? -currentOffer : Math.round(action.nairaCost * multiplier);
	}

	const card = 'border-4 border-black bg-white shadow-[6px_6px_0_0_#000]';
	const btn =
		'border-2 border-black font-black uppercase tracking-wide shadow-[4px_4px_0_0_#000] transition active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-40 disabled:shadow-none';
</script>

<NigeriaMap title="Nigeria — tap a state to campaign there" bind:selectedState {electionPreview} />

<section class="{card} p-5">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<h2 class="text-2xl font-black uppercase">This week's moves</h2>
		<div class="flex border-2 border-black">
			{#each Object.entries(spendLevels) as [id, level] (id)}
				<button
					class={[
						'px-3 py-1.5 text-xs font-black uppercase',
						spendLevel === id ? 'bg-black text-white' : 'bg-white'
					]}
					onclick={() => (spendLevel = id)}
				>
					{level.label}
				</button>
			{/each}
		</div>
	</div>
	<p class="mt-1 text-sm font-medium">
		Spend size scales both the cost and the effect. Money moves: donations come in weekly, and the
		godfather's offer changes every week.
	</p>

	<div class="mt-5 grid gap-4 lg:grid-cols-2">
		{#each actionEntries as [id, action] (id)}
			{@const cost = actionCost(id, action)}
			{@const blocked = run.ap < action.apCost || (cost > 0 && run.naira < cost)}
			<button
				class={[
					'border-4 border-black p-4 text-left shadow-[5px_5px_0_0_#000] transition active:translate-x-1 active:translate-y-1 active:shadow-none',
					action.tone === 'dirty' ? 'bg-rose-300' : 'bg-lime-300',
					blocked && 'opacity-40 shadow-none'
				]}
				disabled={blocked}
				onclick={() => onAct(id)}
			>
				<span class="font-black uppercase">{action.label}</span>
				<span class="mt-1 block text-sm font-medium">{action.blurb}</span>
				<span class="mt-2 block text-sm font-black">
					{action.apCost} AP · {naira(cost)}{id === 'godfather_deal' ? ' this week' : ''}
				</span>
			</button>
		{/each}
	</div>

	<button class="{btn} mt-5 bg-white px-4 py-2" onclick={onEndWeek}>Rest / end week</button>
</section>
